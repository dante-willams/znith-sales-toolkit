// shared/dealStore.js
//
// Single source of truth for all deal data.
// Every tool reads and writes through this — never directly to localStorage.
//
// BACKEND MIGRATION: when a backend is ready, swap the _all()/_write() internals
// for fetch() calls. No tool UI needs to change.

const dealStore = (() => {

  const STORAGE_KEY = 'znith_deals';
  const NEWS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  // ── Storage primitives ──────────────────────────────────────────────────────

  function _all() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch (e) { return {}; }
  }

  function _write(deals) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(deals)); }
    catch (e) { console.error('[dealStore] write failed:', e); }
  }

  // ── Utilities ───────────────────────────────────────────────────────────────

  function _id() {
    return crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  // djb2 hash — lightweight cache key for account name changes
  function _hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
    return (h >>> 0).toString(16);
  }

  // Set a value at a dot-notation path: _set(obj, 'research.company_profile', {...})
  function _set(obj, path, value) {
    const keys = path.split('.');
    let cur = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (cur[keys[i]] == null || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  return {

    // Create a new deal. Returns the full deal object.
    create(accountName, opts = {}) {
      const deal = {
        id: _id(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),

        context: {
          account_name: accountName,
          stage: opts.stage || 'discovery',
          close_date: opts.close_date || null,
          deal_value: opts.deal_value || null,
          products: opts.products || [],
          notes: ''
        },

        stakeholders: [],

        // Written by Account Brief. null until first research run.
        research: null,

        // Written by Qualify IQ. null until first qualification run.
        qualification: null,

        // Array — one entry per meeting prep (Demo Brief).
        meeting_preps: [],

        // Written by Value Map.
        value_map: null,

        // Uploaded files — extracted text stored here so all tools can use it.
        documents: []
      };

      const deals = _all();
      deals[deal.id] = deal;
      _write(deals);
      return deal;
    },

    // Retrieve a single deal by ID. Returns null if not found.
    get(id) {
      return _all()[id] || null;
    },

    // All deals, sorted newest-updated first.
    list() {
      return Object.values(_all())
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    },

    // Save a full deal object back to storage.
    save(deal) {
      deal.updated_at = new Date().toISOString();
      const deals = _all();
      deals[deal.id] = deal;
      _write(deals);
      return deal;
    },

    // Update a specific nested field without touching the rest of the deal.
    // dealStore.patch(id, 'research.company_profile', { ... })
    // dealStore.patch(id, 'context.stage', 'proposal')
    patch(id, path, value) {
      const deal = this.get(id);
      if (!deal) { console.warn('[dealStore] patch: deal not found', id); return null; }
      _set(deal, path, value);
      return this.save(deal);
    },

    delete(id) {
      const deals = _all();
      delete deals[id];
      _write(deals);
    },

    // ── Research cache helpers ────────────────────────────────────────────────

    // True if full company research needs to run:
    // — no research exists yet, OR
    // — account name changed since last research run
    needsResearch(id) {
      const deal = this.get(id);
      if (!deal?.research) return true;
      const hash = _hash(deal.context.account_name.trim().toLowerCase());
      return deal.research.research_hash !== hash;
    },

    // Call after saving research output — stamps the hash so the next
    // open skips the expensive research call.
    stampResearchHash(id) {
      const deal = this.get(id);
      if (!deal) return null;
      if (!deal.research) deal.research = {};
      deal.research.research_hash = _hash(deal.context.account_name.trim().toLowerCase());
      deal.research.generated_at = new Date().toISOString();
      return this.save(deal);
    },

    // True if recent news should be refreshed (never fetched or older than 24h).
    // News is intentionally separate from full research — it runs on every deal open
    // if stale, even when the deep company research is still valid.
    needsNewsRefresh(id) {
      const deal = this.get(id);
      if (!deal?.research?.news?.last_checked) return true;
      return Date.now() - new Date(deal.research.news.last_checked).getTime() > NEWS_TTL_MS;
    },

    // ── URL / navigation helpers ──────────────────────────────────────────────

    // Read the active deal from ?deal=<id> in the current URL.
    // Returns null if no deal param or deal not found.
    getFromUrl() {
      const id = new URLSearchParams(window.location.search).get('deal');
      return id ? this.get(id) : null;
    },

    // Build a tool URL with the deal ID attached.
    // dealStore.urlFor('../win-room/', deal.id) → '../win-room/?deal=abc123'
    urlFor(toolPath, dealId) {
      return `${toolPath}?deal=${dealId}`;
    },

    // ── Stage metadata ────────────────────────────────────────────────────────

    STAGES: [
      { id: 'discovery',    label: 'Discovery' },
      { id: 'demo',         label: 'Demo' },
      { id: 'proposal',     label: 'Proposal' },
      { id: 'negotiation',  label: 'Negotiation' },
      { id: 'closed_won',   label: 'Closed Won' },
      { id: 'closed_lost',  label: 'Closed Lost' },
    ],

    stageLabel(id) {
      return this.STAGES.find(s => s.id === id)?.label || id;
    }

  };

})();
