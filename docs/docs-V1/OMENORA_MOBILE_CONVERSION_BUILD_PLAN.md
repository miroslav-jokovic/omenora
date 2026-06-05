# OMENORA Mobile — Conversion & Money-Machine Build Plan

> **Status:** PROPOSED — awaiting founder ratification.
> **Provenance:** Synthesized from three read-only audits (Journey/Activation, Retention Infrastructure, Measurement/Referral) run on `release/v1-launch`, the money-machine checklist, and 2026 research (RevenueCat State of Subscription Apps 2026; Adapty; subscription-commerce and retention benchmarks; conversion-psychology and FTC dark-pattern guidance).
> **What this is NOT:** a `docs-V1/` master document. This is an implementation execution plan and lives alongside code, per CONTEXT.md §8. Once items here are built and ratified, the resulting *screen decisions* flow into `MOBILE_SCREENS.md` (the pending master doc); the execution breakdown stays out of `docs-V1/`.
> **Governing principle:** engineer *desire*, never *regret*. Every item makes a user **want** something by showing real value in sequence; nothing tricks, shames, or obstructs (FTC/Apple-safe, refund-resistant, retention-positive).

---

## 1. The one-sentence diagnosis

**The hard infrastructure is built; the last-mile value-wiring that turns it into money is missing — and the same pattern repeats across all three audits.**

Evidence (audit → finding):
- Push **tokens captured and stored**, delivery pipeline **absent** (A2/R1).
- Inngest lifecycle **engine running**, pointed **only at web**, not app users (A2/R4).
- Best conversion **copy written** (PremiumTeaser, Readings cards), **locked inside onboarding** / never re-shown (A1/J3, A2/R5).
- Deep-link **plumbing laid** (universal links, intent filters, scheme, URL listener), **routing unwired** (A3/M6).
- Viral feature (Compatibility) **built**, share button a **`TODO`** (A3/M5).
- Crash monitoring **done** (Sentry), product analytics **absent** (A3/M1).

**Implication:** this is mostly a *wiring-up and sequencing* job, not a redesign. That is a far better position than greenfield — the expensive parts exist.

---

## 2. What is already strong — DO NOT break

| Asset | Why it matters | Source |
|---|---|---|
| Daily content loop (date-keyed cache; content visibly changes) | The #1 retention asset — a real reason to return, and material to notify about | A2/R2 |
| Sentry crash monitoring (wired, PII-scrubbed, `Sentry.wrap`) | Launch table-stakes; already done | A3/M3 |
| Dark-pattern hygiene (every decline neutral/factual/positive) | FTC/Apple-safe; refund-resistant | A1/J7 |
| Three-tier hard paywall, no trial (weekly/monthly/annual) | Hard paywall converts ~5× freemium; three-tier captures ~60% more revenue; annual churns ~40% less | RevenueCat SOSA 2026; subscription-commerce 2026 |
| SPECIFIC copy where it exists (Readings, Calendar, PostPurchaseUpsell, PremiumTeaser) | Proves the team can write desire-copy; reuse the pattern | A1/J6 |
| Compatibility as a natural viral loop (needs a 2nd person) | Highest-leverage organic growth once the share loop is built | A3/M5 |

---

## 3. The ranked build list

Each item: the deficit it fixes (audit ref), the lever/data behind it, the strategy lock it serves, effort, and horizon. Ranked by leverage within each horizon. Horizon = **NOW** (submittable codebase, copy-weighted, low risk) / **PRE-ADS** (foundational wiring before any ad spend) / **V1.1** (compounding builds, not launch-gating).

### Horizon NOW — activation & value-legibility (copy-weighted, mostly `tsc`-safe)

| # | Item | Fixes (audit) | Lever / data | Effort |
|---|---|---|---|---|
| **A1** | **Reveal opens loops.** On BigThreeReveal, add curiosity copy that names what the user *can't yet see* (shadow, the other 7 planets, timing, patterns) at the peak emotional moment — instead of deferring it two screens to PremiumTeaser. | A1/J3 | Curiosity/open-loop copy averages ~10% CTR vs ~4% for straight CTA; the aha moment is where Day-0 conversion is decided (55% of Day-0 cancels) | Copy |
| **A2** | **Welcome orientation.** Rewrite the cold-open so a brand-new user understands *what OMENORA is* and *what they'll receive*, with a revelation promise that creates pull. | A1/J1 | "Welcome sets tone and context in one breath"; value-first framing before data collection; 1 in 4 apps is opened once and never again | Copy + light layout |
| **A3** | **Locked-card specificity (Today).** Rewrite the two vague Today cards ("Your Full Daily Reading", "Today's Life Dimensions") to name concrete deliverables, matching the Readings cards' pattern. | A1/J4, J6 | Specificity-as-proof; the pre-launch substitute for social proof (which OMENORA cannot fabricate) | Copy (quick win) |
| **A4** | **"Why we ask" microcopy on data steps.** Give each onboarding data ask a one-line reason — especially **BirthCity** (highest friction, currently zero reason). | A1/J2 | Permission/ask-in-context with stated reason reduces drop-off; progressive profiling norm | Copy |
| **A5** | **Free-home first-run orientation.** A light "here's what's free / here's what unlocks / start here" moment for a first-time free user on Today (dismissible, non-blocking). | A1/J4 | Progressive onboarding teaches in context; reduces immediate post-onboarding churn | Light build |
| **A6** | **BoostPack "what is a conversation" line.** Add a one-line description of what a Counsel conversation delivers (currently sold by quantity only). | A1/J6 | Turns a utility purchase into a desire purchase; expansion revenue | Copy (quick win) |

### Horizon PRE-ADS — foundational wiring (between submission and ad spend)

| # | Item | Fixes (audit) | Lever / data | Effort |
|---|---|---|---|---|
| **W1** | **Product analytics + event taxonomy.** Install an analytics SDK; instrument the funnel (onboarding steps, reveal, paywall_viewed w/ source, purchase, daily-return). Wire the existing "Share anonymous usage data" toggle to it. | A3/M1, M2 | **Blocks the ads phase entirely** — you cannot measure CAC, LTV, or which funnel/paywall produced a payer; experimenting teams earn up to 40× more revenue | Build (med) — **FOUNDATIONAL** |
| **W2** | **Deep-link routing config.** Add NavigationContainer `linking` (URL→screen map) so a push tap or shared link can route to a specific screen. | A3/M6 | Cheap **shared unlock** under W3, W6, W7 — build once, three features become possible | Build (small) — **FOUNDATIONAL** |
| **W3** | **Notification delivery pipeline.** Backend function reads `push_tokens` and sends the daily horoscope push (the toggle already promises this); tap routes via W2. | A2/R1 | Push notifications increase subscriptions ~14%; between-session engagement cuts churn 40–60%; you already generate the daily content | Build (backend, med) |
| **W4** | **Surface the buried funnels.** In-context entry points to Compatibility & Calendar from Today/Readings (not just the More settings list), with a desire-creating teaser. | A1/J5 | Three revenue features are currently discoverable only in settings; AI apps churn 30% faster so every revenue surface must be findable | Build (med) |
| **W5** | **Returning-free-user conversion surface.** Re-present the strong PremiumTeaser copy (or an equivalent) to returning free users — today they see only the two locked cards, identical on day 1 and day 100. | A2/R5, A1/J3 | The best copy is locked in onboarding; returning visits are the habit asset wasted on the weakest copy | Build (med) |
| **W6** | **Paywall attribution.** Pass a placement/source tag at each of the 12 paywall triggers into analytics (W1) and/or RevenueCat subscriber attributes. | A3/M2 (the deferred #4) | Per-surface conversion attribution; zero rework when RevenueCat Targeting lands in v1.1 | Build (small, depends on W1) |
| **W7** | **Install attribution / MMP.** Add a measurement partner (or platform SDKs) so paid TikTok/Meta ROAS is measurable. | A3/M4 | LTV must exceed 3× CAC to scale safely — unmeasurable without install attribution; required **before** ad spend | Build (med) |

### Horizon V1.1 — compounding builds (not launch-gating)

| # | Item | Fixes (audit) | Lever / data | Effort |
|---|---|---|---|---|
| **V1** | **Compatibility share/referral loop.** Build the share affordance on the compatibility result (the `TODO`): shareable result + invite the other person; depends on W2 + a share-image. | A3/M5 | Referral mechanics lift subscription growth ~31%; this is OMENORA's natural viral loop | Build (med) |
| **V2** | **Streaks / progress / momentum.** Daily-return streak + insight history (needs the `daily_user_insights` table — currently a `TODO`). | A2/R3 | Streaks/progress convert Day-7 curiosity into Day-30 habit (Duolingo/Headspace); usage churn is the #1 cancel reason | Build (large, greenfield) |
| **V3** | **Win-back / lapsed re-engagement.** Point the existing Inngest engine at app users: detect lapse, send a return nudge (email/push), optional win-back. | A2/R4 | Reactivation is a named growth metric; the engine already exists, just web-pointed | Build (backend, med) |
| **V4** | **Counsel depth: cross-session memory + streaming + 60-sec aha.** Mem0 for memory, native Claude streaming, one real Counsel exchange before the wall. (Banked from the chat-research analysis.) | Chat research | Value-before-commit triples willingness-to-pay (STRATEGY §11); AI apps churn 30% faster so retention via real utility matters most | Build (large) |

---

## 4. Dependency graph (sequencing constraints)

- **W1 (analytics)** is foundational → **W6** (paywall attribution) depends on it.
- **W2 (deep-link routing)** is foundational → **W3** (push tap), **V1** (shared link), and marketing deep links all depend on it. Build W2 early; it is small and unblocks three things.
- **W7 (install attribution)** must exist **before any paid ad spend**, not before submission.
- **V1** depends on **W2** + a share-image capability.
- Horizon NOW items are largely independent of each other (parallelizable copy) — sequence by funnel position.

---

## 5. Horizon summary — honest scope

- **NOW (A1–A6):** ships in the submittable codebase. Mostly copy + two light builds. Highest immediate conversion ROI, lowest risk. This is "today/this-week" work.
- **PRE-ADS (W1–W7):** the wiring that makes the machine measurable and sticky. **Not** submission-gating, but **gates the paid-ads phase** — must exist before ad spend. This is the real "money machine" assembly, done between App Store submission and turning on TikTok/Meta.
- **V1.1 (V1–V4):** compounding growth builds. Real work, real upside, none launch-gating.

The codebase can be **submission-ready** after the NOW batch + the manual/RevenueCat layer. The **money machine** is fully wired after PRE-ADS. Conflating these is the scope error to avoid.

---

## 6. Founder decisions owed (gate specific items)

1. **Ratify this plan** (rank + horizon buckets) before any build.
2. **Ratify copy direction** per NOW item (A1–A6) — screen copy is a founder call; I propose, you approve, same as the legal copy and PremiumTeaser.
3. **Analytics tool choice (W1)** — PostHog / Amplitude / Firebase / etc. (drives the SDK).
4. **MMP choice (W7)** — AppsFlyer / Adjust / Branch / platform SDKs.
5. **Weekly price** (STRATEGY §11, $5.99 vs ~$6.99–7.99) — needed before RevenueCat product creation regardless.

---

## 7. Implementation checklist — the steps we will follow

### Phase 0 — Ratify (no code)
- [ ] Founder ratifies the ranked plan and horizon buckets (§3).
- [ ] Founder ratifies the order of the NOW batch (default: A1 → A2 → A3 → A4 → A5 → A6, funnel-position order).
- [ ] Note open founder decisions (§6) — none block the NOW batch except per-item copy ratification.

### Phase 1 — Execute Horizon NOW (one item at a time)
For **each** A-item, follow the established protocol:
- [ ] **Read-gate** if the screen's current shape isn't already confirmed (read-only Windsurf prompt; report only).
- [ ] **Propose copy/approach** in chat → **founder ratifies** (copy is a founder call).
- [ ] **Build prompt** (plain-English WHAT/WHY; explicit file paths; `gestureEnabled`/structure untouched unless specified).
- [ ] **Gate:** `npx tsc --noEmit` exit 0; `git diff --name-only -- mobile-app/src/` shows only the intended file(s); diff-size sanity.
- [ ] **Device check** only if the item touches routing/native/auth (most A-items are static copy → `tsc` + visual glance suffices).
- [ ] **Commit** held locally: explicit paths only, `git diff --cached` check before *and* after staging, multi-line message via temp file + `git commit -F`, never `git add -A`, never touch the `.windsurf/.devin` renames.
- [ ] **Report** hash + `git show --stat HEAD`; nothing pushed.
- [ ] Close the item before opening the next.

### Phase 2 — Write MOBILE_SCREENS.md (master doc)
- [ ] After the NOW batch commits, capture the ratified screen copy/structure decisions into `MOBILE_SCREENS.md` (the pending master doc, M2 in CONTEXT.md). Born from ratified decisions, not speculation.
- [ ] Reconcile the known doc drift in the same pass: PRODUCT_MAP §6.3 stale `$12.99 Full Oracle` row; PRODUCT_MAP §5 stale "Counsel 30/day" (code is 30/month — verified); free-tier taste matches PLATFORM_BOUNDARY §3.2; annotate 14-day refund as web-only.

### Phase 3 — Manual / RevenueCat layer (founder keyboard — submission gate)
- [ ] RevenueCat dashboard: create 3 subs + 2 IAPs + 3 boost packs; configure offerings + anchored paywall; **create subscriptions with NO intro trial**.
- [ ] Swap test RC key → production key (hard rejection gate).
- [ ] App Store Connect: create IAP/subscription products; listing assets (screenshots, description, app-preview video).
- [ ] Anthropic API key in Railway prod (Counsel crashes without it) → then founder-triggered `main` deploy (carries the committed Counsel/compat/BaZi commits).
- [ ] Full device-validation sweep.
- [ ] Apple account decision (Individual vs UNCC Inc.).
- [ ] **Submit.**

### Phase 4 — Execute Horizon PRE-ADS (before any ad spend)
- [ ] **W1 analytics first** (foundational) → then **W2 deep-link routing** (foundational, small).
- [ ] Then W3 (push delivery), W4 (surface funnels), W5 (returning-user surface), W6 (paywall attribution, needs W1).
- [ ] **W7 install attribution before the first ad dollar.**
- [ ] Confirm the unit-economics scoreboard is live (LTV:CAC, payback, churn, D1/D7/D30) before scaling spend.

### Phase 5 — Execute Horizon V1.1 (post-launch, by leverage)
- [ ] V1 share loop → V3 win-back → V2 streaks → V4 Counsel depth (or re-rank against live data).

### Cross-cutting discipline (every phase)
- One task closed before the next opens.
- Documents beat code; if they conflict, reconcile explicitly (don't assume).
- Read before edit; diff review before commit; hold locally before push.
- `main` is the LIVE backend — extra care; backend edits ship on next deploy.
- Never fabricate proof; never introduce a confirmshaming/dark-pattern surface.

---

*This plan does not change without an explicit decision. On ratification, the NOW batch begins at A1, and the ratified screen decisions become MOBILE_SCREENS.md.*
