'use strict';

// Tests for shared/deal-nav.js
//
// deal-nav.js is a browser script with DOM dependencies. We load it in a
// vm context with a minimal DOM mock so we can verify:
//   - nav is injected only when ?deal=<id> is present
//   - tool completion dots reflect the correct done conditions
//   - active tool chip is highlighted when the pathname matches
//   - urlFor produces correct hrefs on chips

const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('node:fs');
const vm   = require('node:vm');
const path = require('node:path');

// ── Source files ───────────────────────────────────────────────────────────────

const STORE_SRC = fs.readFileSync(
  path.join(__dirname, '../shared/dealStore.js'), 'utf8'
);
const NAV_SRC = fs.readFileSync(
  path.join(__dirname, '../shared/deal-nav.js'), 'utf8'
);

// ── Fake localStorage ──────────────────────────────────────────────────────────

function makeFakeStorage(initial = {}) {
  const data = Object.assign({}, initial);
  return {
    getItem(k)    { return Object.hasOwn(data, k) ? data[k] : null; },
    setItem(k, v) { data[k] = String(v); },
    removeItem(k) { delete data[k]; },
    clear()       { for (const k of Object.keys(data)) delete data[k]; },
  };
}

// ── Minimal element factory ────────────────────────────────────────────────────

function makeEl(tag) {
  return {
    tagName: tag, id: '', innerHTML: '', textContent: '',
    style: { paddingTop: '' }, _children: [],
    appendChild(c) { this._children.push(c); },
    prepend(c)     { this._children.unshift(c); },
    querySelectorAll() { return []; },
  };
}

// ── Load both scripts into one VM context ─────────────────────────────────────
//
// Returns { store, nav } where nav is the injected #deal-nav element (or null).

function loadNav(fakeStorage, searchStr = '', pathname = '/') {
  const head = makeEl('head');
  const body = makeEl('body');

  const ctx = vm.createContext({
    localStorage: fakeStorage,
    window: { location: { search: searchStr, pathname } },
    document: {
      createElement: makeEl,
      head, body,
      readyState: 'complete', // triggers synchronous inject() on script load
      addEventListener() {},
      querySelectorAll() { return []; },
    },
    console, Date, JSON, Array, Object, String, Math, parseInt,
    URLSearchParams,
    crypto: globalThis.crypto,
    __store__: undefined,
  });

  // Load dealStore — expose it as a global so deal-nav can reference it.
  vm.runInContext(
    STORE_SRC + '\nglobalThis.dealStore = dealStore; globalThis.__store__ = dealStore;',
    ctx
  );
  // Load deal-nav — calls inject() immediately (readyState === 'complete').
  vm.runInContext(NAV_SRC, ctx);

  const nav = ctx.document.body._children.find(el => el.id === 'deal-nav') || null;
  return { store: ctx.__store__, nav };
}

// ── Helper: count occurrences of a substring in a string ──────────────────────

function countOf(str, sub) {
  return (str.match(new RegExp(sub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
}

// ── nav injection ─────────────────────────────────────────────────────────────

describe('deal-nav — nav injection', () => {
  test('nav is NOT injected when no ?deal= param in URL', () => {
    const storage = makeFakeStorage();
    const { nav } = loadNav(storage, '', '/account-brief-v2/');
    assert.equal(nav, null);
  });

  test('nav IS injected when ?deal=<id> resolves to a real deal', () => {
    const storage = makeFakeStorage();
    // Pre-seed a deal via dealStore directly
    const tempCtx = vm.createContext({
      localStorage: storage, window: { location: { search: '' } },
      console, Date, JSON, Array, Object, String, Math, parseInt,
      URLSearchParams, crypto: globalThis.crypto, __s__: undefined,
    });
    vm.runInContext(STORE_SRC + '\nglobalThis.__s__ = dealStore;', tempCtx);
    const deal = tempCtx.__s__.create('Inject Corp');

    const { nav } = loadNav(storage, `?deal=${deal.id}`, '/');
    assert.ok(nav, 'nav element should be injected');
    assert.ok(nav.innerHTML.includes('Inject Corp'), 'company name should appear in nav');
  });

  test('nav is NOT injected when deal ID in URL does not exist', () => {
    const storage = makeFakeStorage();
    const { nav } = loadNav(storage, '?deal=ghost-id', '/');
    assert.equal(nav, null);
  });
});

// ── Tool completion badges ────────────────────────────────────────────────────
//
// The done conditions from deal-nav.js TOOLS array:
//   account-brief-v2 → d.research
//   value-map        → d.value_map
//   qualify-iq       → d.qualification?.meddpicc
//   demo-brief       → d.meeting_preps?.length > 0
//   win-room         → d.win_room

describe('deal-nav — tool completion badges', () => {
  // Helper: create a deal, optionally patch fields, inject nav, count done dots.
  function setupNav(patchFn, pathname = '/') {
    const storage = makeFakeStorage();
    const tempCtx = vm.createContext({
      localStorage: storage, window: { location: { search: '' } },
      console, Date, JSON, Array, Object, String, Math, parseInt,
      URLSearchParams, crypto: globalThis.crypto, __s__: undefined,
    });
    vm.runInContext(STORE_SRC + '\nglobalThis.__s__ = dealStore;', tempCtx);
    const deal = tempCtx.__s__.create('Test Corp');
    if (patchFn) patchFn(tempCtx.__s__, deal.id);

    const { nav } = loadNav(storage, `?deal=${deal.id}`, pathname);
    return { nav, html: nav?.innerHTML || '' };
  }

  test('fresh deal — 0 done dots', () => {
    const { html } = setupNav(null);
    assert.equal(countOf(html, 'dn-dot done'), 0);
  });

  test('account-brief chip done when research is set', () => {
    const { html } = setupNav((s, id) => s.patch(id, 'research', { summary: 'x' }));
    assert.equal(countOf(html, 'dn-dot done'), 1);
  });

  test('value-map chip done when value_map is set', () => {
    const { html } = setupNav((s, id) => s.patch(id, 'value_map', { pain: 'y' }));
    assert.equal(countOf(html, 'dn-dot done'), 1);
  });

  test('qualify-iq chip done when qualification.meddpicc exists', () => {
    const { html } = setupNav((s, id) =>
      s.patch(id, 'qualification', { meddpicc: { metrics: { status: 'green' } } })
    );
    assert.equal(countOf(html, 'dn-dot done'), 1);
  });

  test('qualify-iq chip NOT done when qualification exists but meddpicc is absent', () => {
    const { html } = setupNav((s, id) =>
      s.patch(id, 'qualification', { notes: 'partial' })
    );
    assert.equal(countOf(html, 'dn-dot done'), 0);
  });

  test('demo-brief chip done when meeting_preps has at least one entry', () => {
    const { html } = setupNav((s, id) => {
      const deal = s.get(id);
      deal.meeting_preps.push({ title: 'Q2 Demo' });
      s.save(deal);
    });
    assert.equal(countOf(html, 'dn-dot done'), 1);
  });

  test('demo-brief chip NOT done when meeting_preps is empty', () => {
    const { html } = setupNav(null);
    assert.equal(countOf(html, 'dn-dot done'), 0);
  });

  test('win-room chip done when win_room is set', () => {
    const { html } = setupNav((s, id) => s.patch(id, 'win_room', { score: 80 }));
    assert.equal(countOf(html, 'dn-dot done'), 1);
  });

  test('all 5 chips done when all fields are populated', () => {
    const { html } = setupNav((s, id) => {
      s.patch(id, 'research',      { summary: 'ok' });
      s.patch(id, 'value_map',     { pain: 'ok' });
      s.patch(id, 'qualification', { meddpicc: { metrics: { status: 'green' } } });
      s.patch(id, 'win_room',      { score: 90 });
      const deal = s.get(id);
      deal.meeting_preps.push({ title: 'Demo' });
      s.save(deal);
    });
    assert.equal(countOf(html, 'dn-dot done'), 5);
  });
});

// ── Active tool detection ─────────────────────────────────────────────────────

describe('deal-nav — active tool detection', () => {
  function setupNavAt(pathname) {
    const storage = makeFakeStorage();
    const tempCtx = vm.createContext({
      localStorage: storage, window: { location: { search: '' } },
      console, Date, JSON, Array, Object, String, Math, parseInt,
      URLSearchParams, crypto: globalThis.crypto, __s__: undefined,
    });
    vm.runInContext(STORE_SRC + '\nglobalThis.__s__ = dealStore;', tempCtx);
    const deal = tempCtx.__s__.create('Active Corp');
    const { nav } = loadNav(storage, `?deal=${deal.id}`, pathname);
    return nav?.innerHTML || '';
  }

  test('no dn-active chip when pathname matches no tool', () => {
    const html = setupNavAt('/dashboard/');
    assert.equal(countOf(html, 'dn-active'), 0);
  });

  test('account-brief-v2 chip is active when pathname matches', () => {
    const html = setupNavAt('/account-brief-v2/');
    assert.equal(countOf(html, 'dn-active'), 1);
    assert.ok(html.includes('Account Brief'), 'Account Brief label should be present');
    // dn-active should appear before Value Map in the HTML (chips are in order)
    assert.ok(
      html.indexOf('dn-active') < html.indexOf('Value Map'),
      'dn-active should be on the first chip, not a later one'
    );
  });

  test('qualify-iq chip is active when pathname matches', () => {
    const html = setupNavAt('/qualify-iq/');
    assert.equal(countOf(html, 'dn-active'), 1);
    // dn-active should appear after Value Map and before Demo Brief
    assert.ok(
      html.indexOf('dn-active') > html.indexOf('Value Map') &&
      html.indexOf('dn-active') < html.indexOf('Demo Brief'),
      'dn-active should be on qualify-iq chip'
    );
  });

  test('win-room chip is active when pathname matches', () => {
    const html = setupNavAt('/win-room/');
    assert.equal(countOf(html, 'dn-active'), 1);
    // dn-active should appear after Demo Brief (last tool)
    assert.ok(
      html.indexOf('dn-active') > html.indexOf('Demo Brief'),
      'dn-active should be on win-room chip'
    );
  });
});

// ── URL resolution ────────────────────────────────────────────────────────────

describe('deal-nav — chip URLs include deal ID', () => {
  test('each chip href contains the deal ID', () => {
    const storage = makeFakeStorage();
    const tempCtx = vm.createContext({
      localStorage: storage, window: { location: { search: '' } },
      console, Date, JSON, Array, Object, String, Math, parseInt,
      URLSearchParams, crypto: globalThis.crypto, __s__: undefined,
    });
    vm.runInContext(STORE_SRC + '\nglobalThis.__s__ = dealStore;', tempCtx);
    const deal = tempCtx.__s__.create('URL Corp');

    const { html } = (() => {
      const { nav } = loadNav(storage, `?deal=${deal.id}`, '/');
      return { html: nav?.innerHTML || '' };
    })();

    assert.ok(html.includes(`?deal=${deal.id}`), 'chip hrefs should contain the deal ID');
    // All 5 tool paths should be present
    ['account-brief-v2', 'value-map', 'qualify-iq', 'demo-brief', 'win-room'].forEach(toolId => {
      assert.ok(html.includes(toolId), `href for ${toolId} should be in nav`);
    });
  });
});

// ── Stage badge ───────────────────────────────────────────────────────────────

describe('deal-nav — stage badge', () => {
  test('displays correct stage label and CSS class', () => {
    const storage = makeFakeStorage();
    const tempCtx = vm.createContext({
      localStorage: storage, window: { location: { search: '' } },
      console, Date, JSON, Array, Object, String, Math, parseInt,
      URLSearchParams, crypto: globalThis.crypto, __s__: undefined,
    });
    vm.runInContext(STORE_SRC + '\nglobalThis.__s__ = dealStore;', tempCtx);
    const deal = tempCtx.__s__.create('Stage Corp', { stage: 'proposal' });

    const { nav } = loadNav(storage, `?deal=${deal.id}`, '/');
    const html = nav?.innerHTML || '';
    assert.ok(html.includes('stage-proposal'), 'stage CSS class should be present');
    assert.ok(html.includes('Proposal'), 'stage label should be present');
  });
});
