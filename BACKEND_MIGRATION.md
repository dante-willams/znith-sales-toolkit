# Backend Migration Checklist

Target stack: Vercel serverless functions · Neon Postgres · Prisma · Clerk auth

Last audited: 2026-04-17

---

## Status overview

| Item | Status |
|------|--------|
| Anthropic API proxy (`/api/claude`) | ✅ Already done |
| dealStore abstraction layer | ✅ Ready to swap |
| Tool-specific localStorage caches | ⚠️ Need migration |
| File/document binary storage | ⚠️ Need Vercel Blob |
| Auth (Clerk) | ❌ Not started |
| Multi-tenancy | ❌ Not started |

---

## 1. dealStore.js — Core swap (one file, ~6 lines)

**File:** `shared/dealStore.js`

Swap only `_all()` and `_write()`. Every tool, every public method, zero other changes.

```javascript
// BEFORE (localStorage)
function _all() {
  return JSON.parse(localStorage.getItem('znith_deals') || '{}');
}
function _write(deals) {
  localStorage.setItem('znith_deals', JSON.stringify(deals));
}

// AFTER (API)
async function _all() {
  const res = await fetch('/api/deals', { headers: authHeaders() });
  return res.json(); // { [id]: deal, ... }
}
async function _write(deals) {
  await fetch('/api/deals', {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(deals)
  });
}
```

All public methods (create, get, list, save, patch, delete) are already async-compatible — they call these two functions internally.

---

## 2. Anthropic API key — ✅ ALREADY DONE

`/api/claude.js` already exists and proxies all Anthropic calls server-side. The key lives in Vercel environment variables as `ANTHROPIC_API_KEY`. All five tools (account-brief-v2, qualify-iq, demo-brief, value-map, win-room) already call `/api/claude` — no direct browser-to-Anthropic calls remain.

**No changes needed here.**

---

## 3. Tool-specific localStorage caches — ⚠️ Needs migration

Each tool maintains its own local brief history in addition to syncing to dealStore. These are "saved briefs" lists that let reps browse past runs within each tool.

| Tool | Storage key | What's stored | Already in dealStore? |
|------|-------------|---------------|----------------------|
| account-brief-v2 | `conga_account_briefs` | Full brief history (max 20) | No — not synced |
| qualify-iq | `qualifyiq_analyses` | MEDDPICC history (max 50) | Partial — latest synced |
| demo-brief | `conga_demo_briefs` | Brief history | Partial — latest synced |
| value-map | `conga_value_maps_v1` | Value map history | Partial — latest synced |

**Migration path for each:**

- `conga_account_briefs` → Add `deal.account_briefs[]` array to deal schema. Account Brief currently only syncs `deal.research` (the latest research output); full brief history needs its own field.
- `qualifyiq_analyses`, `conga_demo_briefs`, `conga_value_maps_v1` → These are already mostly synced to dealStore (`deal.qualification`, `deal.meeting_preps[]`, `deal.value_map`). On migration, replace the localStorage read/write calls with backend queries against the deal record. The "all saved items" list view in each tool becomes a query filtered by `workspace_id`.

**Decision needed before migration:** Keep separate history tables per tool, or always derive from the deal record? Recommended: derive from deal record (simpler, no sync issues).

---

## 4. File / document storage — ⚠️ Needs Vercel Blob

**Current behaviour:**
- Users upload PDFs, DOCX, TXT in account-brief-v2, qualify-iq, and value-map
- `FileReader` extracts text client-side (pdf.js + mammoth.js)
- Extracted text is saved to `deal.documents[].extracted_text` via dealStore
- Binary files are never persisted — if the page reloads, the file is gone

**Migration:**
1. On file select, POST the binary to `/api/documents/upload` → store in Vercel Blob → get back a URL
2. Save `{ name, type, url, extracted_text, uploaded_at }` to `deal.documents[]`
3. Remove the 50k character truncation that exists today (blob removes the size constraint)

**Files to update:**
- `account-brief-v2/index.html` — file upload handler, `syncToDeal()` documents mapping
- `qualify-iq/index.html` — file upload handler (currently no dealStore sync — needs full wiring)
- `value-map/index.html` — file upload handler (currently no dealStore sync — needs full wiring)

**Note:** qualify-iq and value-map don't currently save uploaded docs to dealStore at all. That's a gap to fix even before the backend (they should save extracted text to `deal.documents[]` the same way account-brief-v2 does).

---

## 5. Auth — Clerk

**Current:** No auth. All deals are local to the browser — anyone on that machine sees all deals.

**Migration:**
- Add Clerk (`@clerk/clerk-js`) — pre-built sign-in UI, supports SSO/Google
- Every API call includes the Clerk session token in the `Authorization` header
- `authHeaders()` helper in dealStore: `{ Authorization: 'Bearer ' + clerk.session.getToken() }`
- Dashboard shows only deals for the authenticated user's workspace

---

## 6. Multi-tenancy

**Current:** localStorage is per-browser — no sharing between reps.

**Migration:** Every deal, document, and generated output gets `workspace_id` + `user_id`. Reps in the same org see shared deals. Deal ownership stays on `user_id`.

```prisma
model Deal {
  id           String   @id @default(uuid())
  workspaceId  String
  userId       String
  data         Json     // full deal entity (current shape preserved)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([workspaceId])
}

model Document {
  id          String   @id @default(uuid())
  dealId      String
  workspaceId String
  name        String
  type        String
  blobUrl     String
  extractedText String? @db.Text
  uploadedAt  DateTime @default(now())
}
```

---

## 7. Research caching

**Current:** `research_hash` (djb2 of lowercased account name) is stamped on the deal after research runs. `needsResearch()` checks it before triggering an expensive Claude call.

**Migration:** Same hash, same logic — just lives in the DB instead of localStorage. No logic changes needed.

---

## 8. News TTL (24h refresh)

**Current:** `deal.research.news.last_checked` is checked client-side. If older than 24h, news is re-fetched on tool open.

**Migration:** Move news refresh to a Vercel Cron Job (`/api/cron/refresh-news`) that runs nightly. Removes the client-side check entirely. Cron can batch-refresh all deals in a workspace rather than triggering per-user-open.

---

## 9. Theme preferences

**Current:** Theme (dark/light) is stored in localStorage under `znith-theme` (dashboard, win-room) and `ab-theme` (account-brief-v2). These are inconsistent key names.

**Migration:** Standardize to one key, then move to a user profile field in the DB or a cookie. Low priority.

---

## 10. Usage analytics

**Current:** Not tracked.

**Migration:** Log events to an `events` table: `{ workspace_id, user_id, deal_id, tool, action, timestamp }`. Enables rep coaching metrics and manager dashboards.

---

## What does NOT need to change

- All tool HTML/UI — zero changes
- `deal-nav.js`, shared CSS, fonts, theming
- dealStore public API surface (create, get, list, save, patch, delete, urlFor, etc.)
- All AI prompts — same prompts, same outputs
- The deal entity schema shape — same JSON, just stored in Postgres instead of localStorage
- Dashboard drawer + deal card logic

---

## Recommended migration order

1. ~~**API key proxy**~~ — ✅ Already done
2. **Fix qualify-iq + value-map document sync** — save extracted text to `deal.documents[]` now, no backend needed (quick win, improves cross-tool context today)
3. **Clerk auth + workspace setup** — blocks everything below
4. **dealStore swap** (`_all` / `_write`) — single file change, instant data persistence
5. **Vercel Blob file storage** — upload endpoint + update document handlers in 3 tools
6. **Retire tool-specific localStorage caches** — replace with backend queries on deal record
7. **Cron-based news refresh** — replace client-side TTL check
8. **Usage analytics** — final phase
