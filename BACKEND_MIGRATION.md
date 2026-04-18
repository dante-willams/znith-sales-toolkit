# Backend Migration Checklist

When a backend is ready (Vercel serverless + Neon Postgres + Prisma + Clerk), these are the exact changes needed. Nothing else in the UI should need to touch.

---

## 1. dealStore.js — Core swap (single file)

**File:** `shared/dealStore.js`

The entire localStorage layer is isolated in two private functions. Swap these two and nothing else changes:

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

All public methods (create, get, list, save, patch, delete) call these two — no other changes needed.

---

## 2. API Key handling

**Current:** Each user pastes their Anthropic API key into the browser. It's stored in `localStorage` as `anthropic_api_key` and sent in `callClaude()` from the client.

**Migration:** Move the key server-side. Create a Vercel serverless function `/api/claude` that proxies requests. Client sends the prompt, server adds the key.

**Files to update:**
- Every `callClaude()` function across all tools — change the fetch target from `https://api.anthropic.com/v1/messages` to `/api/claude`
- Remove the API key input UI from each tool's settings/header
- Add the key to Vercel environment variables: `ANTHROPIC_API_KEY`

**Security note:** This is the most important migration item. Keys in the browser are visible to anyone with DevTools.

---

## 3. Document / file storage

**Current:** Extracted text from uploaded files is stored in `deal.documents[]` in localStorage. Binary files are not stored at all — only extracted text. 5MB localStorage limit applies.

**Migration:**
- Upload binary files to Vercel Blob (or S3)
- Store the blob URL in `deal.documents[].url`
- Keep extracted text in the DB for prompt context
- Remove the 50k character truncation limit

---

## 4. Auth — Clerk

**Current:** No auth. All deals are local to the browser.

**Migration:**
- Add Clerk for auth (pre-built UI, supports SSO)
- Every DB table gets `workspace_id` and `user_id` columns
- dealStore API calls include the Clerk session token in headers
- Dashboard shows only deals belonging to the user's workspace

---

## 5. Multi-tenancy

**Current:** localStorage is per-browser — no sharing between reps.

**Migration:** Every deal, document, and generated output gets a `workspace_id`. Reps in the same org see the same deals. Deal ownership stays on `user_id`.

**DB schema (Prisma):**
```prisma
model Deal {
  id           String   @id @default(uuid())
  workspaceId  String
  userId       String
  data         Json     // full deal entity
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

---

## 6. Research caching

**Current:** `research_hash` (djb2 of account name) is stored on the deal object. `needsResearch()` checks it before running a new research call.

**Migration:** Same logic, same hash — just lives in the DB instead of localStorage. No logic change needed, only storage layer swaps.

---

## 7. News TTL

**Current:** 24h TTL checked via `deal.research.news.last_checked` in localStorage.

**Migration:** Same field, same logic, just in DB. Consider moving news refresh to a server-side cron (Vercel Cron Jobs) instead of client-triggered.

---

## 8. Usage / analytics

**Current:** Not tracked.

**Migration:** Log tool usage events to a `events` table (which rep, which tool, which deal, timestamp). Enables rep coaching metrics and admin dashboards.

---

## 9. Sharing & collaboration

**Current:** Not possible — deals are browser-local.

**Migration:** Add `deal.shared_with[]` (array of user IDs). Shared deals show up read-only for other reps. Full collaboration (comments, assignments) is Phase 2.

---

## 10. localStorage size limit

**Current:** ~5MB total. Long documents are truncated at ~50k characters in prompt context.

**Migration:** No limit in DB. Remove truncation logic from document handling in all tools.

---

## Non-changes (no migration needed)

- All tool UI/HTML — zero changes
- dealStore public API (create, get, list, save, patch, delete, urlFor, etc.)
- AI prompts — all prompt logic stays client-side or proxied as-is
- deal-nav.js, shared CSS, fonts, theming
- The deal entity schema — same shape, just persisted in Postgres instead of localStorage

---

## Migration order (recommended)

1. API key proxy (security, do this first)
2. Clerk auth + workspace setup
3. dealStore swap (one file)
4. File/blob storage
5. Cron-based news refresh
6. Sharing / collaboration
