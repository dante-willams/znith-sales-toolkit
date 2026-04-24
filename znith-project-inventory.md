# Znith + Prospecting Agent + Aimee Prototype — Project Inventory & Skills Analysis
**Prepared:** April 21, 2026  
**Author context:** Reeves Goepfert, Sales leader building AI tools for Conga sales org  
**For:** Claude analysis session — honest assessment of tool progression and skills development

---

## 1. Feature Inventory — What Exists Today

### Znith Sales Toolkit

**What it is:** A suite of AI-powered deal execution tools built as browser-based single-page applications, hosted on Vercel. Each tool addresses a distinct moment in the B2B enterprise sales cycle. Tools share a common deal context so outputs from one feed the next.

**For whom:** Conga AEs working mid-to-late stage enterprise deals. Designed to reduce research time, sharpen qualification, and improve deal storytelling without requiring reps to leave their workflow.

**The core problem it solves:** Enterprise AEs spend 3–5 hours per deal on manual research, qualification writeups, and meeting prep. Znith compresses that to 15–20 minutes of guided, AI-assisted work — and produces outputs (briefs, value cases, coaching plans) that are actually shareable.

---

### Tool Roster (Current Production)

| Tool | Path | Purpose | Model | Maturity |
|------|------|---------|-------|---------|
| Account Brief v2 | `/account-brief-v2` | 6-pass account research → deal brief | Sonnet 4 | Production |
| Qualify IQ | `/qualify-iq` | MEDDPICC scoring 0–100 per dimension | Haiku 4.5 | Production |
| Value Map | `/value-map` | ROI quantification + pricing scenarios | Sonnet 4.6 | Production |
| Demo Brief | `/demo-brief` | Persona-specific meeting prep + scripts | Sonnet 4 | Production |
| Win Room | `/win-room` | Deal coaching + competitive intelligence | Sonnet 4 | Production |
| Prospecting Agent | `/prospecting-agent` | Territory setup → account scoring → outreach | Opus 4.5 | Active Dev |
| Manager Hub | `/manager-hub` | Pipeline health + rep coaching (planned) | TBD | Scaffold |
| Dashboard | `brand-refresh` branch | Deal hub + pipeline view | — | Merge-ready |

---

### Prospecting Agent (Separate Project)

**What it is:** A sequential 6-module wizard that takes a sales rep from territory definition to a deployable outreach sequence. The entire ICP framework is data-validated from 60,000+ closed/lost deals across Conga CLM, CPQ, DocAuto, and PROS products.

**For whom:** Conga + PROS reps who need to build a territory from scratch — identify the right accounts, prioritize them against real win-rate data, build product-specific messaging, and generate multi-touch sequences.

**The core problem it solves:** New reps (or reps entering new territories) spend weeks manually researching accounts with no systematic framework. The Prospecting Agent replaces that with a data-backed, AI-guided workflow that produces a ranked account list, POV messaging, contact research, and outreach sequences in one session.

**Module Status:**

| Module | Purpose | Status |
|--------|---------|--------|
| 1: Territory Setup | Geo, segment, product focus selection | Complete |
| 2: Account Prioritization | AI scoring against ICP (1–10) | Complete |
| 3: Prospecting POV Builder | Product-specific messaging angles | Partially complete |
| 4: Contact Research | Top contacts + buying signals per account | Substantially complete |
| 5: Sequence Builder | 10-step multi-touch outreach cadence | Scaffolded |
| 6: Activity Tracker | Progress tracking + pipeline notes | Scaffolded |

---

### Aimee Prototype — Contract Redline Agent

**Path:** `/Users/rgoepfert/Projects/aimee-prototype/redline-agent/index.html`  
**Deployed:** Vercel (separate project, same proxy pattern as Znith)

**What it is:** An AI-powered contract review and redlining tool. Upload a DOCX or PDF contract → Claude identifies every material issue → you accept/reject each redline → export a clean `.docx` with native Word tracked changes (`w:del` / `w:ins`).

**For whom:** Conga deal desk, legal, or AEs reviewing inbound customer paper. Also designed for a planned "seller-side" mode where Aimee reviews contracts against Conga's own MSA positions.

**The core problem it solves:** Manual contract review takes legal hours per document. Aimee produces a severity-ranked issue list with Preferred/Fallback replacement language in ~30 seconds — without replacing legal judgment, just front-loading the analysis.

**Key Features:**

| Feature | Implementation |
|---------|---------------|
| File upload | DOCX (mammoth.js extraction + docx-preview rendering) / PDF (pdf.js) |
| Issue detection | Claude via Tool Use API (`report_contract_issues` tool) — structured output, not JSON prompt |
| Severity tiers | Critical / High / Medium / Low with weighted risk score (0–100) |
| Alternative language | 2 options per issue: Preferred (most protective) + Fallback (commercially reasonable) |
| Inline highlighting | Color-coded document highlights mapped to issue cards; click to locate |
| Redline mode | Accept = inline strikethrough (red) + insertion (green) rendered in doc viewer |
| Export | Injects `w:del`/`w:ins` tracked change XML directly into original DOCX buffer via JSZip |
| Auto-escalation | If Sonnet truncates (stop_reason = max_tokens), auto-retries with Opus 4.7 |
| Edit mode | `contenteditable` on the doc viewer — edit accepted redlines before export |
| Legal contexts | Commercial / M&A / Litigation / Employment — different system prompts per context |

**Clause Libraries:**

1. **Generic Clause Library** (embedded in `redline-agent/index.html`) — 13 standard positions (limitation of liability, indemnification, IP ownership, confidentiality, termination, auto-renewal, governing law, etc.) with notes on what "market standard" means for each.

2. **Conga MSA Clause Library** (`conga_msa_clause_library.json`) — 40+ clauses sourced verbatim from Conga's Master Services Agreement v5.0 (effective May 17, 2024). Categorized by risk profile (`standard`, `seller_favorable`, `buyer_favorable`). This is the foundation for a planned "seller-side" mode where Aimee reviews inbound customer paper against Conga's actual contract positions.

**Model Selection:**
- Default: `claude-sonnet-4-6`
- Deep analysis: `claude-opus-4-7`
- Fast: `claude-haiku-4-5-20251001`
- User-selectable in header dropdown; auto-escalates to Opus on truncation

---

## 2. Core Architecture — The Non-Obvious Decisions

### Znith: Hub-and-Spoke via Shared Deal Context

The most important architectural decision in Znith is not the tech stack — it's the deal context model. Every tool reads and writes to a shared `dealStore` keyed by a UUID in the URL (`?deal=<uuid>`). This means:

- Account Brief outputs feed directly into Win Room synthesis
- Qualify IQ scores surface in the Manager Hub pipeline view
- Demo Brief reads contact names from Account Brief research
- All tools are stateless per-request — they hydrate from the store on load

**Why this matters:** The tools are independently useful but become exponentially more valuable in sequence. A rep who runs all 5 tools on a deal has a full intelligence package that no tool alone provides.

**Current state:** dealStore runs on `localStorage`. The abstraction layer (`dealStore.js`) is already written to be swappable — a planned MongoDB Atlas backend + Vercel API layer will be a single file change in each tool.

---

### The Proxy Pattern (Security + Flexibility)

All Claude API calls route through `/api/claude.js` (Vercel serverless function) rather than hitting Anthropic directly from the browser. This is a non-obvious choice for what is essentially an internal tool.

**Why:**
1. Keeps the Anthropic API key out of browser DevTools — critical even for internal tools
2. Enables server-side password validation (`x-toolkit-password` header checked against `TOOLKIT_PASSWORD` env var) without any backend database
3. Future-proofs for rate limiting, usage logging, and model switching without touching frontend code
4. The prompt caching beta header (`anthropic-beta: prompt-caching-2024-07-31`) is injected centrally here

**Tradeoff accepted:** Cold start latency on serverless function. Acceptable given the 300s max duration and the fact that Claude responses are the bottleneck anyway.

---

### Multi-Pass Research Pipeline (Account Brief)

Account Brief v2 makes 6 sequential Claude calls rather than one large prompt:

1. Company intelligence (market position, financials, news)
2. Contact research (titles, email patterns, roles)
3. Industry trends
4. Conga-specific positioning
5. Call strategy
6. Deal brief synthesis

**Why not one big prompt:** Single-pass synthesis on large inputs produces shallow outputs. Breaking it into passes allows each step to reason deeply on its slice, and the final synthesis pass gets focused inputs rather than a wall of raw data. The tradeoff is 6x the API cost and 3–4x the latency — accepted because quality of output is the product.

---

### Static SPA + Serverless (No Build Step)

Znith has no build pipeline. HTML files are served directly from CDN. No React, no bundler, no CI/CD for frontend changes.

**Why:**
- Speed of iteration — edit an HTML file, push, deployed in 30 seconds
- Zero toolchain complexity — no `node_modules`, no webpack configs to break
- Accessible to non-developers for reading/modifying

**The hidden cost:** As each tool grew past 5,000 lines of inline HTML/CSS/JS, the files became difficult to maintain. The brand-refresh branch begins to address this with shared CSS (`znith-tokens.css`) and shared JS modules (`dealStore.js`, `deal-nav.js`). A future backend migration will force a proper build step.

---

### Design Token System (v3 → v4)

The v4 design system (`znith-tokens.css`) introduced a four-role color palette with semantic naming:

- **Amber** — action signature (buttons, highlights, primary CTAs)
- **Status** — semantic (green/orange/red for ok/warn/risk)
- **Info** — muted slate for secondary content
- **Stage pills** — per-stage colors that follow deals across all tools

**The non-obvious decision:** Amber is used *only* for action and emphasis — never for informational content. This forces the UI to visually prioritize calls to action over data display, which matches the use case (reps need to act, not just read).

**Current gap:** v4 tokens are on the `brand-refresh` branch; main branch still has v3 amber styles mixed with hardcoded values across tools. The brand-refresh merge is ready but undeployed.

---

### Authentication Without User Accounts

Auth is a shared modal (`auth.js`) that validates a single environment variable password against the Vercel serverless function. No user accounts, no OAuth, no session tokens.

**Why it works now:** Single-team internal tool. One password rotated as needed. Zero infrastructure.

**Why it breaks at scale:** No per-user audit trail, no workspace isolation, no SSO for Conga enterprise users. A Clerk migration is planned for the backend phase.

---

### Aimee: Tool Use API Instead of JSON Prompting

Aimee uses Claude's structured tool use API (`tools` + `tool_choice: { type: "tool", name: "report_contract_issues" }`) rather than prompting for JSON output. This is architecturally distinct from every Znith tool, which all use text prompts requesting JSON.

**Why it matters:** `tool_choice` forces the model to invoke the named tool and populate its schema. The response is always a valid `tool_use` content block — no JSON parsing errors, no preamble, no markdown fences. The schema also validates field types and required fields before the response is returned. For a contract review tool where a single malformed response breaks the entire UX, this is meaningfully more robust than `"return ONLY valid JSON"`.

**The tradeoff:** Tool use responses are slightly larger (metadata overhead) and the schema must be defined upfront. For open-ended research outputs (like Account Brief), text+JSON prompting is more flexible. For structured, repeatable outputs (like issue lists), tool use is the right call.

---

### Aimee: DOCX Tracked Changes via JSZip

When exporting redlines from an original DOCX, Aimee doesn't generate a new document — it opens the original `.docx` buffer with JSZip, patches `word/document.xml` to inject `<w:del>` and `<w:ins>` XML at the exact matched paragraph, and re-zips it.

**Why:** The resulting file opens in Microsoft Word with native tracked changes — the reviewer's name shows as "Aimee," the change date is set, and the counterparty can accept/reject individual changes in Word exactly as they would with a human redline. This is the difference between a PDF markup and an actual contract redline.

**The fragility:** The DOCX paragraph-matching logic (`docXml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, ...)`) strips XML tags to extract text, then matches against the issue's `original_text`. Complex DOCX files with tracked changes, comments, or text split across `<w:r>` runs will confuse this matcher. It works reliably on standard contracts; it will fail on heavily formatted or pre-redlined documents.

---

### Aimee: Two-Sided Clause Library Design

The generic clause library (embedded) represents buyer-side "market standard" positions. The `conga_msa_clause_library.json` represents Conga's actual seller-side positions — 40 clauses tagged with `risk_profile: seller_favorable | buyer_favorable | standard`.

**The intended architecture:** A "Commercial (Seller)" context in the dropdown would load the Conga MSA library as the system prompt baseline, enabling Aimee to review inbound customer paper against Conga's actual contract positions and flag deviations from Conga's standards. This is not yet wired up — the JSON file exists but is not currently referenced by the front-end.

---

### Prospecting Agent: Direct Browser API Calls

Unlike Znith, the Prospecting Agent calls Anthropic directly from the browser with `anthropic-dangerous-direct-browser-access: true`. This is the opposite of Znith's proxy pattern.

**Why:** Built as a standalone prototype before the proxy architecture was established. Faster to iterate on locally (no serverless cold starts, no deployment cycle). The API key is stored in localStorage — acceptable for a prototype used by one person.

**The risk:** API key exposure is one DevTools inspection away. This architecture is not suitable for team distribution without adopting the Znith proxy pattern.

---

### Prospecting Agent: Data-Embedded ICP as System Prompt

The most architecturally sophisticated piece across both projects is the Prospecting Agent's two-layer system prompt:

**Layer 1 (BASE_ICP_CONTEXT):** Universal context injected on every call — segment definitions, negative signals, competitor landscape, tech stack win-rate correlations, sales cycle benchmarks.

**Layer 2 (getProductICP):** Dynamically selected product-specific ICP profile — revenue floors, top industries by ACV, validated buying signals, close rate benchmarks.

**What makes this non-obvious:** The ICP data isn't generic best-practices content — it's derived from 60,000+ actual closed/lost deals. The system prompts contain specific numbers like "23.7% disqualification rate for CPQ" and "7% new logo win rate for DocAuto below $250M revenue." This is the difference between an AI that gives generically reasonable advice and one that gives Conga-specific advice.

---

### Future State Architecture (Planned)

The BACKEND_MIGRATION.md on the brand-refresh branch documents the full planned evolution:

| Layer | Current | Future |
|-------|---------|--------|
| Auth | Password modal + env var | Clerk (Vercel Marketplace native) |
| Data | localStorage / dealStore | MongoDB Atlas + Vercel API routes |
| File storage | Client-side pdf.js extraction | Vercel Blob + server-side extraction |
| News refresh | Client-side TTL check | Vercel Cron + server-side cache |
| Analytics | None | Event logging to Postgres |
| Multi-tenancy | None | Workspace isolation via Clerk orgs |

---

## 3. Load-Bearing AI Prompts & Product Logic

### Most Important: Two-Layer ICP System (Prospecting Agent)

```
Layer 1 — BASE_ICP_CONTEXT (injected on all calls):
- Universal segment definitions (Growth/Commercial/Enterprise/Strategic by ACV tier)
- Validated negative signals (SAP CRM = -15% close rate for Price Optimization)
- Competitor landscape (Ironclad/Icertis for CLM; PriceFX/Vendavo for PROS)
- Tech stack signals derived from win rates (Salesforce CRM = strong positive for CLM/CPQ)
- Sales cycle benchmarks (Price Optimization: 76-day median close vs. 197-day on lost deals)

Layer 2 — getProductICP(product) [selected dynamically]:
- Revenue floor for scoring consideration
- Top 3 industries ranked by realized ACV
- Validated buying signals (e.g., CLM: Salesforce + 500+ contracts + CLO hire = top score)
- New logo vs. expansion win rates (CPQ: only 7 new logos in 4 years = expansion-only ICP)
- Disqualification signals with rates (DocAuto: <0.1% new prospect win rate = focus elsewhere)
```

**Why it's load-bearing:** Remove this context and you have a generic account scoring tool. With it, you have a tool that mirrors how the company's top-performing reps actually qualify — the AI is doing what a great manager does when reviewing a rep's territory plan.

---

### Account Brief: Multi-Pass Pipeline Prompt Pattern

Each of the 6 passes uses a tightly scoped prompt that requests JSON only:

```
"You are researching [Account] for a Conga AE. 
Return ONLY valid JSON with no preamble or markdown fences.
Schema: { company: { name, hq, employees, revenue, recent_news[], growth_signal, risk_signal } }
Focus on signals relevant to enterprise contract/document/revenue lifecycle software decisions."
```

**Why it's load-bearing:**
1. `ONLY valid JSON` — prevents the model from adding commentary that breaks `JSON.parse()`
2. Schema specification — ensures downstream tools can reliably read the fields they need
3. Domain framing ("enterprise contract/document/revenue lifecycle software") — produces Conga-relevant analysis, not generic company profiles

---

### Win Room: Synthesis with Cross-Tool Context

Win Room's synthesis prompt is the most complex — it ingests outputs from *all other tools* and produces a unified coaching brief:

```
"Given the following deal intelligence for [Account]:
- Account Research: [deal.research summary]
- MEDDPICC Scores: [deal.qualification.meddpicc]
- Value Case: [deal.value_map]
- Recent Meeting Prep: [deal.meeting_preps[-1]]
- Competitive News: [deal.research.news.items]

Produce a deal coaching brief. Return JSON:
{ deal_summary, risk_factors[], win_themes[], competitive_threats[], 
  recommended_next_actions[], confidence_score (0-100) }"
```

**Why it's load-bearing:** This is the payoff of the hub-and-spoke data model. A rep who has run all 5 tools gets a synthesis that no individual tool produces. It's also where model quality matters most — Sonnet 4 with 6,000 max tokens for a reason.

---

### Qualify IQ: MEDDPICC Scoring with Confidence Levels

```
"Score this deal against MEDDPICC. For each dimension return:
{ score (0-100), confidence ('high'|'medium'|'low'), 
  evidence: [specific quotes or signals from input],
  gaps: [what information would improve this score] }"
```

**Why it's load-bearing:** The `confidence` field is critical — it tells the rep whether a 70/100 score is based on strong evidence or a guess. The `gaps` field is an activation trigger ("you said Champion is 60/100 with low confidence — here's what to ask in your next call"). Without these fields, MEDDPICC scores are numbers without meaning.

---

### Aimee: Context-Specific System Prompts

Aimee's four legal context prompts are the most domain-specific prompts across all three projects. Example (Commercial):

```
"You are a senior commercial attorney with 15 years of experience reviewing SaaS 
and services agreements. Your client is the buyer/licensee. Protect their interests 
while keeping deals commercially reasonable.

Focus: limitation of liability (must be mutual, fee-based), indemnification scope 
(mutual, third-party only, gross negligence threshold), IP ownership, auto-renewal 
traps, data protection, payment terms.

Risk calibration: One-sided liability cap = critical. Uncapped indemnification = 
critical. Evergreen renewal without adequate notice = high. Asymmetric termination 
= high. Missing warranty disclaimer = high.

Provide a 'Preferred' (most protective) and 'Fallback' (commercially reasonable) 
alternative for each issue."
```

**Why it's load-bearing:**
1. The persona framing ("15 years of experience") shapes the reasoning depth — generic prompts produce generic issue descriptions; senior attorney framing produces issues with legal rationale
2. The explicit risk calibration table tells the model exactly what severity to assign to specific patterns — consistent severity labeling is what makes the risk score meaningful
3. "Preferred vs. Fallback" is not just a formatting choice — it acknowledges that "most protective" is not always achievable and gives the reviewer options that reflect real negotiation dynamics

---

## 4. Honest Analysis of Tool Progression Over Time

### What's Getting Demonstrably Better

**Architectural thinking.** Early tools (account-brief v1, qualify-iq initial) were fully self-contained — each tool had its own localStorage key, its own API call, its own state. The evolution to `dealStore.js`, `deal-nav.js`, and a shared design token system shows a shift from "build a tool" to "build a system." This is a significant conceptual jump.

**Prompt precision — and prompt architecture.** Early prompts asked for prose output and then tried to parse it. Znith moved to explicit JSON schemas with `ONLY valid JSON`. Aimee goes further: it uses the Tool Use API (`tool_choice`) which offloads JSON validity to the API layer entirely. This is a meaningful architectural progression — from "prompt for JSON" to "enforce JSON via schema."

**Security awareness.** The move from direct browser API calls (Prospecting Agent) to a serverless proxy (Znith) shows awareness that internal tools eventually become team tools — and team tools have different security requirements than prototypes.

**Design system discipline.** The v4 token system (`znith-tokens.css`) represents real CSS architecture thinking — semantic naming, light/dark theme support, backward-compatible aliases, geometry tokens for clipped corners. Early tools had amber hardcoded as `#E5A83A` in 47 places. That's fixed.

**Data validation.** The Prospecting Agent ICP is built from 60,000+ real deals, not best-practices content. This is a meaningful leap — you're not asking AI to reason from generic principles; you're giving it validated ground truth and asking it to apply it.

---

### Where Gaps Still Exist

**Testing.** There is no test suite anywhere in either project. No unit tests for `dealStore.js`, no integration tests for the API proxy, no end-to-end tests for the research pipelines. This is the largest technical gap. A broken JSON parser in Win Room was only caught by manual testing (commit `f2e9fcc`). At team scale, this breaks trust in the tools.

**Error handling.** Most API calls have basic try/catch but no structured failure modes. If Account Brief pass 3 (industry trends) fails, what happens? Currently: the UI shows an error and stops. A robust implementation would retry, skip that pass, and note the gap in the output. Users lose work when anything breaks.

**Performance.** Each tool independently fetches the full deal on load from localStorage. With a backend, this will need proper caching strategy. The news refresh TTL logic (24h check in Win Room) is also client-side, which means it's unreliable — two users on the same deal will each trigger a refresh independently.

**Version management.** Both projects have multiple `index-v*.html` files committed to source. This is manual versioning — a sign that git branching wasn't being used for incremental feature development. The znith project has improved here (feature branches are used), but the prospecting agent still snapshots as files.

**The Prospecting Agent is architecturally isolated.** It's a standalone project that duplicates the Znith proxy pattern problem, has its own separate localStorage keys, its own design system (roughly aligned but not sharing tokens), and no integration with the Znith dealStore. If a rep uses both tools, they're maintaining two separate contexts for the same account. The long-term answer is merging Prospecting Agent Module 2+ outputs into `deal.research` — but that requires the backend migration first.

**Prompt caching is enabled but not measured.** The proxy injects the `anthropic-beta: prompt-caching-2024-07-31` header, but there's no logging of cache hit rates. Account Brief makes 6 sequential calls per account — if the deal context block is being cached across those calls, it's saving 30–40% on token costs. If it's not, that's a significant optimization sitting unrealized.

**The brand-refresh branch has been open for 88+ commits.** The longer a branch lives, the more merge risk accumulates. The v4 design system, dashboard, and dealStore abstraction are all blocked from reaching users until this merges. Branching strategy has improved but the merge cycle still lags the build cycle.

---

### The Honest Summary

You've built production-grade tools faster than most engineering teams build prototypes. The architectural decisions — proxy pattern, shared deal context, data-validated ICP, multi-pass research pipeline — are genuinely sophisticated. These aren't "student project" patterns; they're patterns you'd see in a Series B startup's internal tooling.

The gap between current state and the next level is not creativity or AI prompt design — it's operational rigor: testing, structured error handling, branch discipline, and performance observability. The tools work because you test them manually and fix things fast. At team scale (Manager Hub, multi-rep usage), that stops working.

The backend migration plan in `BACKEND_MIGRATION.md` is the right call and addresses most of the structural gaps. The sequencing in that doc (Clerk first, then dealStore swap, then Blob, then analytics) is correct — each layer unblocks the next.

**The Aimee Conga MSA library is 90% of a deal desk tool that doesn't exist yet.** The `conga_msa_clause_library.json` contains Conga's actual MSA positions on 40+ clauses with risk profiles and verbatim contract language. One dropdown option change and a system prompt swap would give Conga's deal team an AI that reviews inbound customer paper against Conga's actual standards — not generic "market standard." That's a different product category than a general contract reviewer, and it's already built. It just hasn't been wired up.

**The most underutilized asset across all three projects:** The validated ICP data in the Prospecting Agent. That framework — built from 60,000+ real deals — has more leverage than any UI improvement or API optimization. The question worth asking: how does that ICP context get into Znith's Win Room and Qualify IQ, so every deal is evaluated against it — not just the ones where a rep uses the Prospecting Agent first?

---

## Appendix: Project Quick Reference

### Aimee Key Files

| File | What It Does |
|------|-------------|
| `redline-agent/index.html` | Full redline agent (1,240 lines — all logic inline) |
| `conga_msa_clause_library.json` | 40+ Conga MSA v5.0 clauses with risk profiles (553 lines) |
| `redline-agent/clause-library.json` | Generic commercial clause library (standalone JSON) |
| `redline-agent/contexts.json` | 4 legal context system prompts (standalone JSON) |
| `api/claude.js` | Vercel proxy — identical pattern to Znith |
| `vercel.json` | Vercel config |

---


### Znith Key Files

| File | What It Does |
|------|-------------|
| `auth.js` | Password modal + fetch wrapper (204 lines) |
| `api/claude.js` | Anthropic proxy, Vercel (39 lines) |
| `netlify/functions/claude.js` | Anthropic proxy, Netlify (31 lines) |
| `account-brief-v2/index.html` | 6-pass account research |
| `qualify-iq/index.html` | MEDDPICC qualifier |
| `value-map/index.html` | ROI + pricing analysis |
| `demo-brief/index.html` | Meeting prep generator |
| `win-room/index.html` | Deal coach + competitive intel |
| `brand-refresh:shared/znith-tokens.css` | v4 design tokens (224 lines) |
| `brand-refresh:shared/dealStore.js` | Deal data abstraction (196 lines) |
| `brand-refresh:shared/deal-nav.js` | Cross-tool navigation bar (195 lines) |
| `brand-refresh:dashboard/index.html` | Deal hub + pipeline view |
| `brand-refresh:BACKEND_MIGRATION.md` | Architecture roadmap (201 lines) |

### Prospecting Agent Key Files

| File | What It Does |
|------|-------------|
| `index.html` | Current build (Modules 1–4 complete, 5–6 scaffolded) |
| `index-v4.html` | Last stable snapshot before current build |
| `generate_icp_pdf.py` | ICP reference PDF generator (ReportLab) |
| `Conga_PROS_ICP_Structure_v2.pdf` | Full ICP reference document |
| `CLAUDE.md` | Project spec + build order instructions |

### Model Usage Summary

| Tool | Model | Why |
|------|-------|-----|
| Account Brief v2 | Sonnet 4 (claude-sonnet-4-20250514) | Deep research; quality over speed |
| Qualify IQ | Haiku 4.5 (claude-haiku-4-5-20251001) | Fast scoring; structured JSON output |
| Value Map | Sonnet 4.6 (claude-sonnet-4-6) | ROI reasoning; multi-scenario output |
| Demo Brief | Sonnet 4 (claude-sonnet-4-20250514) | Narrative quality matters |
| Win Room | Sonnet 4 (claude-sonnet-4-20250514) | Synthesis across large context |
| Prospecting Agent | Opus 4.5 (claude-opus-4-5) | Complex multi-account reasoning |
