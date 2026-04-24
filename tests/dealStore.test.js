'use strict';

const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('node:fs');
const vm   = require('node:vm');
const path = require('node:path');

// ── Fake localStorage ──────────────────────────────────────────────────────────

function makeFakeStorage(initial = {}) {
  let data = Object.assign({}, initial);
  let throwOnSet = false;
  return {
    _setThrowOnSet(v) { throwOnSet = v; },
    _raw()        { return data; },
    getItem(k)    { return Object.hasOwn(data, k) ? data[k] : null; },
    setItem(k, v) {
      if (throwOnSet) {
        const e = new Error('QuotaExceededError');
        e.name = 'QuotaExceededError';
        throw e;
      }
      data[k] = String(v);
    },
    removeItem(k) { delete data[k]; },
    clear()       { data = {}; },
  };
}

// ── Load dealStore into a fresh VM context ─────────────────────────────────────

const STORE_SRC = fs.readFileSync(
  path.join(__dirname, '../shared/dealStore.js'), 'utf8'
);

function loadStore(fakeStorage, searchStr = '') {
  const ctx = vm.createContext({
    localStorage: fakeStorage,
    window: { location: { search: searchStr } },
    console,
    Date, JSON, Array, Object, String, Math, parseInt,
    URLSearchParams,
    crypto: globalThis.crypto,
    __result__: undefined,
  });
  // `const dealStore` is block-scoped to the script; assign via globalThis to capture it.
  vm.runInContext(STORE_SRC + '\nglobalThis.__result__ = dealStore;', ctx);
  return ctx.__result__;
}

// Normalize VM-context objects to plain JS via JSON round-trip so deepStrictEqual works.
function norm(v) { return JSON.parse(JSON.stringify(v)); }

// ── create() ──────────────────────────────────────────────────────────────────

describe('dealStore — create()', () => {
  let storage, store;
  beforeEach(() => { storage = makeFakeStorage(); store = loadStore(storage); });

  test('returns deal with all required fields', () => {
    const deal = norm(store.create('Acme Corp'));
    assert.ok(deal.id,           'should have id');
    assert.ok(deal.created_at,   'should have created_at');
    assert.ok(deal.updated_at,   'should have updated_at');
    assert.equal(deal.context.account_name, 'Acme Corp');
    assert.equal(deal.context.stage, 'discovery');
    assert.equal(deal.context.close_date, null);
    assert.equal(deal.context.deal_value, null);
    assert.deepEqual(deal.context.products, []);
    assert.deepEqual(deal.stakeholders, []);
    assert.equal(deal.research, null);
    assert.equal(deal.qualification, null);
    assert.deepEqual(deal.meeting_preps, []);
    assert.equal(deal.value_map, null);
    assert.deepEqual(deal.documents, []);
  });

  test('accepts stage / close_date / deal_value / products opts', () => {
    const deal = store.create('Beta Inc', {
      stage: 'proposal',
      close_date: '2026-06-30',
      deal_value: 50000,
      products: ['CLM', 'CPQ'],
    });
    assert.equal(deal.context.stage, 'proposal');
    assert.equal(deal.context.close_date, '2026-06-30');
    assert.equal(deal.context.deal_value, 50000);
    assert.deepEqual(deal.context.products, ['CLM', 'CPQ']);
  });

  test('persists to storage — get() retrieves the same object', () => {
    const deal = store.create('Gamma LLC');
    const fetched = store.get(deal.id);
    assert.equal(fetched.id, deal.id);
    assert.equal(fetched.context.account_name, deal.context.account_name);
    assert.equal(fetched.context.stage, deal.context.stage);
  });

  test('multiple creates produce unique IDs', () => {
    const ids = new Set(Array.from({ length: 20 }, () => store.create('X').id));
    assert.equal(ids.size, 20);
  });

  test('list() returns all deals, newest-updated first', () => {
    const a = store.create('A');
    const b = store.create('B');
    // Force a known-older timestamp on A so sort is deterministic
    const raw = JSON.parse(storage._raw().znith_deals);
    raw[a.id].updated_at = '2020-01-01T00:00:00.000Z';
    storage.setItem('znith_deals', JSON.stringify(raw));

    const list = store.list();
    assert.equal(list.length, 2);
    assert.equal(list[0].id, b.id, 'most-recently updated deal should be first');
    assert.equal(list[1].id, a.id);
  });
});

// ── patch() ───────────────────────────────────────────────────────────────────

describe('dealStore — patch()', () => {
  let storage, store;
  beforeEach(() => { storage = makeFakeStorage(); store = loadStore(storage); });

  test('updates a top-level field', () => {
    const deal = store.create('Top Co');
    store.patch(deal.id, 'value_map', { summary: 'test' });
    assert.deepEqual(store.get(deal.id).value_map, { summary: 'test' });
  });

  test('updates a nested field via dot-notation', () => {
    const deal = store.create('Nested Co');
    store.patch(deal.id, 'context.stage', 'proposal');
    assert.equal(store.get(deal.id).context.stage, 'proposal');
  });

  test('creates intermediate objects for deep paths', () => {
    const deal = store.create('Deep Co');
    store.patch(deal.id, 'research.company_profile.revenue', '50M');
    assert.equal(store.get(deal.id).research.company_profile.revenue, '50M');
  });

  test('does not clobber sibling fields', () => {
    const deal = store.create('Safe Co');
    store.patch(deal.id, 'context.stage', 'demo');
    store.patch(deal.id, 'context.deal_value', 100000);
    const updated = store.get(deal.id);
    assert.equal(updated.context.stage, 'demo');
    assert.equal(updated.context.deal_value, 100000);
    assert.equal(updated.context.account_name, 'Safe Co');
  });

  test('returns null for unknown deal ID', () => {
    assert.equal(store.patch('nonexistent-id', 'context.stage', 'demo'), null);
  });

  test('updates updated_at timestamp', async () => {
    const deal = store.create('Time Co');
    const before = deal.updated_at;
    await new Promise(r => setTimeout(r, 5));
    store.patch(deal.id, 'context.stage', 'proposal');
    assert.ok(store.get(deal.id).updated_at >= before);
  });

  test('back-to-back patches on different deals do not clobber each other', () => {
    const a = store.create('Alpha');
    const b = store.create('Beta');
    store.patch(a.id, 'context.stage', 'demo');
    store.patch(b.id, 'context.stage', 'proposal');
    store.patch(a.id, 'value_map', { test: true });

    assert.equal(store.get(a.id).context.stage, 'demo');
    assert.ok(store.get(a.id).value_map.test);
    assert.equal(store.get(b.id).context.stage, 'proposal');
    assert.equal(store.get(b.id).value_map, null);
  });
});

// ── delete() ──────────────────────────────────────────────────────────────────

describe('dealStore — delete()', () => {
  let storage, store;
  beforeEach(() => { storage = makeFakeStorage(); store = loadStore(storage); });

  test('removes deal — get() returns null afterward', () => {
    const deal = store.create('Delete Me');
    store.delete(deal.id);
    assert.equal(store.get(deal.id), null);
  });

  test('list() no longer includes the deleted deal', () => {
    const a = store.create('A');
    const b = store.create('B');
    store.delete(a.id);
    const list = store.list();
    assert.equal(list.length, 1);
    assert.equal(list[0].id, b.id);
  });

  test('deleting a non-existent id is safe (no throw)', () => {
    assert.doesNotThrow(() => store.delete('ghost-id'));
  });
});

// ── getFromUrl() ──────────────────────────────────────────────────────────────

describe('dealStore — getFromUrl()', () => {
  test('returns null when no ?deal= param in URL', () => {
    const storage = makeFakeStorage();
    const store = loadStore(storage, '');
    assert.equal(store.getFromUrl(), null);
  });

  test('returns the deal when ?deal=<id> is present', () => {
    const storage = makeFakeStorage();
    const store1 = loadStore(storage); // creates + persists deal
    const deal = store1.create('URL Corp');
    const store2 = loadStore(storage, `?deal=${deal.id}`); // same storage, deal in URL
    const found = store2.getFromUrl();
    assert.ok(found);
    assert.equal(found.id, deal.id);
  });

  test('returns null when deal ID in URL does not exist in storage', () => {
    const storage = makeFakeStorage();
    const store = loadStore(storage, '?deal=ghost-id');
    assert.equal(store.getFromUrl(), null);
  });
});

// ── localStorage overflow handling ────────────────────────────────────────────

describe('dealStore — localStorage overflow handling', () => {
  test('_write() swallows QuotaExceededError — patch() does not throw', () => {
    const storage = makeFakeStorage();
    const store = loadStore(storage);
    const deal = store.create('Quota Co');
    storage._setThrowOnSet(true); // arm overflow after initial create
    assert.doesNotThrow(() => store.patch(deal.id, 'context.stage', 'demo'));
  });

  test('_all() returns {} when stored JSON is corrupted', () => {
    const storage = makeFakeStorage({ znith_deals: 'NOT_JSON{{{' });
    const store = loadStore(storage);
    assert.deepEqual(store.list(), []);
  });
});

// ── Migration from v1 schema ──────────────────────────────────────────────────

describe('dealStore — migration from v1 (winroom_*) schema', () => {
  test('migrates winroom_deals into znith_deals on first load', () => {
    const storage = makeFakeStorage({
      winroom_deals: JSON.stringify([{
        id: 'legacy-001',
        name: 'Old Corp',
        lastModified: '2025-01-01T00:00:00.000Z',
        health: 65,
      }]),
      'winroom_legacy-001_setup': JSON.stringify({
        account: 'Old Corp',
        stage: 'proposal',
        dealSize: 75000,
        closeTarget: '2025-03-31',
        products: 'CLM',
        accountContext: 'Some context',
      }),
    });

    loadStore(storage);

    const allDeals = JSON.parse(storage.getItem('znith_deals') || '{}');
    const migrated = allDeals['legacy-001'];
    assert.ok(migrated, 'deal should be in znith_deals');
    assert.equal(migrated.context.account_name, 'Old Corp');
    assert.equal(migrated.context.stage, 'proposal');
    assert.equal(migrated.context.deal_value, 75000);
    assert.equal(migrated.context.close_date, '2025-03-31');
    assert.deepEqual(migrated.context.products, ['CLM']);
    assert.ok(migrated.win_room_v1, 'v1 data preserved in win_room_v1');
    assert.equal(storage.getItem('znith_migrated_v1'), '1');
  });

  test('maps v1 free-text stage labels to v2 stage IDs', () => {
    const stageCases = [
      ['prospect',      'discovery'],
      ['qualification', 'discovery'],
      ['demo/proof',    'demo'],
      ['closed won',    'closed_won'],
      ['closed lost',   'closed_lost'],
      ['negotiation/close', 'negotiation'],
    ];

    const storage = makeFakeStorage({
      winroom_deals: JSON.stringify(
        stageCases.map(([, ], i) => ({
          id: `s${i}`, name: `Deal ${i}`,
          lastModified: '2025-01-01T00:00:00.000Z',
        }))
      ),
      ...Object.fromEntries(
        stageCases.map(([raw], i) => [
          `winroom_s${i}_setup`, JSON.stringify({ stage: raw }),
        ])
      ),
    });

    loadStore(storage);

    const all = JSON.parse(storage.getItem('znith_deals') || '{}');
    stageCases.forEach(([raw, expected], i) => {
      assert.equal(
        all[`s${i}`]?.context.stage, expected,
        `"${raw}" should map to "${expected}"`
      );
    });
  });

  test('is idempotent — skips migration when znith_migrated_v1 is already set', () => {
    const storage = makeFakeStorage({
      znith_migrated_v1: '1',
      winroom_deals: JSON.stringify([{ id: 'old', name: 'Old' }]),
    });

    loadStore(storage);

    // znith_deals should not have been written
    assert.equal(storage.getItem('znith_deals'), null);
  });

  test('does not overwrite a deal that already exists in znith_deals', () => {
    const storage = makeFakeStorage({
      znith_deals: JSON.stringify({ 'legacy-001': { id: 'legacy-001', context: { account_name: 'Already Here' } } }),
      winroom_deals: JSON.stringify([{ id: 'legacy-001', name: 'Old Corp' }]),
    });

    loadStore(storage);

    const all = JSON.parse(storage.getItem('znith_deals') || '{}');
    assert.equal(all['legacy-001'].context.account_name, 'Already Here');
  });
});

// ── stageLabel() ──────────────────────────────────────────────────────────────

describe('dealStore — stageLabel()', () => {
  let store;
  beforeEach(() => { store = loadStore(makeFakeStorage()); });

  test('returns human label for known stage IDs', () => {
    assert.equal(store.stageLabel('discovery'),   'Discovery');
    assert.equal(store.stageLabel('demo'),        'Demo');
    assert.equal(store.stageLabel('proposal'),    'Proposal');
    assert.equal(store.stageLabel('negotiation'), 'Negotiation');
    assert.equal(store.stageLabel('closed_won'),  'Closed Won');
    assert.equal(store.stageLabel('closed_lost'), 'Closed Lost');
  });

  test('falls back to the raw ID for unknown stage', () => {
    assert.equal(store.stageLabel('unknown_stage'), 'unknown_stage');
  });
});
