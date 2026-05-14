# Znith Sales Toolkit — Claude Code Guidelines

## Data Safety — Non-negotiable Rule

**Never wipe, overwrite, or reset existing user deal data.**

User deals are the most critical data in this app. A rep's entire pipeline, notes, and AI synthesis live locally. Losing it is unrecoverable.

### How data is stored

- **Primary store:** `localStorage` key `znith_deals` — a JSON object keyed by deal ID
- **All reads and writes go through `shared/dealStore.js`** — never access `localStorage` directly from tool UIs
- **Migration flag:** `znith_migrated_v1` — do not remove or reset this
- **Legacy keys (read-only):** `winroom_deals`, `winroom_{id}_{suffix}` — only read during one-time migration

### Rules for any change touching data persistence

- **Never call `localStorage.clear()`** anywhere in this codebase
- **Never call `localStorage.removeItem('znith_deals')`** — deals are user-owned, not app-owned
- **Never overwrite the full `znith_deals` store** without first merging with existing data
- **Never reset or reinitialize `dealStore.js`** in a way that drops existing deals
- **Schema migrations must be additive** — add new fields with defaults; never remove or rename existing fields without a forward-compatible migration that preserves all existing deal data
- **Test any migration** against a store that already has deals before shipping

### Acceptable `removeItem` / `removeItem` usage

- `znith_prefill` — temporary prefill flag, safe to clear after use
- `{HISTORY_KEY}` in sales-hub — chat history only, not deal data
- Any key you introduce that is explicitly scoped to UI/session state, not deal content

### When in doubt

If a change could touch `znith_deals` in any way — even indirectly — stop and confirm with the user before proceeding.

---

## Workflow — PRs Required for All Changes

**All changes to `main` must go through a pull request.** No direct pushes to main.

- Create a branch for every change, no matter how small
- Open a PR and let CI pass before merging
- Branch protection enforces this: `test` job must be green, branch must be up to date with main

### Branch naming

Follow the existing convention: `type/short-description`
Examples: `fix/win-room-icp-bug`, `feat/icp-v1-5`, `chore/deps-bump`

---

## Architecture Notes

- **`shared/`** — single source of truth for cross-tool data: `dealStore.js`, `deal-nav.js`, `icp-data.json`, `icp-scoring-engine.json`, `znith-tokens.css`
- **`api/claude.js`** — Vercel serverless proxy to Anthropic API; all AI calls route through here
- **`auth.js`** — password gate; loaded before any tool content
- Tools: `prospecting-agent/`, `account-brief-v2/`, `win-room/`, `sales-hub/`, `qualify-iq/`, `dashboard/`, `manager-hub/`
- ICP scoring engine is at `shared/icp-scoring-engine.json` — this is the single source of truth; do not edit `ICP/ICP_Scoring_Matrix.xlsx`
