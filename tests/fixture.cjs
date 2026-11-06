'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const sourceRoot = process.env.STORE_SOURCE_ROOT || path.resolve(__dirname, '..');
const ok = data => ({ success: true, data });
const copy = value => JSON.parse(JSON.stringify(value));
const response = (data, status = 200) => ({ status, ok: status === 200, body: JSON.stringify(data), headers: {} });

function catalog() {
  return Array.from({ length: 36 }, (_, index) => ({
    id: `p${index + 1}`,
    pluginUid: `fixture.plugin${index + 1}`,
    name: `Plugin ${String(index + 1).padStart(2, '0')}`,
    shortDescription: 'book study utility',
    description: 'A fixture paragraph for the detail page.\n'.repeat(100),
    version: '1.2.0',
    status: index % 2 ? 'beta' : 'stable',
    tags: ['לימוד', index % 2 ? 'כלים' : 'קריאה'],
    downloadUrl: `/api/plugins/p${index + 1}/download`,
    publishedAt: `2026-01-${String(index % 28 + 1).padStart(2, '0')}T00:00:00Z`,
    fileUpdatedAt: `2026-02-${String(index % 28 + 1).padStart(2, '0')}T00:00:00Z`,
    platforms: ['linux'],
    author: 'Fixture author',
  }));
}

function state(overrides = {}) {
  return {
    version: 1,
    view: { type: 'home' },
    search: '',
    tag: 'all',
    hideInstalled: false,
    status: 'all',
    sort: 'recommended',
    detailId: null,
    scrollTop: 0,
    ...overrides,
  };
}

async function eventually(assertion, timeout = 5000) {
  const deadline = Date.now() + timeout;
  let lastError;
  do {
    try { return await assertion(); } catch (error) { lastError = error; }
    await new Promise(resolve => setTimeout(resolve, 20));
  } while (Date.now() < deadline);
  throw lastError;
}

async function startBrowser() {
  const server = http.createServer(async (req, res) => {
    const file = { '/': 'index.html', '/restore-state.js': 'restore-state.js', '/i18n/en.js': 'i18n/en.js' }[req.url];
    if (!file) { res.writeHead(404).end(); return; }
    try {
      const body = await fs.readFile(path.join(sourceRoot, file));
      res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8');
      res.end(body);
    } catch (error) { res.writeHead(500).end(String(error)); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
    args: ['--disable-dev-shm-usage'],
  });
  return {
    browser,
    url: `http://127.0.0.1:${server.address().port}/`,
    async close() { await browser.close(); await new Promise(resolve => server.close(resolve)); },
  };
}

async function openStore(runtime, options = {}) {
  const host = {
    catalog: catalog(),
    installed: [],
    preference: false,
    mode: 'supported',
    failClear: false,
    rejectSave: false,
    noToken: false,
    requestResult: ok(true),
    results: new Map(),
    calls: [],
    writes: [],
    unsafeActions: [],
    acceptedState: options.restore === undefined ? null : copy(options.restore),
    eligible: options.restore !== undefined && options.restore !== null,
    ...options,
  };
  const holds = [];
  host.hold = predicate => {
    let resolve;
    const gate = { predicate, seen: false, promise: new Promise(r => { resolve = r; }), release: value => resolve(value) };
    holds.push(gate);
    return gate;
  };
  if (options.prepare) options.prepare(host);

  async function handle(method, args) {
    const call = { method, args: copy(args || {}) };
    host.calls.push(call);
    if (method === 'plugin.requestInstall' || (method === 'network.fetchStream' && /install-token|install-result/.test(args.url))) {
      if (host.eligible) host.unsafeActions.push(call);
    }
    const gate = holds.find(item => !item.seen && item.predicate(method, args));
    if (gate) {
      gate.seen = true;
      const value = await gate.promise;
      if (value !== undefined) return value;
    }
    switch (method) {
      case 'app.getTheme': return ok({});
      case 'app.getLocale': return ok({ language: 'he', locale: 'he-IL', textDirection: 'rtl' });
      case 'app.getInfo': return ok({ version: '0.9.98.1', platform: 'linux' });
      case 'storage.get': return ok(host.preference);
      case 'storage.set': host.preference = args.value; return ok(true);
      case 'plugin.listInstalled': return ok(host.installed);
      case 'plugin.openOther': return ok(true);
      case 'plugin.requestInstall':
        if (host.requestThrows) throw new Error('Fixture transport lost');
        return host.requestResult;
      case 'plugin.setRestoreState': {
        const entry = { state: copy(args.state), accepted: false };
        host.writes.push(entry);
        if (host.mode === 'unsupported') return { success: false, error: { code: 'error.unknown_method' } };
        if (host.mode === 'unsupported-throw') throw new Error('error.unknown_method: Unknown action in plugin: setRestoreState');
        if (host.failClear === 'throw' && args.state === null) throw new Error('Fixture clear response lost');
        if (host.failClear && args.state === null) return { success: false, error: { code: 'error.unavailable' } };
        if (host.rejectSave && args.state !== null) {
          host.eligible = false;
          if (host.rejectSave === 'throw') throw new Error('Fixture save response lost');
          return host.rejectSave === 'false-data' ? ok(false) : { success: false, error: { code: 'error.invalid_params' } };
        }
        host.acceptedState = copy(args.state);
        host.eligible = args.state !== null;
        entry.accepted = true;
        return ok(true);
      }
      case 'network.fetchStream': {
        const url = new URL(args.url);
        const category = slug => ({
          slug, name: slug === 'reading' ? 'קריאה' : 'כלים', showOnHome: true,
          description: 'Fixture category', pluginCount: host.catalog.length,
          plugins: host.catalog.map(p => ({ id: p.id })),
        });
        if (url.pathname === '/api/plugins') return response(host.catalog);
        if (url.pathname.endsWith('/store-home')) return response({
          featured: host.catalog.slice(0, 3).map(p => ({ id: p.id })),
          categories: host.categories === undefined ? [category('reading'), category('tools')] : host.categories,
          totalPublicPlugins: host.catalog.length,
        });
        if (url.pathname.includes('/categories/')) return response(category(url.pathname.split('/').pop()));
        if (url.pathname.endsWith('/search')) {
          const query = url.searchParams.get('q').toLowerCase();
          const status = url.searchParams.get('status');
          return response({ results: host.catalog.filter(p => (!status || p.status === status) &&
            [p.name, p.shortDescription, ...p.tags].join(' ').toLowerCase().includes(query)) });
        }
        if (url.pathname.endsWith('/install-token')) {
          return host.noToken ? response({}, 503) : response({ token: url.pathname.split('/')[3] });
        }
        if (url.pathname.endsWith('/install-result')) {
          const result = host.results.get(url.searchParams.get('token')) || 'pending';
          if (result === '404') return response({}, 404);
          if (result === 'offline') throw new Error('Fixture offline');
          return response({ status: result });
        }
        throw new Error(`Unexpected fixture URL: ${args.url}`);
      }
      default: throw new Error(`Unexpected SDK method: ${method}`);
    }
  }

  const context = await runtime.browser.newContext({ viewport: { width: 1100, height: 700 } });
  // The only real HTTP requests are the three local source files. All images,
  // API calls, installations and cross-plugin actions are controlled fixtures.
  await context.route('**/*', route => {
    if (route.request().url().startsWith(runtime.url)) return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.exposeFunction('__fixtureCall', handle);
  await page.addInitScript(({ restore, localPreference }) => {
    if (localPreference !== undefined) localStorage.setItem('otzaria_store_hide_installed', localPreference ? '1' : '0');
    window.Otzaria = {
      _booted: false,
      on(event, handler) { window.addEventListener(event, event => handler(event.detail)); },
      call(method, args) {
        if (method !== 'network.fetchStream') return window.__fixtureCall(method, args);
        return (async function* () {
          const res = await window.__fixtureCall(method, args);
          yield { type: 'response', status: res.status, ok: res.ok, headers: res.headers };
          yield { type: 'data', body: res.body };
        })();
      },
    };
    window.addEventListener('DOMContentLoaded', () => {
      window.Otzaria._booted = true;
      window.dispatchEvent(new CustomEvent('plugin.boot', { detail: {
        app: { language: 'he', locale: 'he-IL', textDirection: 'rtl', platform: 'linux' },
        ...(restore === undefined ? {} : { restore: { reason: 'discarded', state: restore } }),
      } }));
      window.dispatchEvent(new CustomEvent('plugin.ready'));
    });
  }, { restore: options.restore, localPreference: options.localPreference });
  await page.goto(runtime.url);
  return {
    page, host, errors,
    async ready() {
      await page.waitForFunction(() => document.querySelector('#home:not(.hidden), #grid:not(.hidden), #detail-page:not(.hidden)'));
      await page.locator('#refresh-btn:not(.spinning)').waitFor();
      assert.deepEqual(errors, []);
    },
    async saved(predicate = () => true) {
      await eventually(() => {
        assert.ok(host.writes.some(write => write.accepted && write.state !== null));
        assert.ok(host.acceptedState && predicate(host.acceptedState), JSON.stringify(host.acceptedState));
      });
      return copy(host.acceptedState);
    },
    async close() { holds.forEach(gate => gate.release()); await context.close(); assert.deepEqual(errors, []); },
  };
}

module.exports = { startBrowser, openStore, state, eventually, response, ok };
