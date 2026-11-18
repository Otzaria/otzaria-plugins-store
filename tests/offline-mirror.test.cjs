'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { before, after, test } = require('node:test');
const { startBrowser, openStore, eventually, fail, MIRROR_KEY, PIXEL } = require('./fixture.cjs');

const sourceRoot = process.env.STORE_SOURCE_ROOT || path.resolve(__dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(sourceRoot, 'offline-mirror.js'), 'utf8'), context);
const Mirror = context.window.StoreOfflineMirror;
const plain = value => JSON.parse(JSON.stringify(value));

// catalog.json כפי ש-plugins_manager של "עדכוני אוצריא" כותב אותו.
function mirrorCatalog() {
  return {
    lastSync: '2026-11-01T10:00:00.000Z',
    home: { title: 'חנות', subtitle: '' },
    categories: [{ slug: 'reading', name: 'קריאה', description: 'ספרים', showOnHome: true, homeLimit: 1, plugins: ['m1', 'm2', 'gone'] }],
    plugins: [
      {
        id: 'm1', name: 'Mirror One', manifestId: 'mirror.one', pluginUid: 'site.uid.one', version: '2.0.0', status: 'stable',
        tags: ['לימוד'], isFeatured: true, image: 'files/m1/image.png', screenshots: ['files/m1/screenshot-0.png', '../x.png'],
        categories: ['reading'],
        versions: [
          { version: '2.0.0', status: 'stable', compatibleWith: '0.9.99', isLatest: true },
          { version: '1.5.0', status: 'stable', compatibleWith: '0.9.90' },
          { version: '1.0.0', status: 'stable', compatibleWith: '0.9.80' },
        ],
        localFiles: {
          '2.0.0': { path: 'files/m1/plugin-2.0.0.otzplugin', size: 20 },
          '1.5.0': { path: 'files/m1/plugin-1.5.0.otzplugin', size: 15 },
        },
      },
      { id: 'm2', name: 'Mirror Two', manifestId: 'mirror.two', version: '1.0.0', status: 'beta', localFile: { path: 'files/m2/plugin.otzplugin', size: 5 } },
      { id: 'm3', name: 'No File', manifestId: 'mirror.three', version: '1.0.0' },
      { id: 'm4', name: 'Escaping', version: '1.0.0', localFiles: { '1.0.0': { path: '../evil.otzplugin' } } },
      { name: 'No id', version: '1.0.0', localFile: { path: 'files/x/plugin.otzplugin' } },
    ],
  };
}

test('converts a mirror catalogue to store plugins with only installable builds', () => {
  const plugins = plain(Mirror.toStorePlugins(mirrorCatalog(), 'mirror/plugins'));
  assert.deepEqual(plugins.map(p => p.id), ['m1', 'm2']);
  const [one, two] = plugins;
  assert.equal(one.pluginUid, 'mirror.one');
  assert.equal(one.isPinned, true);
  assert.equal(one.image, 'mirror:mirror/plugins|files/m1/image.png');
  assert.deepEqual(one.screenshots, ['mirror:mirror/plugins|files/m1/screenshot-0.png']);
  assert.deepEqual(one.versions.map(v => [v.version, v.downloadUrl, v.pluginFileSize]), [
    ['2.0.0', 'mirror:mirror/plugins|files/m1/plugin-2.0.0.otzplugin', 20],
    ['1.5.0', 'mirror:mirror/plugins|files/m1/plugin-1.5.0.otzplugin', 15],
  ]);
  assert.equal(one.downloadUrl, 'mirror:mirror/plugins|files/m1/plugin-2.0.0.otzplugin');
  // manifestId (מהארכיון) קובע מול המותקנים, גם כשמזהה האתר שונה.
  assert.equal(one.pluginUid, 'mirror.one');
  assert.equal(two.pluginUid, 'mirror.two');
  assert.deepEqual(two.versions.map(v => v.downloadUrl), ['mirror:mirror/plugins|files/m2/plugin.otzplugin']);
});

test('builds the curated home from catalogue categories and featured plugins', () => {
  const catalog = mirrorCatalog();
  const home = plain(Mirror.toStoreHome(catalog, Mirror.toStorePlugins(catalog, '')));
  assert.deepEqual(home.featured, [{ id: 'm1' }]);
  assert.equal(home.totalPublicPlugins, 2);
  assert.deepEqual(home.categories, [{
    slug: 'reading', name: 'קריאה', description: 'ספרים', showOnHome: true, pluginCount: 2,
    plugins: [{ id: 'm1' }],
    members: [{ id: 'm1' }, { id: 'm2' }],
  }]);
});

test('parses catalogues with a BOM and rejects other JSON', () => {
  assert.equal(Mirror.parseCatalog('\uFEFF{"plugins":[]}').plugins.length, 0);
  assert.throws(() => Mirror.parseCatalog('[]'));
  assert.throws(() => Mirror.parseCatalog('{"plugins":{}}'));
  assert.throws(() => Mirror.parseCatalog('not json'));
});

test('keeps paths inside the chosen folder and maps the standalone export layout', () => {
  for (const ok of ['files/a/b.otzplugin', 'a\\b.png', 'catalog.json']) assert.equal(Mirror.isSafeRelative(ok), true, ok);
  for (const bad of ['', ' ', '../a', 'a/../../b', '/abs', 'C:/x', 'C:x', './a', null, 7]) assert.equal(Mirror.isSafeRelative(bad), false, String(bad));
  // מראת הלאנצ'ר: הנתיב יחסי לתיקיית הקטלוג; ייצוא החנות: יחסי ל-Data/plugins.
  assert.deepEqual(plain(Mirror.fileCandidates('mirror/plugins|files/m1/plugin.otzplugin')), ['mirror/plugins/files/m1/plugin.otzplugin', 'mirror/plugins/plugins/files/m1/plugin.otzplugin']);
  assert.deepEqual(plain(Mirror.fileCandidates('Data|m1/plugin.otzplugin')), ['Data/m1/plugin.otzplugin', 'Data/plugins/m1/plugin.otzplugin']);
  assert.deepEqual(plain(Mirror.fileCandidates('|m1/plugin.otzplugin')), ['m1/plugin.otzplugin', 'plugins/m1/plugin.otzplugin']);
  assert.equal(Mirror.join('', 'OtzariaData\\mirror/', '/catalog.json'), 'OtzariaData/mirror/catalog.json');
  assert.equal(Mirror.pathOf('mirror:a|b'), 'a|b');
  assert.equal(Mirror.pathOf('https://otzaria.org/x'), null);
});

// ── בדפדפן: החנות עצמה ──────────────────────────────────────────────
let runtime;
before(async () => { runtime = await startBrowser(); });
after(async () => { if (runtime) await runtime.close(); });

function browserTest(name, body) {
  test(name, { timeout: 30000 }, async () => {
    const stores = [];
    const open = async options => {
      const store = await openStore(runtime, options);
      stores.push(store);
      return store;
    };
    try { await body(open); } finally { for (const store of stores.reverse()) await store.close(); }
  });
}

function mirrorFiles(base) {
  const at = rel => (base ? base + '/' : '') + rel;
  return {
    [at('catalog.json')]: '\uFEFF' + JSON.stringify(mirrorCatalog()),
    [at('files/m1/image.png')]: '',
    [at('files/m1/screenshot-0.png')]: '',
    [at('files/m1/plugin-1.5.0.otzplugin')]: '',
    [at('files/m2/plugin.otzplugin')]: '',
  };
}

const offlineWithMirror = (extra = {}) => ({
  offline: true,
  storage: { [MIRROR_KEY]: { folderToken: 'dir-fixture', name: 'USB' } },
  mirrorFiles: mirrorFiles('OtzariaData/mirror/plugins'),
  ...extra,
});
const calls = (host, method) => host.calls.filter(call => call.method === method);
const card = (page, name) => page.locator('#home .card, #grid .card').filter({ hasText: name }).first();
const showAll = page => page.locator('.cat-chip[data-key="all"]').click();

browserTest('without internet the store loads from the saved mirror and installs from it', async open => {
  const store = await open(offlineWithMirror());
  await store.ready();
  const { page, host } = store;
  await page.locator('#mirror-banner:not(.hidden)').waitFor();
  assert.match(await page.locator('#mirror-banner').innerText(), /USB/);
  assert.equal(await card(page, 'No File').count(), 0);

  const one = card(page, 'Mirror One');
  const icon = one.locator('.plugin-icon img');
  await eventually(async () => assert.equal(await icon.getAttribute('data-mirror-state'), 'ready'));
  assert.equal(await icon.getAttribute('src'), PIXEL);
  // אוצריא 0.9.98.1: 2.0.0 דורש 0.9.99, ולכן מוצג הבילד התואם שבמראה.
  assert.match(await one.innerText(), /1\.5\.0/);

  await one.locator('.install-btn').click();
  await eventually(() => assert.equal(calls(host, 'plugin.requestInstall').length, 1));
  assert.deepEqual(calls(host, 'plugin.requestInstall')[0].args, {
    folderToken: 'dir-fixture',
    path: 'OtzariaData/mirror/plugins/files/m1/plugin-1.5.0.otzplugin',
  });
  host.installed = [{ pluginId: 'mirror.one', name: 'Mirror One', version: '1.5.0' }];
  await eventually(async () => assert.match(await one.locator('.open-btn').innerText(), /הותקן בהצלחה/), 8000);
  assert.equal(host.calls.some(call => call.method === 'network.fetchStream' && /install-token|install-result/.test(call.args.url)), false);
});

browserTest('offline search filters locally and opens mirror screenshots', async open => {
  const store = await open(offlineWithMirror());
  await store.ready();
  const { page, host } = store;
  const before = calls(host, 'network.fetchStream').length;
  await page.locator('#search').fill('Two');
  await eventually(async () => assert.equal(await page.locator('#grid .card').count(), 1));
  assert.match(await page.locator('#grid .card').innerText(), /Mirror Two/);
  assert.equal(calls(host, 'network.fetchStream').length, before);

  await page.locator('#search').fill('');
  await card(page, 'Mirror One').locator('.card-link').click();
  const shot = page.locator('.screenshot-thumb');
  await eventually(async () => assert.equal(await shot.getAttribute('data-mirror-state'), 'ready'));
  assert.equal(await shot.count(), 1);
});

browserTest('the offline screen lets the user choose the update folder', async open => {
  const store = await open({
    offline: true,
    mirrorFiles: mirrorFiles('mirror/plugins'),
    pickResult: { cancelled: false, folderToken: 'dir-fixture', name: 'OtzariaData', path: 'E:/OtzariaData' },
  });
  const { page, host } = store;
  await page.locator('#error:not(.hidden) .error-mirror').click();
  await page.locator('#mirror-banner:not(.hidden)').waitFor();
  await showAll(page);
  await card(page, 'Mirror Two').waitFor();
  assert.deepEqual(host.storage[MIRROR_KEY], { folderToken: 'dir-fixture', name: 'OtzariaData' });
});

browserTest('a folder without a catalogue is not saved', async open => {
  const store = await open({
    offline: true,
    pickResult: { cancelled: false, folderToken: 'dir-fixture', name: 'Downloads', path: 'C:/Downloads' },
  });
  const { page, host } = store;
  const button = page.locator('#error:not(.hidden) .error-mirror');
  await button.click();
  await eventually(async () => assert.match(await button.innerText(), /Downloads/));
  assert.equal(MIRROR_KEY in host.storage, false);
});

browserTest('a disconnected drive explains itself on the offline screen', async open => {
  const store = await open(offlineWithMirror({ folderToken: 'dir-other' }));
  await store.page.locator('#error:not(.hidden)').waitFor();
  assert.match(await store.page.locator('#error-body').innerText(), /לא נמצאה/);
  assert.equal(await store.page.locator('#mirror-banner').isVisible(), false);
});

browserTest('an Otzaria without local install support says so on the button', async open => {
  const store = await open(offlineWithMirror({ requestResult: fail('error.invalid_params', 'url required') }));
  await store.ready();
  await showAll(store.page);
  const button = card(store.page, 'Mirror Two').locator('.install-btn');
  await button.click();
  await eventually(async () => assert.match(await button.innerText(), /גרסת אוצריא חדשה יותר/));
  assert.equal(await button.isDisabled(), false);
});

browserTest('with internet the saved mirror is not used', async open => {
  const store = await open({ storage: { [MIRROR_KEY]: { folderToken: 'dir-fixture', name: 'USB' } } });
  await store.ready();
  assert.equal(await store.page.locator('#mirror-banner').isVisible(), false);
  assert.equal(store.host.calls.some(call => call.method.startsWith('fs.')), false);
});

browserTest('disconnecting the folder forgets and revokes it', async open => {
  const store = await open(offlineWithMirror());
  await store.ready();
  await store.page.locator('#mirror-banner .mirror-forget').click();
  await store.page.locator('#error:not(.hidden)').waitFor();
  assert.equal(store.host.storage[MIRROR_KEY], null);
  await eventually(() => assert.deepEqual(calls(store.host, 'fs.revokeFolder').map(c => c.args), [{ folderToken: 'dir-fixture' }]));
});

// ייצוא החנות כתוכנה עצמאית (store_app_exporter): Data/catalog.json, והנתיבים
// בקטלוג יחסיים ל-Data/plugins.
function exportFiles() {
  const catalog = mirrorCatalog();
  const strip = p => p.replace(/^files\//, '');
  for (const plugin of catalog.plugins) {
    if (plugin.image) plugin.image = strip(plugin.image);
    if (plugin.screenshots) plugin.screenshots = plugin.screenshots.map(strip);
    if (plugin.localFile) plugin.localFile.path = strip(plugin.localFile.path);
    for (const file of Object.values(plugin.localFiles || {})) file.path = strip(file.path);
  }
  return {
    'Data/catalog.json': JSON.stringify(catalog),
    'Data/plugins/m1/image.png': '',
    'Data/plugins/m1/plugin-1.5.0.otzplugin': '',
  };
}

browserTest('the standalone store export layout resolves images and installs', async open => {
  const store = await open(offlineWithMirror({ mirrorFiles: exportFiles() }));
  await store.ready();
  const { page, host } = store;
  const one = card(page, 'Mirror One');
  await eventually(async () => assert.equal(await one.locator('.plugin-icon img').getAttribute('data-mirror-state'), 'ready'));
  await one.locator('.install-btn').click();
  await eventually(() => assert.ok(calls(host, 'plugin.requestInstall').some(c => c.args.path === 'Data/plugins/m1/plugin-1.5.0.otzplugin')));
});

browserTest('a filtered site (HTTP 418) also falls back to the saved mirror', async open => {
  const store = await open(offlineWithMirror({ offline: false, blocked: true }));
  await store.ready();
  await store.page.locator('#mirror-banner:not(.hidden)').waitFor();
  await card(store.page, 'Mirror One').waitFor();
});

browserTest('home rows honour homeLimit while the category page lists every member', async open => {
  const store = await open(offlineWithMirror());
  await store.ready();
  const { page } = store;
  const row = page.locator('#home .home-row').first();
  assert.equal(await row.locator('.card').count(), 1);
  await page.locator('.cat-chip[data-key="cat:reading"]').click();
  await eventually(async () => assert.equal(await page.locator('#grid .card').count(), 2));
  assert.equal(calls(store.host, 'network.fetchStream').some(c => c.args.url.includes('/categories/')), false);
});

browserTest('a plugin without an image never reaches for the website logo offline', async open => {
  const store = await open(offlineWithMirror());
  await store.ready();
  await showAll(store.page);
  const src = await card(store.page, 'Mirror Two').locator('.plugin-icon img').getAttribute('src');
  assert.match(src, /^data:/);
});

for (const [name, result, expected] of [
  ['blocked by safer mode', { success: true, data: false }, /ההתקנה בוטלה/],
  ['the drive was disconnected', fail('error.not_found', 'folder no longer exists'), /לא נמצאה/],
  ['file access was revoked', fail('error.permission_denied', 'fs.user_files.read required'), /הרשאה/],
]) {
  browserTest(`a mirror install ${name} explains itself`, async open => {
    const store = await open(offlineWithMirror({ requestResult: result }));
    await store.ready();
    const button = card(store.page, 'Mirror One').locator('.install-btn');
    await button.click();
    await eventually(async () => assert.match(await button.innerText(), expected));
    assert.equal(await button.isDisabled(), false);
  });
}

browserTest('a filtered site with an unavailable mirror still offers the folder picker', async open => {
  const store = await open(offlineWithMirror({ offline: false, blocked: true, folderToken: 'dir-other' }));
  const { page } = store;
  await page.locator('#error:not(.hidden) .error-mirror').waitFor();
  assert.match(await page.locator('#error-body').innerText(), /לא נמצאה/);
  assert.equal(await page.locator('#error .error-retry').count(), 1);
});
