# OMENORA Mobile — Conversion Design Audit

> **Date:** 2026-06-11 · **Type:** Point-in-time audit (input document, not a docs-V1 master)
> **Scope:** Visual + structural conversion optimization of the mobile app, grounded in current code (`mobile-app/src`), the docs-V1 masters, and 2026 industry data (Adapty SOIS 2026, RevenueCat State of Subscription Apps 2026).
> **Governing constraint:** STRATEGY.md locks — hard paywall, NO trial, $5.99–6.99/wk · $14.99/mo · $99.99/yr — are respected throughout. Nothing here re-litigates them. "Engineer desire, never regret" (MOBILE_SCREENS.md) is treated as a hard requirement: every recommendation is FTC/Apple-clean. No fake timers, no fabricated counts, no confirmshaming.

---

## 0. Executive summary

The app's conversion architecture is already strong: open-loop onboarding (Zeigarnik), archetype-personalized paywall hero, annual preselected with a badge, clean decline copy, anchored boost packs with unit pricing. That puts OMENORA ahead of most launch-stage apps.

The gaps are concentrated in **five places**, ranked by expected revenue impact:

1. **The paywall hides the price math.** No per-period equivalence, no savings %, no visual dominance for the selected plan. The single highest-leverage visual fix.
2. **Zero proof at the moment of decision.** No rating, count, or testimonial anywhere on the paywall — the #1 item on every 2026 paywall checklist.
3. **No pre-paywall momentum screen.** "Personalized plan loader" before the paywall is table stakes in 2026 top performers (one documented test: +17% paying conversions, +22% ARPU).
4. **No recovery path for non-converters.** 24-hour post-close welcome offer is the consistent 2026 pattern (+10–15% ARPU), and most users who don't convert on Day 0 never see the paywall again (44.5% of all purchases happen Day 0).
5. **Paid funnels are buried** (known W4/W5 gaps): Compatibility/Calendar live only in the More tab; PremiumTeaser is unreachable after onboarding.

One meta-finding that should shape how this work is sequenced: **visual/copy-only tests have the LOWEST win rate of any experiment type (34.6%), while plan-structure, trial, and localization tests win at ~57–62%** (Adapty 2026). So this audit prioritizes structural-visual changes (price framing, proof, placement, recovery offers) over cosmetic ones (button hue, headline wording) — and recommends remote-config paywalls so iteration doesn't require App Store releases.

---

## 1. What is already right (do not touch)

Verified in code; these match or beat 2026 best practice:

- **CTA color system.** `cta.primary #E8763A` with `#121214` text = **6.31:1** contrast (passes WCAG AA for all sizes; near AAA). Orange-on-dark is the correct high-arousal/high-contrast choice, and the token discipline ("reserved exclusively for purchase actions") is exactly what enterprise design systems do — CTA color stays rare, so it stays loud.
- **Dark canvas + warm cream text.** `#F2EDE5` on `#121214` = 16:1. Premium, OLED-friendly, on-trend for 2026 ("sophisticated muted tones over primary colors").
- **Annual preselected + badge** (`CustomPaywall.tsx`: `useState<PlanKey>('annual')`, `badge: 'BEST VALUE'`). Default-selection is the strongest single nudge on a plan selector; you have it.
- **BoostPackSheet anchoring** — 3 packs, "MOST POPULAR" middle (decoy structure), live "≈ $X per conversation" unit line, never computed from fallback prices. This is genuinely sophisticated; **the subscription paywall should learn from this sheet** (see §2.1).
- **Clean compliance posture.** Auto-renew disclosure, Terms/Privacy links, Restore Purchases, factual decline copy ("I'll come back to my reading"). With FTC dark-pattern enforcement active (76% of subscription apps use at least one dark pattern; Epic paid $245M), being verifiably clean is a moat, not a tax.
- **Hard paywall / no trial.** 2026 data continues to support it for Lifestyle: trial users there are worth 21% LESS than direct buyers; hard paywalls carry 21% higher LTV. Locked correctly.

---

## 2. P0 — The paywall itself (`CustomPaywall.tsx` / `PaywallShell.tsx`)

### 2.1 Show the price math (highest-leverage visual change)

Current plan row: label + cadence + raw price (`$99.99 / per year`). The user is forced to do mental arithmetic, and people do not do arithmetic — they react to framing. Add to the **annual** row:

- Per-period reframe: **"$8.33/mo"** or **"$0.27/day"** (computed live from RC `product.price`, same rule as BoostPackSheet — never from fallback).
- Savings chip: **"SAVE 68%"** vs weekly ($5.99×52 = $311.48 → $99.99) or "SAVE 44%" vs monthly. If weekly moves to $6.99, annual savings become **72%** — print the strongest true number. (Strike-through "was" prices are riskier under FTC fictitious-pricing rules; a savings % derived from your own live plan prices is factual and safe.)
- Monthly row gets nothing extra. Weekly stays as the low-commitment entry. The asymmetry IS the design — this is the per-unit anchoring you already ship in BoostPackSheet, applied to 10× larger basket sizes.

### 2.2 Make the selected plan visually dominant

Current selected state is a 1px bronze border (`planRowSelected: { borderColor: tokens.border.accent }` — `rgba(168,125,78,0.40)` at 40% opacity). That is close to invisible at arm's length. Enterprise paywalls (Calm, Duolingo, Nebula) make the chosen plan unmistakable:

- Selected: 2px `accent.emphasis #C49A5E` border + `accent.subtle` fill + radio check glyph + slight elevation/scale.
- Unselected rows drop to ~85% opacity.
- Selected plan's price renders one type-step larger (`heading1` 24px vs current `heading2` 20px).

### 2.3 Upgrade the badge

Current badge: bronze outline, bronze 11px caps text. `#A87D4E` on `#252528` = **4.15:1** — below the 4.5:1 AA threshold for text that small, and visually whispering. Fix: **filled** chip (`accent.primary` fill, `#121214` text = 5.09:1, larger surface area reads far stronger) positioned to overlap the card's top edge. Test "MOST POPULAR" vs "BEST VALUE" — social-default framing ("most people choose this") consistently outperforms value framing for default plans; keep "BEST VALUE" available for the boost sheet, which already uses both correctly.

### 2.4 CTA: price transparency + never below the fold

- `PaywallShell` is a plain ScrollView. On an iPhone SE/13 mini, hero + 2 benefit paragraphs + 3 plan rows push the CTA below the fold. **Pin the CTA (and one-line legal) to the bottom of the screen**; let content scroll under it. Adapty's 2026 checklist is explicit: the paywall should fit one screen, CTA always visible.
- Under the "Unlock Premium" button add a live microcopy line: **"$99.99/year · cancel anytime in the App Store"** (updates with selection). Price-transparent CTAs raise both conversion quality and App Review comfort; hiding the renewal price near the button is the thing Apple rejects for.
- Keep the label benefit-led ("Unlock Premium" / consider "Unlock my full chart" — possessive labels test well), but the price line below it is the non-negotiable part.

### 2.5 Proof at the decision point

The paywall has **zero** social proof. 2026 checklists put "ratings/testimonials/user count visible on or before the paywall" as the first design question, and the docs' own web research (CONVERSION_SURFACE_ADDENDUM §2) already concluded proof-at-decision is the single largest trust lever. Mobile equivalent:

- A compact proof row between benefits and plan selector: App Store star rating + ratings count (live, once they exist post-launch), or one real testimonial with first name.
- **Honest constraint carried over from the addendum: do not fabricate.** Ship the slot empty at launch; populate from the first real reviews. A fake 4.9★ is both an FTC problem and a conversion reversal when it reads fake.
- Astrology-native trust line already exists ("calculated from your exact birth moment — not a sun-sign guess") on PremiumTeaser — **mirror it on CustomPaywall**, which currently lacks it.

### 2.6 Free vs Premium comparison table

The most consistent paywall addition among 2026 top apps. You have real free tier value (daily reading, moon phase) and a real premium delta (full chart, 90-day forecast, Counsel 30/mo, dimensions). A 5-row scannable table (✓/—, bronze checks) kills the "what do I actually get?" objection without leaving the screen. Render it collapsed behind "See everything inside" if vertical space is tight under the pinned CTA.

---

## 3. P0 — Around the paywall (the funnel IS the paywall)

### 3.1 Pre-paywall momentum screen

Adapty 2026: "a loading screen between the final onboarding question and the paywall — with proof elements while it loads — has become table stakes." Documented case: +8.5% trial starts, **+17% paying conversions, +22% ARPU** (productivity app; US cohort +27%/+35%).

You already have `CalculatingScreen` before the reveal. Add a second, shorter beat between OptionalQuestions and PremiumTeaser: *"Reading your full chart… · Mapping all 10 planets · Preparing your 90-day window"* with the user's actual placements ticking in. It makes the paywall feel like the delivery of completed work, not an interruption — and it's 100% truthful (the work is real).

### 3.2 Use the answers they gave you

OptionalQuestions captures life focus (love/work/etc.). Surface that string on the paywall: benefit line reorders so their chosen focus leads ("daily guidance for **your work decisions**, written for your chart"). "Capturing user goals and surfacing them on the paywall outperforms most layout experiments" (2026 onboarding data). Cheap to build — the data is already in the store.

### 3.3 24-hour welcome offer for non-converters (founder decision required)

The most consistent 2026 monetization pattern not present in the app: when a user dismisses the onboarding paywall ("Maybe later"), schedule a **one-time, genuinely 24-hour** discounted annual offer (e.g. 30–40% off, intro offer via App Store Connect / RevenueCat). Expected +10–15% ARPU. Key facts:

- It does **not** touch the no-trial lock and does not discount the main paywall (9 in 10 subscriptions still sell at full price; main paywall stays full-price so you never train users to wait).
- Legality hinges on the timer being REAL: offer genuinely expires, never reappears. A recurring "expiring" offer is the FTC fake-urgency pattern; a true one-shot intro offer is standard and clean.
- Flag: STRATEGY.md doesn't currently contemplate post-close offers. This needs a locked decision before build; recommend locking it as "one-shot intro offer, non-converters only, never re-shown."

### 3.4 Authentic urgency exists in your product — use it

You cannot use countdown timers honestly. But astrology has **real, calendar-true scarcity**: transits. "Your Mars return window opens Tuesday — your 90-day forecast covers it" is factual urgency no fitness app can copy. Surface upcoming real transits on locked Today cards and (post-launch, as a test) on the paywall benefit copy. This is the cleanest possible implementation of urgency psychology: the deadline is set by the sky, not by you.

### 3.5 Close the W4/W5 discoverability gaps (already documented, raised here as P0)

- **W5:** PremiumTeaser — your strongest conversion surface — is unreachable after onboarding. Add a persistent, quiet entry: e.g. bronze "Unlock {Archetype}" pill in the Today header for free users, opening PremiumTeaser (not bare CustomPaywall — keep the narrative wrapper).
- **W4:** Compatibility and Calendar funnels exist only as text rows in More. Add one teaser card each in their natural context (Compatibility teaser on Readings; Calendar teaser on Today around date-relevant moments). Locked-card pattern already proven on Today — reuse it.

---

## 4. P1 — Visual system refinements

1. **Bronze small-text contrast.** `accent.primary` on `raised/base` surfaces = 4.15:1 — fails AA below 18px. Anywhere bronze text renders at `micro`/`caption` size on cards (badges, eyebrows), swap to `accent.emphasis #C49A5E` (5.92:1 on `#252528`). EAA enforcement makes this hygiene, and low-contrast labels measurably depress taps.
2. **Price typography.** Prices are brand moments. Render selected-plan price in `monoBody`-style Geist Mono at heading size — the "technical voice" font you already assign to prices elsewhere; consistency + tabular figures read as precision (and precision reads as trust).
3. **Locked-card affordance.** Ensure locked Today/Readings cards show a visible value preview (first line of real content, blurred or truncated) rather than generic lock copy alone — "specificity-as-proof" is already your doctrine; a blurred real sentence is the visual equivalent.
4. **PostPurchaseUpsellSheet** is well-framed ("nothing you paid for goes away" = loss-protection). Add the arithmetic visually: "{n} bought + 30/month with Premium" as a small stacked-bar or count-up, not prose only.
5. **Haptics + 200ms ease on plan selection** (you have the motion tokens) — selection should feel physically rewarding; cheap dopamine, zero ethics cost.

---

## 5. Pricing notes (reaffirming open STRATEGY items with 2026 data)

- **Raise weekly to $6.99–7.99 before RC/Stripe products are created** (already an open question in STRATEGY §282). 2026 data is even stronger than when that note was written: weekly is now 55.6% of all subscription revenue; higher-priced apps earn ~3× LTV; price tests rarely lift conversion but lift LTV 45.5% of the time. Raising weekly also inflates the true annual savings % to ~72% — the anchor improves twice.
- **Annual $99.99 above market (Nebula $49.99)** stays defensible as anchor — but only if §2.1 ships. An unexplained $99.99 with no per-month reframe is the worst configuration in the 2026 dataset ("annual, no trial, no framing").
- **Localization is the highest-win-rate experiment in the entire 2026 dataset (62.3%).** Post-launch, regional pricing (EU now the most expensive region; Japan/Mexico/Turkey fastest-growing) should precede any visual A/B work.

---

## 6. Sequencing (PM view)

| Order | Item | Effort | Expected impact |
|---|---|---|---|
| 1 | §2.1 price math + §2.2 selection dominance + §2.3 badge | S | Highest — direct paywall CVR |
| 2 | §2.4 pinned CTA + price-transparent microcopy | S | High + de-risks App Review |
| 3 | §3.1 momentum screen + §3.2 goal echo | M | High (+17%/+22% in published test) |
| 4 | §3.5 W5 paywall re-entry + W4 teaser cards | M | High — unlocks recurring conversion surface |
| 5 | §2.6 comparison table + §2.5 proof slot (empty until real reviews) | M | Medium now, compounds post-launch |
| 6 | §3.3 24h welcome offer (after founder lock) | M | +10–15% ARPU (industry pattern) |
| 7 | §4 polish items | S | Medium |
| 8 | Post-launch: remote-config paywall + experiment cadence (top testers run ~14.7/yr; structural tests before visual) | L | 2026's "up to 40×" gap is testing cadence, not any single design |

**Verification per house rules:** every shipped change → diff review → incognito/device check on small screen (SE-class) → confirm CTA visible without scroll, VoiceOver labels intact, live prices only.

---

## 7. Ethics & compliance guardrails (binding on all of the above)

Allowed and used here: defaults, anchoring with true math, real social proof, personalization from user-given data, genuine one-shot offers, real astronomical deadlines, loss-protection framing of true facts.
Excluded by design: fake/resetting countdowns, fabricated counts or reviews, strike-through prices never charged, hidden renewal terms, hard-to-find cancel/restore, confirmshaming declines, pre-selected add-ons. (FTC §5 enforcement continues post-vacatur of click-to-cancel; Apple rejects paywalls that obscure renewal pricing; EAA contrast rules now apply.)

---

## Sources

- [Adapty — What does a high-performing paywall look like in 2026?](https://adapty.io/blog/high-performing-paywall-2026/) (SOIS 2026: $3B revenue, 16K apps)
- [Adapty — State of In-App Subscriptions 2026](https://adapty.io/state-of-in-app-subscriptions/)
- [RevenueCat — State of Subscription Apps trends & benchmarks 2026](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026/)
- [RevenueCat — Four paywall redesign case studies](https://www.revenuecat.com/blog/growth/paywall-redesigns-case-studies/)
- [Airbridge — Paywall conversion: 6 structural decisions](https://www.airbridge.io/en/blog/paywall-conversion-structural-decisions)
- [Airbridge — 5 steps of app onboarding before the paywall](https://www.airbridge.io/en/blog/5-steps-app-onboarding-before-the-paywall)
- [Apphud — How to design a high-converting paywall](https://apphud.com/blog/design-high-converting-subscription-app-paywalls)
- [ScreensDesign — CHANI app showcase/teardown](https://screensdesign.com/showcase/chani-your-astrology-guide)
- [Paywall Screens — Nebula paywall](https://www.paywallscreens.com/apps/nebula-horoscope-astrology-mobile-paywall-058c)
- [FTC dark patterns in 2026 — Pandectes](https://pandectes.io/blog/dark-patterns-in-2026-what-the-ftcs-new-rules-mean/) · [TechCrunch — FTC dark-pattern study](https://techcrunch.com/2024/07/10/ftc-study-finds-dark-patterns-used-by-a-majority-of-subscription-apps-and-websites/)
- [Bluehost — Color contrast for accessibility and conversions](https://www.bluehost.com/blog/color-contrast-accessibility/) · [UserTesting — color psychology & conversion](https://www.usertesting.com/blog/color-ux-conversion-rates)

*Contrast ratios computed (WCAG 2.x formula) against actual token hex values in `src/design/tokens/colors.ts`. Savings math computed from locked STRATEGY.md prices.*
