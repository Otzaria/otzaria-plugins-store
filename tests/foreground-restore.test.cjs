'use strict';

const assert = require('node:assert/strict');
const { before, after, test } = require('node:test');
const { startBrowser, openStore, state, eventually, response, ok } = require('./fixture.cjs');

let runtime;
before(async () => { runtime = await startBrowser(); });
after(async () => { if (runtime) await runtime.close(); });

function browserTest(name, body) {
  test(name, { timeout: 20000 }, async () => {
    const stores = [];
    const open = async options => {
      const store = await openStore(runtime, options);
      stores.push(store);
      return store;
    };
    try { await body(open); } finally { for (const store of stores.reverse()) await store.close(); }
  });
}

const nonNullWrites = host => host.writes.filter(write => write.accepted && write.state !== null);
const installRequests = host => host.calls.filter(call => call.method === 'plugin.requestInstall');
const tokenRequests = host => host.calls.filter(call => call.method === 'network.fetchStream' && call.args.url.includes('/install-token'));
const installButton = (page, id) => page.locator(`#grid .install-btn[data-url$="/${id}/download"]`);

async function allPlugins(store) {
  await store.page.locator('.cat-chip[data-key="all"]').click();
  await store.saved(saved => saved.view.type === 'all' && saved.detailId === null);
}

async function scrollTo(store, value) {
  await store.page.locator('#loading').waitFor({ state: 'hidden' });
  await store.page.locator('#app-content').hover();
  await store.page.mouse.wheel(0, value);
  return store.saved(saved => saved.scrollTop >= value - 2);
}

async function tick(page, milliseconds = 2100) {
  await page.clock.fastForward(milliseconds);
}

browserTest('recreates home and category with scroll from only bounded view state', async open => {
  const first = await open();
  const home = await first.saved(saved => saved.view.type === 'home');
  const homeCopy = await open({ restore: home });
  await homeCopy.saved();
  assert.equal(await homeCopy.page.locator('#home').isVisible(), true);

  await first.page.locator('.cat-chip[data-key="cat:reading"]').click();
  await first.saved(saved => saved.view.slug === 'reading');
  const snapshot = await scrollTo(first, 600);
  assert.ok(Buffer.byteLength(JSON.stringify(snapshot)) < 8192);
  assert.deepEqual(Object.keys(snapshot).sort(), ['detailId', 'hideInstalled', 'scrollTop', 'search', 'sort', 'status', 'tag', 'version', 'view']);

  const recreated = await open({ restore: snapshot, preference: true, localPreference: true });
  await recreated.saved(saved => saved.view.slug === 'reading' && saved.scrollTop >= 598);
  assert.equal(await recreated.page.locator('.cat-chip.active').getAttribute('data-key'), 'cat:reading');
  assert.match(await recreated.page.locator('#view-title').innerText(), /קריאה/);
  assert.equal(await recreated.page.locator('#hide-installed').isChecked(), false);
  assert.ok(await recreated.page.locator('#app-content').evaluate(element => element.scrollTop) >= 598);
  assert.equal(installRequests(recreated.host).length, 0);
  assert.equal(tokenRequests(recreated.host).length, 0);
});

browserTest('recreates all-view tag, hide-installed, status, ordering and scroll', async open => {
  const first = await open({ installed: [{ pluginId: 'fixture.plugin2', name: 'Plugin 02', version: '1.2.0' }] });
  await first.saved();
  await allPlugins(first);
  await first.page.locator('.tag-btn[data-value="לימוד"]').click();
  await first.page.locator('#status-filter').selectOption('beta');
  await first.page.locator('#sort-select').selectOption('updated');
  await first.page.locator('#hide-installed-wrap').click();
  await first.saved(saved => saved.tag === 'לימוד' && saved.status === 'beta' && saved.sort === 'updated' && saved.hideInstalled);
  const snapshot = await scrollTo(first, 350);
  const firstNames = await first.page.locator('#grid .card-title-text').allTextContents();
  assert.equal(firstNames.includes('Plugin 02'), false);

  const recreated = await open({ restore: snapshot, installed: first.host.installed, preference: false });
  await recreated.saved(saved => saved.scrollTop >= 348);
  assert.equal(await recreated.page.locator('.tag-btn.active').getAttribute('data-value'), 'לימוד');
  assert.equal(await recreated.page.locator('#status-filter').inputValue(), 'beta');
  assert.equal(await recreated.page.locator('#sort-select').inputValue(), 'updated');
  assert.equal(await recreated.page.locator('#hide-installed').isChecked(), true);
  assert.deepEqual(await recreated.page.locator('#grid .card-title-text').allTextContents(), firstNames);
});

browserTest('recreates search and detail from fresh catalogue without replaying an action', async open => {
  const first = await open();
  await first.saved();
  await first.page.locator('.cat-chip[data-key="cat:reading"]').click();
  await first.page.locator('#search').fill('book');
  await first.page.locator('#grid .card-link').first().click();
  const detail = await first.saved(saved => saved.detailId !== null && saved.search === 'book');
  const snapshot = await scrollTo(first, 700);

  const recreated = await open({ restore: snapshot, prepare(host) {
    host.catalog.find(plugin => plugin.id === detail.detailId).name = 'Fresh catalogue title';
  } });
  await recreated.saved(saved => saved.detailId === detail.detailId && saved.scrollTop >= 698);
  assert.match(await recreated.page.locator('#detail-page').innerText(), /Fresh catalogue title/);
  assert.equal(await recreated.page.locator('#grid').isVisible(), false);
  assert.equal(tokenRequests(recreated.host).length, 0);
  assert.equal(installRequests(recreated.host).length, 0);
  await recreated.page.locator('#back-btn').click();
  await recreated.saved(saved => saved.detailId === null && saved.search === 'book');
  assert.equal(await recreated.page.locator('#search').inputValue(), 'book');
  assert.equal(recreated.host.acceptedState.view.slug, 'reading');
  assert.equal(await recreated.page.locator('#grid .card').count(), 36);
});

browserTest('restores before initial saves and does not let late preferences or locale replace it', async open => {
  let localeGate, preferenceGate;
  const restored = state({ view: { type: 'all' }, search: 'book', hideInstalled: false, sort: 'newest' });
  const store = await open({ restore: restored, preference: true, prepare(host) {
    localeGate = host.hold(method => method === 'app.getLocale');
    preferenceGate = host.hold(method => method === 'storage.get');
  } });
  await eventually(() => assert.ok(localeGate.seen));
  await store.page.evaluate(() => window.dispatchEvent(new CustomEvent('settings.changed', {
    detail: { key: 'key-settings-language', newValue: 'en' },
  })));
  localeGate.release();
  await eventually(() => assert.ok(preferenceGate.seen));
  assert.equal(store.host.writes.length, 0);
  assert.equal(await store.page.locator('#search').inputValue(), 'book');
  preferenceGate.release();
  await store.saved(saved => saved.search === 'book' && saved.sort === 'newest');
  assert.equal(await store.page.locator('html').getAttribute('lang'), 'en');
  assert.equal(await store.page.locator('#hide-installed').isChecked(), false);
  assert.ok(nonNullWrites(store.host).every(write => write.state.search === 'book' && !write.state.hideInstalled));
});

browserTest('opening detail while a search debounce is pending keeps the selected page', async open => {
  const store = await open();
  await store.saved();
  await allPlugins(store);
  await store.page.clock.install();
  await store.page.locator('#search').fill('book');
  await store.page.locator('#grid .card-link').first().click();
  await store.saved(saved => saved.detailId !== null && saved.search === 'book');
  await tick(store.page, 400);
  assert.equal(await store.page.locator('#detail-page').isVisible(), true);
  assert.equal(await store.page.locator('#grid').isVisible(), false);
  assert.equal(store.host.acceptedState.detailId, 'p1');
});

browserTest('ordinary boot uses persistent preference while a user edit wins a late response', async open => {
  const ordinary = await open({ preference: true, localPreference: false });
  await ordinary.saved(saved => saved.hideInstalled);
  assert.equal(await ordinary.page.locator('#hide-installed').isChecked(), true);

  let gate;
  const edited = await open({ preference: true, prepare(host) { gate = host.hold(method => method === 'storage.get'); } });
  await eventually(() => assert.ok(gate.seen));
  await edited.page.locator('#hide-installed-wrap').click();
  await edited.page.locator('#hide-installed-wrap').click();
  gate.release(ok(true));
  await edited.saved(saved => !saved.hideInstalled);
});

browserTest('late category failure and search results cannot replace newer UI or detail', async open => {
  const store = await open();
  await store.saved();
  const categoryGate = store.host.hold((method, args) => method === 'network.fetchStream' && args.url.includes('/categories/'));
  await store.page.locator('.cat-chip[data-key="cat:reading"]').click();
  await eventually(() => assert.ok(categoryGate.seen));
  await allPlugins(store);
  await store.page.locator('#grid .card-link').first().click();
  await store.saved(saved => saved.detailId !== null);
  categoryGate.release(response({}, 503));
  await store.page.waitForTimeout(100);
  assert.equal(await store.page.locator('#detail-page').isVisible(), true);
  assert.equal(await store.page.locator('#empty').isVisible(), false);
  await store.page.locator('#back-btn').click();
  const searchGate = store.host.hold((method, args) => method === 'network.fetchStream' && args.url.includes('/search?q=old'));
  await store.page.locator('#search').fill('old');
  await eventually(() => assert.ok(searchGate.seen));
  await store.page.locator('#search').fill('Plugin 03');
  await eventually(async () => assert.deepEqual(await store.page.locator('#grid .card-title-text').allTextContents(), ['Plugin 03']));
  searchGate.release(response({ results: [store.host.catalog[0]] }));
  await store.page.waitForTimeout(100);
  assert.deepEqual(await store.page.locator('#grid .card-title-text').allTextContents(), ['Plugin 03']);
  await store.saved(saved => saved.search === 'Plugin 03');
});

browserTest('language and catalogue reload preserve selected detail and scroll', async open => {
  const store = await open({ restore: state({ view: { type: 'all' }, detailId: 'p3', scrollTop: 600 }) });
  await store.saved(saved => saved.scrollTop >= 598);
  await store.page.evaluate(() => window.dispatchEvent(new CustomEvent('settings.changed', {
    detail: { key: 'key-settings-language', newValue: 'en' },
  })));
  await store.saved(saved => saved.detailId === 'p3' && saved.scrollTop >= 598);
  await store.page.locator('#refresh-btn').click();
  await store.page.locator('#refresh-btn:not(.spinning)').waitFor();
  assert.equal(await store.page.locator('#detail-page').isVisible(), true);
  assert.match(await store.page.locator('#detail-page').innerText(), /Plugin 03/);
  assert.ok(await store.page.locator('#app-content').evaluate(element => element.scrollTop) >= 598);
});

browserTest('older catalogue completion cannot overwrite a newer reload or intervening user search', async open => {
  const store = await open();
  await store.saved();
  await allPlugins(store);
  const oldCatalog = JSON.parse(JSON.stringify(store.host.catalog));
  const oldResponse = store.host.hold((method, args) => method === 'network.fetchStream' && new URL(args.url).pathname === '/api/plugins');
  await store.page.locator('#refresh-btn').click();
  await eventually(() => assert.ok(oldResponse.seen));
  await store.page.locator('#search').fill('Plugin 03');
  store.host.catalog[2].name = 'Current Plugin 03';
  // Exercise the actual reload function twice to force response reordering;
  // the ordinary refresh button itself already suppresses duplicate clicks.
  await store.page.evaluate(() => { void reload(); });
  await eventually(async () => assert.deepEqual(await store.page.locator('#grid .card-title-text').allTextContents(), ['Current Plugin 03']));
  oldResponse.release(response(oldCatalog));
  await store.page.waitForTimeout(100);
  assert.deepEqual(await store.page.locator('#grid .card-title-text').allTextContents(), ['Current Plugin 03']);
  await store.saved(saved => saved.search === 'Plugin 03');
});

browserTest('malformed, oversized and future state safely fall back to ordinary boot', async open => {
  const invalid = [
    null, [], state({ version: 99 }), state({ view: { type: 'install', url: 'untrusted' } }),
    state({ search: 'x'.repeat(513) }), state({ extra: 'x'.repeat(8192) }),
    state({ hideInstalled: 'false' }), state({ scrollTop: -1 }), state({ scrollTop: 10000001 }),
    state({ detailId: { id: 'p1' } }), state({ status: 'anything' }),
  ];
  for (const restore of invalid) {
    const store = await open({ restore, preference: true });
    const snapshot = await store.saved(saved => saved.hideInstalled);
    assert.equal(snapshot.version, 1);
    assert.equal(snapshot.view.type, 'home');
    assert.equal(snapshot.search, '');
    assert.equal(snapshot.detailId, null);
    assert.ok(Buffer.byteLength(JSON.stringify(snapshot)) < 8192);
    assert.equal(installRequests(store.host).length, 0);
    await store.close();
  }
});

browserTest('removed category, tag and detail fall back after the fresh compatible catalogue arrives', async open => {
  const store = await open({ restore: state({ view: { type: 'category', slug: 'deleted' }, tag: 'removed', detailId: 'gone', scrollTop: 600 }) });
  const snapshot = await store.saved();
  assert.deepEqual(snapshot.view, { type: 'all' });
  assert.equal(snapshot.tag, 'all');
  assert.equal(snapshot.detailId, null);
  assert.equal(snapshot.scrollTop, 0);
  assert.equal(await store.page.locator('#grid').isVisible(), true);
  assert.equal(installRequests(store.host).length, 0);
});

for (const mode of ['unsupported', 'unsupported-throw']) {
  browserTest(`old host (${mode}) remains functional and exempt`, async open => {
    const store = await open({ mode, results: new Map([['p1', 'failure']]) });
    await store.ready();
    await store.page.locator('.cat-chip[data-key="all"]').click();
    await store.page.clock.install();
    await installButton(store.page, 'p1').click();
    await eventually(() => assert.equal(installRequests(store.host).length, 1));
    await tick(store.page);
    await eventually(async () => assert.equal(await installButton(store.page, 'p1').isEnabled(), true));
    assert.equal(nonNullWrites(store.host).length, 0);
    assert.equal(store.host.eligible, false);
    assert.deepEqual(store.host.unsafeActions, []);
  });
}

for (const rejectSave of [true, 'false-data', 'throw']) {
  browserTest(`rejected save (${rejectSave}) is not accepted and still requires a successful guard`, async open => {
    const store = await open({ rejectSave, results: new Map([['p1', 'failure']]) });
    await store.ready();
    await eventually(() => assert.ok(store.host.writes.length));
    assert.equal(nonNullWrites(store.host).length, 0);
    assert.equal(store.host.acceptedState, null);
    await store.page.locator('.cat-chip[data-key="all"]').click();
    await store.page.clock.install();
    await installButton(store.page, 'p1').click();
    await eventually(() => assert.equal(installRequests(store.host).length, 1));
    assert.ok(store.host.writes.some(write => write.state === null && write.accepted));
    store.host.rejectSave = false;
    await tick(store.page);
    await store.saved();
    assert.deepEqual(store.host.unsafeActions, []);
  });
}

for (const failClear of [true, 'throw']) {
browserTest(`failed clear (${failClear}) blocks token creation and install, then permits an acknowledged retry`, async open => {
  const store = await open({ results: new Map([['p1', 'failure']]) });
  await store.saved();
  await allPlugins(store);
  store.host.failClear = failClear;
  await installButton(store.page, 'p1').click();
  await eventually(async () => assert.match(await installButton(store.page, 'p1').innerText(), /לא ניתן להתחיל/));
  assert.equal(tokenRequests(store.host).length, 0);
  assert.equal(installRequests(store.host).length, 0);
  store.host.failClear = false;
  await store.page.clock.install();
  await installButton(store.page, 'p1').click();
  await eventually(() => assert.equal(installRequests(store.host).length, 1));
  await tick(store.page);
  await store.saved();
  assert.deepEqual(store.host.unsafeActions, []);
});
}

browserTest('an opaque boot snapshot still requires an acknowledged clear when the API rejects it', async open => {
  const store = await open({ mode: 'unsupported', restore: state({ version: 99 }) });
  await store.ready();
  await store.page.locator('.cat-chip[data-key="all"]').click();
  await installButton(store.page, 'p1').click();
  await eventually(async () => assert.match(await installButton(store.page, 'p1').innerText(), /לא ניתן להתחיל/));
  assert.equal(tokenRequests(store.host).length, 0);
  assert.equal(installRequests(store.host).length, 0);
});

browserTest('queued save and clear serialize before token creation, including an unacknowledged clear', async open => {
  const store = await open({ results: new Map([['p1', 'failure']]) });
  await store.saved();
  await allPlugins(store);
  const saveGate = store.host.hold((method, args) => method === 'plugin.setRestoreState' && args.state !== null);
  await store.page.locator('#sort-select').selectOption('newest');
  await eventually(() => assert.ok(saveGate.seen));
  await store.page.locator('#sort-select').selectOption('updated');
  const clearGate = store.host.hold((method, args) => method === 'plugin.setRestoreState' && args.state === null);
  await installButton(store.page, 'p1').click();
  assert.equal(tokenRequests(store.host).length, 0);
  saveGate.release();
  await eventually(() => assert.ok(clearGate.seen));
  assert.equal(tokenRequests(store.host).length, 0);
  assert.equal(installRequests(store.host).length, 0);
  await store.page.clock.install();
  clearGate.release();
  await eventually(() => assert.equal(installRequests(store.host).length, 1));
  const baseline = nonNullWrites(store.host).length;
  await store.page.locator('#sort-select').selectOption('recommended');
  assert.equal(nonNullWrites(store.host).length, baseline);
  assert.equal(store.host.acceptedState, null);
  await tick(store.page);
  await store.saved(saved => saved.sort === 'recommended');
  assert.deepEqual(store.host.unsafeActions, []);
});

browserTest('overlapping installs hold exemption through token, request, polling gaps and final completion', async open => {
  const store = await open();
  await store.saved();
  await allPlugins(store);
  const tokenGate = store.host.hold((method, args) => method === 'network.fetchStream' && args.url.includes('/p1/install-token'));
  const requestGate = store.host.hold((method, args) => method === 'plugin.requestInstall' && args.url.endsWith('/p2/download'));
  await store.page.clock.install();
  await installButton(store.page, 'p1').click();
  await eventually(() => assert.ok(tokenGate.seen));
  assert.equal(store.host.acceptedState, null);
  await installButton(store.page, 'p2').click();
  await eventually(() => assert.ok(requestGate.seen));
  const baseline = nonNullWrites(store.host).length;
  await store.page.locator('#sort-select').selectOption('newest');
  await tick(store.page, 500);
  assert.equal(nonNullWrites(store.host).length, baseline);
  tokenGate.release();
  requestGate.release();
  await eventually(() => assert.equal(installRequests(store.host).length, 2));
  await tick(store.page);
  await eventually(() => assert.ok(store.host.calls.filter(call => call.method === 'network.fetchStream' && call.args.url.includes('install-result')).length >= 2));
  assert.equal(store.host.eligible, false);
  store.host.results.set('p1', 'success');
  await tick(store.page);
  await eventually(() => assert.ok(store.host.calls.filter(call => call.method === 'plugin.listInstalled').length >= 2));
  assert.equal(nonNullWrites(store.host).length, baseline);
  assert.equal(store.host.eligible, false);
  store.host.results.set('p2', 'failure');
  await tick(store.page);
  await store.saved(saved => saved.sort === 'newest');
  assert.equal(store.host.eligible, true);
  assert.deepEqual(store.host.unsafeActions, []);
});

browserTest('update-all keeps one continuous guard across the whole batch', async open => {
  const store = await open({
    installed: [1, 2].map(id => ({ pluginId: `fixture.plugin${id}`, name: `Plugin 0${id}`, version: '1.0.0' })),
    results: new Map([['p1', 'success'], ['p2', 'failure']]),
  });
  await store.saved();
  await store.page.locator('#updates-backdrop').waitFor({ state: 'visible' });
  await store.page.clock.install();
  await store.page.locator('#update-all-btn').click();
  await eventually(() => assert.equal(installRequests(store.host).length, 1));
  const baseline = nonNullWrites(store.host).length;
  await tick(store.page);
  await eventually(() => assert.equal(installRequests(store.host).length, 2));
  assert.equal(nonNullWrites(store.host).length, baseline);
  assert.equal(store.host.eligible, false);
  await tick(store.page);
  await store.saved();
  assert.equal(await store.page.locator('#update-all-btn').isEnabled(), true);
  assert.equal(store.host.writes.filter(write => write.state === null && write.accepted).length, 1);
  assert.deepEqual(store.host.unsafeActions, []);
});

browserTest('explicit cancellation and reported failure release the guard for subsequent actions', async open => {
  const store = await open({ requestResult: { success: false, error: { code: 'error.cancelled' } } });
  await store.saved();
  await allPlugins(store);
  await installButton(store.page, 'p1').click();
  await eventually(() => assert.equal(installRequests(store.host).length, 1));
  await store.saved();
  assert.equal(await installButton(store.page, 'p1').isEnabled(), true);
  store.host.requestResult = ok(true);
  store.host.results.set('p1', 'failure');
  await store.page.clock.install();
  await installButton(store.page, 'p1').click();
  await eventually(() => assert.equal(installRequests(store.host).length, 2));
  await tick(store.page);
  await store.saved();
  assert.equal(store.host.eligible, true);
  assert.deepEqual(store.host.unsafeActions, []);
});

for (const reason of ['no-token', 'missing-report', 'timeout', 'transport']) {
  browserTest(`unconfirmed installation (${reason}) keeps the document exempt without replay or a dirty dialog`, async open => {
    const store = await open({ noToken: reason === 'no-token', requestThrows: reason === 'transport' });
    if (reason === 'missing-report') store.host.results.set('p1', '404');
    await store.saved();
    await allPlugins(store);
    await store.page.clock.install();
    await installButton(store.page, 'p1').click();
    await eventually(() => assert.equal(installRequests(store.host).length, 1));
    if (reason === 'missing-report') await tick(store.page);
    if (reason === 'timeout') await tick(store.page, 121000);
    await eventually(async () => assert.match(await installButton(store.page, 'p1').innerText(), /נשלח|שגיאה/));
    const baseline = nonNullWrites(store.host).length;
    await store.page.locator('#sort-select').selectOption('newest');
    await tick(store.page, 1000);
    assert.equal(nonNullWrites(store.host).length, baseline);
    assert.equal(store.host.acceptedState, null);
    assert.equal(store.host.eligible, false);
    assert.equal(store.host.calls.some(call => /unsaved|confirm|dialog/i.test(call.method)), false);
    assert.deepEqual(store.host.unsafeActions, []);
  });
}

browserTest('transient polling error retains protection and a later terminal result releases it', async open => {
  const store = await open({ results: new Map([['p1', 'offline']]) });
  await store.saved();
  await allPlugins(store);
  await store.page.clock.install();
  await installButton(store.page, 'p1').click();
  await eventually(() => assert.equal(installRequests(store.host).length, 1));
  await tick(store.page);
  assert.equal(store.host.eligible, false);
  store.host.results.set('p1', 'success');
  await tick(store.page);
  await store.saved();
  assert.deepEqual(store.host.unsafeActions, []);
});

browserTest('oversized live input clears rather than saving a truncated search', async open => {
  const store = await open();
  await store.saved();
  await store.page.locator('#search').fill('x'.repeat(513));
  await eventually(() => assert.ok(store.host.writes.some(write => write.state === null && write.accepted)));
  assert.equal(store.host.eligible, false);
  await store.page.locator('#search').fill('book');
  await store.saved(saved => saved.search === 'book');
});
