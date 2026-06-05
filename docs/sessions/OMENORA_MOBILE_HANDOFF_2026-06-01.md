# OMENORA Mobile — Session Handoff & Continuation Brief

> **Date:** 2026-06-01
> **Purpose:** Resume the next session at full speed without re-deriving today's branch topology or decisions.
> **Status of this doc:** Working handoff — NOT a master document. Does not belong in `docs-V1/` (it's an execution/session artifact per CONTEXT.md §8). Lives alongside code or in conversation.

---

## 1. Exact repository state (verify first thing next session)

Monorepo at `/Volumes/ESSD/Projects/Augur-V1/`, single `.git` at root. Both `augur/` (backend) and `mobile-app/` live in it.

| Branch | SHA / state | What it holds |
|---|---|---|
| `main` | `35b815c` (HEAD) **+ uncommitted working-tree changes** | Railway deploy branch (LIVE web backend). Two committed-undeployed backend commits below, plus the **uncommitted BaZi rebuild**. |
| `release/v1-launch` | `90c85e0` | Mobile spine merged. The launch app branch. Cut from main. |
| `feature/phase-5-counsel` | `7bb3c08` | Source of the spine (already merged into release branch). |

### Committed on `main`, NOT yet deployed (founder triggers Railway deploy):
- `f0c75e6` — `feat(counsel): bring back real Claude implementation (was stub)`. Counsel endpoint is now real (claude-sonnet-4-6, dual premium/credit gate). **Web does not call it — safe.**
- `35b815c` — `feat(compat): add credit-or-premium access path, keep deterministic score`. Deterministic score UNCHANGED (live web depends on it); added dormant credit branch for mobile IAP. No-access still 403s (paywall intact, verified).

### Uncommitted on `main` working tree (the open thread):
- `augur/server/api/generate-report.post.ts` — **BaZi rebuild, complete, math internally validated, NOT committed.** Awaiting external verification (§4). Do `git status` to confirm it's still there; if the tree was reset, the rebuild must be re-done.

### Mobile spine merge `90c85e0` — what landed:
- IAP/purchase wiring intact: `BoostPackSheet`, `CalendarIAPSheet`, `CompatibilityIAPSheet`, `purchasePackage`/`purchaseStoreProduct`, `restorePurchases`, Counsel screens, ReadingsScreen, CompatibilityScreen.
- 11 conflicts resolved: 9 mobile design files standardized to **main's locked dark token system** (granular `surface.deep` style, NOT `tokens.*` namespace); 2 augur files (`counsel/message`, `generate-calendar`) resolved to main.
- WelcomeScreen hydration logic ("Decision 8" — `profileHydrated`/`hydrationTimedOut` triple-check) preserved from clean merge.
- `MONETIZATION_SPEC_V4.md` now present in the merged tree (`mobile-app/docs/`) — use it for the free-vs-Premium boundary work.

---

## 2. Hard gates — nothing ships past these

1. **Anthropic API key in Railway production.** The real Counsel endpoint calls Claude. If the key isn't in Railway's augur env, Counsel **crashes on first message** in production. `tsc` cannot catch this. Confirm before any deploy: Railway → augur service → Variables.
2. **BaZi external verification before committing the rebuild** (§4). Internal validation passed; stems are unverified against an authoritative source.
3. **Deploy is founder-triggered.** The two backend commits are additive and safe to deploy whenever (gated only on #1), but Railway does not auto-deploy on commit.

---

## 3. Launch-readiness checklist

**Done today:**
- [x] Branch topology mapped; `develop` confirmed dead (200 behind main); 5 disjoint feature branches identified.
- [x] `release/v1-launch` cut; phase-5-counsel spine merged (`90c85e0`).
- [x] Backend reconciliation: Counsel real, compatibility credit-graft, reports confirmed already-real on main (the "6-file surface" collapsed to 2 real edits).
- [x] BaZi rebuild written + internally validated (pending external check).

**Remaining before submittable (rough priority):**
- [ ] **Conversion-architecture audit + redesign** (§5) — the money question. Next session's focus.
- [ ] Verify + commit BaZi (§4).
- [ ] **Logged-out routing bug** (§6) — App Review risk.
- [ ] **17f archetype gate** — archetype-Today renders free, violates PLATFORM_BOUNDARY §3.2; LockedCards commented out. Restore per `MONETIZATION_SPEC_V4.md`.
- [ ] Merge `feature/phase-6-cluster-2` — **account deletion (Apple Guideline 5.1.1(v) MANDATORY)**. Also cluster-3, 4a, 4c-bis-2, the 6.6 Sentry clusters — triage which carry must-have launch content.
- [ ] Device validation: every purchase path, auth flow, account deletion, Counsel round-trip.
- [ ] RevenueCat dashboard config: products + offerings + paywall (the native paywall is empty until configured).
- [ ] App Store listing assets: screenshots + description (both empty in App Store Connect).
- [ ] Deploy backend to Railway (after gate #1).

---

## 4. BaZi rebuild — verification owed before commit

The rebuild replaced the hand-rolled date-arithmetic with sweph-based solar-term computation. **All four pillars validated internally; one bug (month branch collapsing to `Mao`) was found via the validation table and fixed** by switching to direct sun-longitude → 30°-band mapping.

Internal validation that passed:
- Year: Lichun (315°) boundary — pre-Lichun births correctly roll to prior year.
- Month: six distinct seasonal branches; solstices land exactly on `Wu` (90°) and `Zi` (270°).
- Day: sexagenary count, offset corrected `-11`→`-10`, cross-checked against 1970-01-01 = Ren-Xu.
- Hour: computed from local clock time when present; `null` when birth time absent (prompt then claims 3 pillars, not 4).

**v1 limitation (documented, not a bug):** hour pillar uses **local clock time, no longitude/true-solar adjustment** — because only a `city` string reaches the backend (no coordinates/timezone). Upgrade path = add geocoding + tz resolution later.

**Owed: external check against an authoritative BaZi calculator** (set to standard/local time, not true-solar). Two test dates:
- `2000-05-15 14:30` → our output: Year **Geng Chen**, Month **Xin Si**, Day **Gui You**, Hour **Ji Wei**.
- `2000-06-21 12:00` → run and compare all four.
Branches are astronomically verified; the **stems** (Five Tigers month-stem, Five Rats hour-stem tables) are what the external check validates. If a stem is off → localized table fix → re-validate → commit. If both dates match → commit to main.

---

## 5. NEXT SESSION GOAL — Conversion-architecture audit

**The reframe that matters:** everything done today made the app *work*. None of it touched whether the app is *built to sell*. That is the money question and it's the goal.

**Explicitly NOT in scope — and why:** do **not** replicate the website quiz on mobile. Per locked strategy, the two surfaces do different jobs — web quizzes *acquire* (long, hook a cold stranger, extract email/payment); mobile *onboards someone who already converted* (get to value fast, hit the paywall at peak desire). A 25-question quiz on mobile adds friction exactly where momentum is needed. Different surface, different goal.

### 5.1 The actual flow as audited (this is what we're optimizing)
```
Splash → Welcome → Name → DateOfBirth → BirthCity → BirthTime
  → Calculating → BigThreeReveal → SaveYourReading (auth)
  → OptionalQuestions (3-q) → PremiumTeaser → MainTabs
```

### 5.2 Facts already established (not hypotheses)
- **Welcome screen** = "Sign In / Begin" only. No value proposition, no product preview, no reason-to-believe before the ask.
- **PremiumTeaser** (the paywall pitch) sits AFTER both the BigThreeReveal *and* the 3-question OptionalQuestions — i.e. there is a quiz between the "wow" moment and the ask.
- **Subscription paywall** = `RevenueCatUI.presentPaywall()` native sheet — presentation/anchoring is RevenueCat-dashboard-controlled, not in app code.
- **Model is correct:** single Premium sub (weekly $5.99 / monthly $14.99 / annual $99.99), hard paywall, no trial; all readings + traditions + Counsel included; no per-switch charge (verified). IAPs and Counsel packs layer on top.

### 5.3 Research basis (2026, named sources — for grounding, not decoration)
- **Hard paywall is right for revenue, IF onboarding earns it.** RevenueCat *State of Subscription Apps 2026*: hard paywall median Day-35 trial-to-paid **10.7% vs 2.1% freemium (~5x)**; retention difference negligible (27% vs 28%); RPI ~8x higher at day 60. Adapty *State of In-App Subscriptions 2026*: hard-paywall users **+21% 1-year LTV**.
- **Why no trial (already locked, this confirms it):** Adapty SOIS Lifestyle category — trial users generate **21.2% lower LTV** than direct buyers; the one category where trials *reduce* LTV.
- **Onboarding must build value before the gate.** RevenueCat 2026: "if a paywall appears before context is established, it feels jarring; when onboarding builds momentum first, conversion looks very different." Value-trigger principle: present the paywall *at the moment of measurable value*.
- **Price is justified by perceived value.** RevenueCat: high-priced apps convert downloads **2x** better than low-priced (2.8% vs 1.4%) — only holds if the value stack supports the price.
- **Friction kills conversion.** 2026 elite standard: one-tap Apple/Google sign-in, minimal form fields, **<2 taps after the paywall appears**.
- **Regional/PPP pricing** lifts conversion **40–60%** in localized markets — relevant to the LATAM/Turkey/Balkans TikTok targeting in STRATEGY.

### 5.4 Audit questions to answer next session (code-anchored, each maps to a decision)
1. **Welcome value prop:** should Welcome preview what's inside / set up value before "Begin," rather than a bare auth choice? (Research: build momentum/trust first.)
2. **Paywall placement vs peak desire:** the BigThreeReveal is the "wow" asset. Does the paywall capture that peak, or does the 3-question OptionalQuestions screen sit *between* the reveal and the ask, diluting it? Measure against the value-trigger principle.
3. **OptionalQuestions ROI:** does the 3-q quiz (life focus / tone / familiarity) add enough personalization value to justify friction at the worst possible moment (right before the paywall)? Or move it post-subscription?
4. **Does the pre-paywall sequence earn the hard gate?** A hard paywall on a flow that hasn't built desire is the worst of both worlds. Is the reveal leveraged hard enough?
5. **Free-vs-Premium experience on MainTabs:** what does a non-subscriber actually see? Too much locked = punitive; too much free = no reason to pay. Resolve against `MONETIZATION_SPEC_V4.md` + the 17f gate.
6. **Sign-in friction (SaveYourReading):** is one-tap Apple/Google present and primary? How heavy is the email-OTP path?
7. **Paywall presentation (RevenueCat dashboard):** plan anchoring — is annual the "best value" default, weekly visible? <2 taps to purchase? (Ties to the RevenueCat config task.)

---

## 6. Known defects log

- **Logged-out routing bug.** Root routing keys off persisted Zustand profile fields (`archetype`/`dateOfBirth`/`sunSign` in AsyncStorage), not a real resolved session. Stale local data from a prior user/onboarding routes a no-session user straight to MainTabs. **Diagnosed, unfixed.** App Review risk (fresh-install test) + data-integrity risk. Fix is auth-state logic — do it on the integrated `release/v1-launch`, not in isolation.
- **17f archetype gate disabled** (see §3).
- **Tradition-switch copy** reads "Unlock Tradition Switching" — can be misread as a per-tradition charge though it's just the one subscription. Clarity fix, not a money bug.
- **Latent web/backend divergence:** `generate-report.post.ts` differs between `main` (deployed) and `feature/b1-pricing-alignment` (live web feature lineage). Watch for a separate web-backend integration question; not today's fight but don't let it ambush a future deploy.

---

## 7. Open founder decisions

- **Apple account: Individual vs UNCC Inc.** Paid Apps Agreement is **Active under Individual** (Miroslav Jokovic), bank + W-9 active, 175 countries. So: can launch as Individual *now* (fastest to revenue; income lands personally; converting after a live paid app exists is messier) OR convert to UNCC Inc. first (clean corp structure; delays revenue by Apple's conversion timeline). Recommendation leaned Individual-now for a pre-revenue app, but it's a tax/liability call — worth a quick check with whoever handles taxes. Does NOT block code work; only gates the final submit.
- **BaZi:** ratified to fix properly (done; pending external verification per §4).

---

## 8. Working discipline that held today (keep it)
- Read-gated prompts: read-only verify → edit → diff → stop before commit.
- Founder runs all destructive git ops; every commit prompt starts with `git branch --show-current`.
- Validate math against known references, not just `tsc` (this caught the BaZi month bug).
- `main` is LIVE — backend edits there ship to web on next deploy. Treat accordingly.
- Documents win over code; if conflict, code is wrong.
