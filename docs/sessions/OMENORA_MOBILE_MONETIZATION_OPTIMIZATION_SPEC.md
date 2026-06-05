# OMENORA Mobile — Monetization Optimization Spec

> **Date:** 2026-06-01
> **Status:** Proposed implementation spec. Derived from (a) the read-only monetization-surface inventory of `release/v1-launch`, (b) cross-category 2026 research (cited inline), and (c) locked strategy (STRATEGY.md, PRODUCT_MAP.md, PLATFORM_BOUNDARY.md, MONETIZATION_SPEC_V4.md). NOT a master document — execution artifact.
> **Constraint that governs everything here:** single Premium tier, hard paywall, no trial (locked). IAPs are consumables tracked in a backend ledger, NOT attached to entitlements (MONETIZATION_SPEC_V4 §6). These changes ADD persuasion machinery and remove friction; none of them re-decide pricing or tier structure.
> **Sequencing note:** Implementation of this spec is gated behind the launch-correctness work (logged-out routing fix, account-deletion merge, device validation). Optimize the app *after* it's submittable. Research and design (this doc) are done now; implementation comes after Track A.

---

## 0. What the inventory found (the starting point)

The app is NOT under-monetized structurally — 14 charge points, paywall triggers on every premium surface, three IAP sheets. The problem is **switched-off and unbuilt tactics**, not missing infrastructure. Four gaps, each addressed below:

1. **Post-purchase upsell: entirely absent.** Five purchase paths, zero follow-on offers — every purchase is a dead end (toast → done).
2. **Anchoring inconsistent.** BoostPackSheet does it well (MOST POPULAR / BEST VALUE / highlighted middle). Calendar and Compatibility sheets have none.
3. **Retention: one daily-horoscope toggle.** No streak, no re-engagement, no win-back, no progress mechanic.
4. **Free-tier "taste" undefined.** The 17f archetype gate is commented out (premium content rendering free); the free-vs-Premium boundary on the tabs isn't deliberately designed.

Each section below: the gap → the research → the specific implementable change → the source code surface.

---

## 1. Post-purchase upsell (highest structural leverage)

### Research basis
The just-paid moment is universally the strongest conversion window: at the moment of purchase "their dopamine levels are at an all-time high; they trust your brand enough to have just given you their money" — yet most flows end in "a generic Thank You page, a digital dead end" (MBC/Shopify 2026). Benchmark take rate for a well-optimized post-purchase upsell is **~10–15%** (Yotpo) — though that's an e-commerce ceiling; iOS will run lower because every purchase routes through the StoreKit sheet (no one-click instant-charge like web). The matching play is named directly: "the Subscription Upgrade: turn a one-time purchase into a recurring subscription" (MBC).

### StoreKit reality (why "credit-applied" is OUT)
Apple has no native mechanism to apply a consumable purchase toward a subscription price; its discounting tools are intro offers and offer codes on the subscription itself (Apple StoreKit / WWDC25). Combined with MONETIZATION_SPEC_V4 §6 (IAPs are unattached consumables by design), **credit-applied upsell is off the table.** The mechanic is **value-reframe**, not price-credit.

### Changes

**1A. Compatibility-single buyer → Premium (value reframe).**
After the compatibility-single purchase succeeds and the reading is delivered, present a dismissible upgrade card → `presentPaywall()`. Reframe: "You unlocked one reading. Premium gives you 10/month + all four readings + Counsel for $14.99 — about $1.50 a reading."
- Surface: `screens/CompatibilityScreen.tsx` success handler (~line 255, after the toast + auto-`handleSubmit`).
- The CompatibilityIAPSheet already contains this exact "10/month" Option-B copy — reuse it as the post-purchase card, not just the pre-purchase alternative.

**1B. Boost-pack buyer → Premium (credits-stack hook — strongest, architecturally free).**
A boost-pack buyer is explicitly paying per-conversation = telling you they want more Counsel. The honest, architecture-true pitch (MONETIZATION_SPEC_V4 §3 guarantees credits persist and burn *after* the monthly allowance): "You bought 15 conversations. Subscribe → 30 every month, and your 15 stack on top — nothing lost."
- Surfaces: `screens/tabs/CounselScreen.tsx` boost success (~line 107) and `screens/counsel/CounselChatScreen.tsx` boost success (~line 304).

**1C. Calendar buyer → Premium. Lower priority.** Weaker subscription signal than Counsel/compatibility. Build last; same pattern.

### Guardrails (research-flagged failure modes)
Post-purchase upsell drives refunds/annoyance when it (a) interrupts delivery of the thing just bought, or (b) repeats every purchase. So: **deliver first, offer second, dismissible**, and **frequency-cap** — don't re-pitch a user who recently dismissed. A first-time buyer and a repeat buyer "are in different mental spaces and should see different offers" (Wiser) — a 2nd-time IAP buyer who hasn't converted gets the offer less aggressively.

---

## 2. Offer-sheet anchoring (apply what BoostPackSheet already proves)

### Research basis
Three-tier good-better-best with the target in the middle is the industry standard: a 3-tier model sees a **40% lift in signups vs single-price**, and **~60% of customers select the middle option** (Kard). Decoy effect (a deliberately weaker option that makes the target obviously superior) increases target selection **30–45%** (Duke 2025, via LaunchMyStore); anchoring + decoy + center-stage together can move conversion **25–60%** (Adapty). Mechanism mapping (DigitalApplied 2026): tier order → anchoring; "Most Popular" badge → social proof + default signal; price ending in 9 → charm perception. Photo/video paywall study of 1,200 paywalls: annual-discount badges ("Save X%") work as **psychological anchors** regardless of the real saving.

### Changes

**2A. CalendarIAPSheet + CompatibilityIAPSheet — add the anchoring the BoostPackSheet has.**
Both currently show two flat options (one-time IAP + "see subscription plans") with no badge, anchor, or comparison. Add:
- A **value-comparison line** on the subscription option: e.g. on CompatibilityIAPSheet, "$4.99 once vs 10/month with Premium" — make the per-unit math visible (the BoostPackSheet omits per-unit math too; add it there as well).
- A **badge/visual hierarchy** elevating the subscription option as the better deal (the sheets currently bury it as a tertiary button). Research says the target option gets the badge + visual weight, not the cheaper one-time.
- Surfaces: `components/molecules/CalendarIAPSheet.tsx`, `components/molecules/CompatibilityIAPSheet.tsx`. The pattern to copy is `BoostPackSheet.tsx` (eyebrows, `recommended` flag, accent-color emphasis on the target).

**2B. The subscription paywall itself (RevenueCat dashboard — NOT code).**
The three-plan paywall (weekly $5.99 / monthly $14.99 / annual $99.99) is dashboard-configured and was not auditable from the repo. Apply the same principles in the RevenueCat paywall editor:
- **Anchor + center-stage:** present annual as the value anchor, monthly as the center-stage default with a "Most Popular" badge.
- **Annual discount framing:** show the annual saving as a "Save X%" badge (anchor effect).
- Charm pricing is already in place ($X.99).
- This is a config task, listed in the handoff's RevenueCat-config item — flagged here so it's done with intent, not defaults.

---

## 3. Retention / re-engagement (thinnest surface; the LTV lever)

### Research basis
Day-30 retention averages **only 5–7%**, but "if someone stays 30 days, they're far more likely to stay 90+" — that's where LTV becomes real (Enable3). A **5-point day-30 retention gain ≈ 20–30% improvement in 6-month LTV** (PM Toolkit). The mechanics that work, across categories: streaks and timed quests give a **1.5x session-length increase** via loss aversion (Adjust/StriveCloud); push notifications increase subscriptions **14%** (MarketingLTB) but only when specific — "where to pick up," not "we miss you" (Airbridge). Win-back: structured campaigns for 7- and 30-day-lapsed users recover **10–20%** of lapsed users (PM Toolkit). The discipline: "push notifications alone rarely save you — if coming back doesn't feel rewarding, users won't" (Enable3).

### Changes (prioritized — this is where the app has the most to gain and the least built)

**3A. Daily-return mechanic on the Today tab.** The daily content already exists and refreshes (TodayScreen). What's missing is a *reason to return*. Lightest effective option: a **streak / "days reflected" counter** tied to opening the daily reading — loss-aversion progress, the Headspace/Duolingo pattern. Avoid heavy gamification (off-brand for a contemplative astrology product); a quiet "you've checked in N days" is enough. Surface: `screens/tabs/TodayScreen.tsx` + a persisted counter in profileStore.

**3B. Specific push notifications, not generic.** The push infra exists (registration → `/api/notifications/register`), but content is server-side and currently just a daily-horoscope toggle. Make the daily push *specific*: reference the user's actual sign/archetype and today's content ("Your archetype's reading for today is ready"), not "open OMENORA." Server-side work.

**3C. Win-back for lapsed users (post-launch, server-side).** 7-day and 30-day lapse triggers with a specific re-entry message. Highest ROI on *drifting subscribers* (still paying, gone quiet) — re-engage before they cancel. Defer to post-launch; note it now so it's planned.

### Honesty flag
Retention mechanics are the **highest-effort, longest-payoff** items here and most are server-side or net-new UI. For v1 launch, 3A (streak) is the only one worth building pre-launch; 3B/3C are fast-follows. Don't let retention work block submission.

---

## 4. Free-tier "taste" design (resolves the 17f gate question)

### Research basis
The core tension, stated precisely: "the free tier must deliver enough value to hook users — but the premium tier must feel meaningfully better, not just marginally" (Codazz). Free must reach the "aha moment" or users never convert (Rework); but "you can't give away everything — you need limits users hit naturally" (Rework). The highest-converting paywall trigger is **the moment of maximum intent — when the user is mid-action trying to do the exact thing premium enables** (Codazz). Avoid paywalls on first open, after errors, or mid-onboarding (Codazz). Consumer freemium converts **2–5%** typically (FunnelFox/Codazz), so the free tier's job is partly acquisition/word-of-mouth, not just conversion.

### The design decision for OMENORA
This is the one place strategy and research must be reconciled deliberately, because the locked model is a **hard paywall** — which means the free "taste" is intentionally thin. The question isn't "freemium vs hard paywall" (decided), it's "what minimum free taste makes the hard gate create *desire* rather than *resentment*."

Apply against PLATFORM_BOUNDARY §3.2 (which already defines the free/premium line) + the merged MONETIZATION_SPEC_V4:
- **Free taste = the daily zodiac + the Big Three reveal during onboarding.** That's the aha moment — the user sees their real chart computed, free, before the gate. This is correct and already built (the reveal precedes the paywall).
- **17f archetype gate: turn it ON.** Per PLATFORM_BOUNDARY §3.2, the daily *archetype* insight is Premium; it currently renders free (commented-out LockedCards). Restoring the gate is *correct* — but the design choice is *how much* archetype content to show as the locked teaser. Show enough to create desire (the theme/headline), lock the depth (the full insight, dimensions). The LockedCard pattern for exactly this is already written and commented out in `screens/tabs/TodayScreen.tsx:257-274` (`feature_archetype_today`, `feature_dimensions_today`).
- **Paywall timing:** the strongest trigger is mid-intent. The ReadingsScreen LockedCards (user actively wants a reading) and the Counsel CTA (user wants to chat) are correctly placed at maximum intent. Good. The one to verify is the onboarding `PremiumTeaser` placement (see handoff §5 conversion audit) — it sits after the 3-question quiz, which may dilute the reveal's peak.

### Change
**4A. Switch on the 17f gate** with a deliberate teaser/lock split (theme shown, depth locked). Surface: uncomment + complete `screens/tabs/TodayScreen.tsx:257-274`, scope the free-vs-locked content per MONETIZATION_SPEC_V4. This is both a strategy-compliance fix (PLATFORM_BOUNDARY §3.2) and a conversion lever (creates the daily desire that the paywall captures).

---

## 5. Prioritized implementation order (when Track A clears)

Ranked by leverage-to-effort, additive-revenue-first:

1. **1B — Boost-pack → Premium upsell (credits-stack).** Highest intent, architecturally free, small surface. Do first.
2. **4A — Switch on the 17f gate.** Compliance + daily-desire lever; code already written (commented). Small.
3. **1A — Compatibility → Premium upsell.** High intent; reuses existing sheet copy.
4. **2A — Anchoring on Calendar + Compatibility sheets.** Copy the BoostPackSheet pattern. Medium.
5. **3A — Today streak/return mechanic.** Net-new UI; highest retention payoff pre-launch.
6. **2B — RevenueCat paywall anchoring (dashboard).** Config, not code; do alongside RevenueCat product setup.
7. **1C — Calendar → Premium upsell.** Lowest-signal path. Last.
8. **3B / 3C — Specific push + win-back.** Server-side fast-follows, post-launch.

Each change is independent and ships behind no feature flag dependency on the others. Each should get a device-validation pass on the purchase/gate path it touches.

---

## 6. What this spec deliberately does NOT do

- Does NOT add a trial (locked: no trial; Adapty SOIS — trials reduce LTV 21.2% in this category).
- Does NOT add tiers or change the single-Premium structure.
- Does NOT build a credit-applied upgrade (StoreKit + architecture both preclude it).
- Does NOT make the free tier generous (hard-paywall model is locked; free taste is intentionally the reveal + daily zodiac only).
- Does NOT add heavy gamification (off-brand for a contemplative product; a quiet streak only).

---

## 7. Honest limitations of this spec

- **Benchmarks are cross-category, not OMENORA's.** The 10–15% upsell take rate (e-commerce), 60% middle-tier selection, 14% push lift — these are directional, calibrated from other apps. iOS upsell will run below the e-commerce ceiling. Real numbers come only after launch with your own install→reveal→paywall→subscribe→retain funnel. Treat every number here as "which direction and roughly how much," not a forecast.
- **The biggest unknown is the RevenueCat paywall** (§2B) — it's where the actual subscription sells and it's invisible to code audit. Its configuration may matter more than everything else in this doc combined. Audit it in the RevenueCat dashboard before assuming the in-app surfaces are the bottleneck.
- **Retention (§3) is the highest-effort, slowest-payoff area** and mostly server-side. Build 3A pre-launch; everything else is a measured fast-follow once there are users to retain.
