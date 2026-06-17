# OMENORA — Visual Appearance Audit & 2026 Redesign Report

**Date:** 2026-06-09
**Scope:** Visual design of all mobile-app screens, evaluated for (a) 2026 modernity and (b) conversion. Balanced weighting.
**Method:** Read the full design-token system (`src/design/tokens/*`), the conversion-critical screens (`WelcomeScreen`, `PremiumTeaserScreen`, `CustomPaywall`, `TodayScreen`), the `Button`/`Card` primitives, and benchmarked against 2026 trend research + computed WCAG contrast ratios.
**Recommendation style:** Specific, token-level. Every change names the file and the exact value.

---

## 1. Executive summary

OMENORA already has an unusually mature, coherent visual system — a cool-charcoal canvas, warm-cream text, an aged-bronze accent, Onest + Geist Mono type, generative guilloché atmosphere, and Linear/Raycast-grade card depth (micro-gradients, top highlights, layered shadows). This is *ahead* of most apps and squarely on the 2026 "dark-first, tactile depth, restrained minimalism" axis. The brand direction does not need reinvention.

The gap between where it is and a modern, conversion-optimized 2026 app is **not aesthetic taste — it is a handful of high-leverage execution problems**, most of them on the money screens:

1. **The single highest-impact issue:** the primary purchase button (`variant="premium"`) renders in a cool navy-blue gradient that has only **1.74:1 luminance separation from the page background** — it visually recedes. The design system *already defines* a burnt-orange CTA color (`cta.primary #E8763A`) explicitly "reserved exclusively for primary purchase CTAs," which gives **6.31:1 separation (3.6× more prominent)** — and it is currently unused on the actual buy button. You built the right tool and didn't point it at the conversion moment.
2. **The paywall is structurally thin** by 2026 standards: no price-per-day decomposition, no savings %, no anchor pricing, no free-trial framing, no free-vs-Premium comparison table, no social proof, no post-dismiss win-back offer.
3. **Two text tokens fail WCAG AA** (`text.tertiary` 3.25:1, `text.disabled` 2.13:1) and are used for real reading content ("Your free reading for today," card meta).

Fixing the CTA color alone is a one-line token swap with potentially the largest single conversion return in this document. The rest is additive, not a rebuild.

---

## 2. The current visual system (snapshot)

| Layer | Current state | Verdict |
|---|---|---|
| **Canvas** | Cool charcoal `surface.deep #121214` → `base #252528`, tonal lift hierarchy | On-trend (2026 dark-first). Keep. |
| **Text** | Warm cream `#F2EDE5` primary, taupe secondary, warm-brown tertiary | Primary/secondary excellent; tertiary/disabled fail contrast. |
| **Accent** | Aged bronze `#A87D4E` for type, borders, decor | Distinctive, premium. Keep. |
| **CTA** | Burnt orange `#E8763A` defined… but not used on the buy button | Correct color, wrong wiring. |
| **Type** | Onest (300–600) + Geist Mono; hero 48px Light, mono eyebrows | Strong, editorial, on the 2026 "big expressive type" trend. |
| **Depth** | Card micro-gradients + 1px top highlight + 3-tier shadows | Best-in-class. Matches 2026 "tactile floating cards." |
| **Atmosphere** | White radial glows, film grain, guilloché line-work | Sophisticated, restrained. Keep. |
| **Motion** | Moti, Apple-signature easing curves, staggered entrances | Good foundation; under-used for micro-interaction. |

The bones are excellent. This report is about sharpening, not replacing.

---

## 3. The 2026 trend landscape (what we're benchmarking against)

**Visual.** Dark mode is now the *primary design surface*, not an inverted afterthought, with "Dark Mode 2.0" emphasizing higher contrast ratios for accessibility. Subtle 3D / floating cards with soft shadows and layered depth are everywhere thanks to better GPUs. Minimalism still dominates structure, but **large, bold, expressive typography** and **sophisticated dual-tone / ombré gradients** (not rainbow blends) provide the "spark." ([Muzli](https://muz.li/blog/whats-changing-in-mobile-app-design-ui-patterns-that-matter-in-2026/), [DesignStudio](https://www.designstudiouiux.com/blog/mobile-app-ui-ux-design-trends/), [Tech-RZ](https://www.tech-rz.com/blog/dark-mode-design-best-practices-in-2026/), [Fontfabric](https://www.fontfabric.com/blog/10-design-trends-shaping-the-visual-typographic-landscape-in-2026/), [Envato](https://elements.envato.com/learn/color-scheme-trends-in-mobile-app-design))

**Category (astrology).** The category-leading aesthetic is *more* restrained, not less: Co-Star's stark monochrome minimalism is the reference point; The Pattern wins on psychological depth over embellishment; Sanctuary on bite-sized, digestible readings. OMENORA's restraint is a category strength — the move is to perfect it and add exactly one expressive moment, not to chase neon. ([VAMA](https://vama.app/blog/best-astrology-apps/), [Medium — Co-Star design](https://medium.com/@jpinkos/co-star-astrology-how-astro-nerds-dominated-design-e04f705e96dc))

**Conversion.** Design is the *last* paywall lever; structure drives the difference. 2026 benchmarks: hard paywalls convert ~5× better at Day-35 than freemium (10.7% vs 2.1%); trials of 17–32 days convert at 42.5% vs 25.5% for <4-day trials; weekly plans now drive 55.6% of subscription revenue; free-vs-Pro comparison tables and post-close 24h win-back offers are now table stakes; benefit-driven CTAs ("Start my plan") beat generic ("Subscribe"). **Apple began rejecting free-trial toggles on paywalls in Feb 2026** — trials must be expressed as plan structure, not a switch. ([RevenueCat — 2026 benchmarks](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026/), [Adapty](https://adapty.io/blog/high-performing-paywall-2026/), [Apphud](https://apphud.com/blog/design-high-converting-subscription-app-paywalls))

**Onboarding.** Progress indicators are used by 78% of products and strongly predict conversion. Ask only 1–3 questions, and only if the answer changes what the user sees next. First-session *payoff* beats up-front data collection; reduce typing friction with passkeys / native sign-in. ([Adapty onboarding](https://adapty.io/blog/how-to-fix-your-onboarding-flow/), [Userpilot](https://userpilot.com/blog/mobile-app-trends/), [Appcues](https://www.appcues.com/blog/best-user-onboarding-examples))

---

## 4. Findings & token-level recommendations

Each finding is tagged **[Conversion]**, **[Visual]**, or **[Both]**, and prioritized **P0** (do now / highest leverage), **P1**, **P2**.

### 4.1 — P0 [Conversion] The primary CTA recedes; point the orange token at it

**Finding.** `CustomPaywall`, `WelcomeScreen`, and `PremiumTeaserScreen` all fire their main action through `Button variant="premium"`, which renders `specialty.premiumBtnGradient = ['#2C3D62', '#1A2444']` — a cool navy with a dark BlurView. Against the `#121214` page, the button's top stop has **1.74:1** separation. It reads as "a slightly lighter dark rectangle," not "press me."

Meanwhile `cta.primary #E8763A` / `cta.active #FF8856` exists, is documented as *"Reserved exclusively for primary purchase CTAs,"* gives **6.31:1** button-to-background separation, and keeps a **6.31:1** text contrast with its near-black label — and it is wired to a `cta` Button variant that nothing calls.

**Why it matters.** On a dark UI, the buy button should be the brightest, warmest, highest-contrast object on the screen. Right now it is one of the dimmest. This is the textbook definition of a leaking conversion surface.

**Recommendation (token-level).**
- Route the real purchase action to the **`cta`** variant (or repurpose `premium` to the warm fill). Concretely, in `CustomPaywall.tsx`, `PremiumTeaserScreen.tsx`, and the Today returning-user teaser, change the primary `<Button variant="premium" … />` to `variant="cta"`.
- Give it presence with the existing warm-glow token: apply `elevation.warmGlow` (already `shadowColor #A87D4E`) to the `cta` container in `Button.tsx`.
- Keep the navy "premium" treatment as the **secondary / brand-flavored** button (e.g., the Welcome "Reveal my chart" exploratory CTA can stay premium-navy; the *paywall purchase* button must be orange). This preserves brand texture while making the money button unmistakable.
- Add a pressed state for `cta`: background `cta.active #FF8856`.

> Keep the warm orange exclusively for *purchase*. Its power comes from scarcity — if it appears on nav or secondary actions it stops meaning "buy."

**Expected impact:** Highest single-change leverage in this report. A/B-test in isolation.

---

### 4.2 — P0 [Conversion] Paywall is structurally thin

**Finding.** `CustomPaywall` shows three plan rows (annual pre-selected, "BEST VALUE" badge) with a raw price each, two editorial benefit paragraphs, Unlock / Restore / Maybe-later. Missing every 2026 structural lever:

- **No price decomposition.** "$99.99 / year" without "$1.92/week" or "just $8.33/mo billed annually." Per-unit framing is the strongest comprehension lever.
- **No savings anchor.** Annual vs weekly is the value story; surface "Save 73% vs weekly" with a struck-through anchor.
- **No free-trial framing.** Trials of 17–32 days convert ~70% better than short ones; if you offer a trial, it must be the headline of the selected plan ("7 days free, then $99.99/yr"). Note Apple's Feb-2026 ban on the trial *toggle* — express it as plan copy, not a switch.
- **No free-vs-Premium comparison table.** 2026 research calls this the most consistent addition among top apps; it kills the "what do I actually get?" objection.
- **No social proof.** No rating, review count, or "Joined by N people." Astrology buyers are trust-driven.
- **No post-dismiss win-back.** "Maybe later" currently just closes. A 24h discounted-annual offer sheet on dismiss is now standard. (You already have `PostPurchaseUpsellSheet` infrastructure — extend the pattern to a *pre*-purchase dismiss offer.)

**Recommendation (token-level, all additive within the existing `PaywallShell` slots).**
- **Selected plan row:** add a `monoBody` (Geist Mono) per-unit line under the price. Use `text.secondary` for the unit price, `text.tertiary` for the struck anchor with `textDecorationLine: 'line-through'`.
- **Savings badge:** reuse the existing `badge` style but fill it — `accent.subtle` background, `accent.emphasis #C49A5E` text, label "SAVE 73%". Distinct from the "BEST VALUE" outline badge.
- **Comparison table:** new block above `planSelector`. Two columns (Free / Premium), rows = features, check glyphs in `state.success #7B9472` for Premium and `text.disabled` for Free. Card surface `cardTokens.background.contentGradient`, hairline `border.hairline`.
- **Social proof strip:** one `micro` line under the hero — "★ 4.8 · 12,000+ charts read" in `text.secondary`. (Wire real numbers; never fabricate.)
- **CTA copy:** change `"Unlock Premium"` → benefit-led, e.g. `"Reveal my full chart"` or, with trial, `"Start 7 days free"`. Benefit CTAs out-convert generic verbs.
- **Dismiss offer:** on `onClose` from "Maybe later," present a win-back `BottomSheet` with a time-boxed annual discount before fully closing.

---

### 4.3 — P1 [Conversion] Onboarding: deliver payoff sooner, reduce typing

**Finding.** The flow collects Name → DOB → Birth city → Birth time → Calculating → Big-Three reveal → Premium teaser. Astrology legitimately needs birth data, and `BigThreeRevealScreen` *is* the payoff — but it sits behind four input screens. 2026 research: first-session payoff beats up-front collection, and progress indicators strongly predict completion.

**Recommendation.**
- **Progress visibility:** ensure `ProgressDots` renders a clear, labeled "step N of 5" on every onboarding step (78% of 2026 products do this; completion predicts conversion). Use `accent.primary` for filled, `border.default` for empty.
- **Front-load a micro-payoff:** before full data entry, show a one-line teaser after DOB alone (sun sign + a single sentence) so the user gets a "this knows me" hit early, then continue collecting time/place for the full chart.
- **Reduce typing friction:** prefer native Apple/Google sign-in and passkeys over typed credentials at the `AuthGate` (you already integrate Apple auth — make it the primary, visually dominant option).
- **Calculating screen as anticipation, not delay:** `CalculatingScreen` is a conversion asset — use the `OmenLoader` + a sequence of `eyebrow`-styled status lines ("Placing your planets…", "Reading your houses…") to build perceived value before the reveal.

---

### 4.4 — P1 [Visual] Color: keep the monochrome, earn one expressive moment

**Finding.** The palette is near-monochrome warm-charcoal + bronze. That restraint is *correct* for the astrology category (Co-Star's monochrome is the benchmark). But 2026's expressive-gradient trend is real, and OMENORA currently spends its one "wow" budget on… a blurred navy button. The expressive moment is in the wrong place.

**Recommendation.**
- **Reclaim the gradient budget for the hero/reveal, not the button.** Introduce one *celestial dual-tone* gradient (deep indigo → warm bronze, sophisticated ombré, not rainbow) used **only** on: the Big-Three reveal, the paywall hero, and the moon-phase hero. Add as a single new token, e.g. `gradient.celestial = ['#1A2340', '#3A2A1C']` alongside the existing `gradient.cardBase`, consumed by `MoonPhaseHero` / `PaywallShell` hero.
- **Hold the line everywhere else.** No new hues on content screens. The whole effect depends on the gradient being rare.
- This satisfies the 2026 "expressive gradient" trend *and* the category's "stay minimal" rule simultaneously — by concentrating, not spreading.

---

### 4.5 — P1 [Both] Accessibility & contrast — two tokens fail WCAG AA

**Finding (computed ratios on `#121214`):**

| Token | Hex | Ratio vs canvas | Ratio on raised card | WCAG AA (4.5 body / 3.0 large) |
|---|---|---|---|---|
| `text.primary` | `#F2EDE5` | 16.06 | — | Pass |
| `text.secondary` | `#A8A19A` | 7.33 | — | Pass |
| **`text.tertiary`** | **`#6B655E`** | **3.25** | **2.32** | **Fail body; borderline large** |
| **`text.disabled`** | **`#4A4A50`** | **2.13** | — | **Fail** |

`text.tertiary` is used for live reading content — "Your free reading for today" (`TodayScreen`), `ListItem` meta, section labels — at body/caption sizes where 4.5:1 is required. 2026 "Dark Mode 2.0" guidance explicitly calls for *higher* contrast.

**Recommendation (token-level, `colors.ts`).**
- Lighten `text.tertiary #6B655E` → approximately **`#8A8278`** (targets ~4.6:1 on canvas, ~3.3:1 on raised cards — passes body on canvas, large on cards). Re-verify after change.
- Reserve `text.tertiary` for *non-essential* metadata only; promote any reading-content currently using tertiary to `text.secondary`.
- Leave `text.disabled` as-is *only* for genuinely disabled controls (where low contrast is semantically correct), never for readable copy.

---

### 4.6 — P2 [Visual] Typography: small sharpening of an already-strong system

**Finding.** Type is a strength — Onest hero at 48px Light is on the 2026 "big expressive type" trend, and the Geist Mono eyebrows give technical/editorial credibility. Two refinements:

**Recommendation.**
- **Increase display weight contrast at the reveal.** The Welcome headline already swaps one word to `displayMedium` — extend this "light body + medium emphasis word" pattern to the Big-Three reveal and paywall hero for a more confident 2026 expressive-type feel. No new tokens needed; reuse `typeScale.hero` + `fontFamily.displayMedium`.
- **Tighten hero tracking on the largest sizes only.** `tracking.tight (-1.4)` is good at 48px; verify it isn't applied below ~30px where it can cause crowding. (It currently is scoped correctly via `typeScale` — keep that discipline.)
- **Mono for all numerics.** Ensure every price, countdown, and stat uses `monoBody`/`eyebrow` (Geist Mono) — partially done; make it a rule. Tabular numerals read as "precise/trustworthy," which helps the paywall.

---

### 4.7 — P2 [Visual] Depth & glass: you're ahead — extend selectively

**Finding.** Card depth (micro-gradients + `cardHighlight` top line + 3-tier `cardShadow`) is best-in-class and matches the 2026 tactile-floating-card trend. `specialty.glassTint` and BlurView exist but glass is mostly spent on the (recede-ing) premium button.

**Recommendation.**
- **Move glass to where it earns attention:** sticky paywall CTA bar, bottom sheets, and the Today intro card (`variant="glass"` already) — surfaces that float over content. Keep content cards solid for readability.
- **Don't add neomorphism.** It conflicts with your high-contrast reading goals; your gradient-lift + top-highlight approach is the more accessible 2026 depth idiom. Stay the course.

---

### 4.8 — P2 [Both] Motion & micro-interaction

**Finding.** Entrance choreography (Moti, staggered, Apple easing) is polished. Interaction-level motion is sparse — buttons scale/opacity on press (good), but there's little reward motion at value moments.

**Recommendation.**
- **Reward the reveal.** Add a `softSettle` (already in `motion.ts`) entrance to each Big-Three card with `stagger.child (60ms)` — the existing tokens already support this; apply them at the reveal.
- **Haptic-couple the purchase.** `Haptics.selectionAsync()` already fires on press; add a success `Haptics.notificationAsync(Success)` on confirmed purchase for a satisfying close.
- **Respect reduce-motion.** Confirm the reduce-motion hook gates the celestial gradient shimmer and stagger (accessibility + 2026 expectation).

---

## 5. Prioritized roadmap

| # | Change | Type | Priority | Effort | Leverage |
|---|---|---|---|---|---|
| 4.1 | Route purchase button to warm `cta` token + warm glow | Conversion | **P0** | XS (token + variant swap) | **Very high** |
| 4.2 | Paywall structure: price/unit, savings, comparison table, social proof, dismiss offer | Conversion | **P0** | M | **Very high** |
| 4.5 | Fix `text.tertiary` / `text.disabled` contrast | Both | **P1** | XS | High (UX + compliance) |
| 4.3 | Onboarding: progress, early payoff, native sign-in | Conversion | **P1** | M | High |
| 4.4 | One celestial gradient, hero/reveal only | Visual | **P1** | S | Medium-high |
| 4.6 | Display weight contrast + mono numerics | Visual | **P2** | S | Medium |
| 4.7 | Reallocate glass to floating surfaces | Visual | **P2** | S | Medium |
| 4.8 | Reveal + purchase micro-motion/haptics | Both | **P2** | S | Medium |

**If you do only three things:** 4.1 (point orange at the buy button), 4.2 (paywall structure), 4.5 (contrast). The first two are where the conversion is; the third is where the compliance and polish are.

---

## 6. Appendix — concrete token diffs

```ts
// colors.ts — fix failing contrast (4.5)
text.tertiary:  '#6B655E'  →  '#8A8278'   // 3.25:1 → ~4.6:1 on canvas (re-verify)

// colors.ts — new, rare, expressive gradient (4.4); used ONLY on hero/reveal/paywall hero
gradient.celestial: ['#1A2340', '#3A2A1C'] as const   // deep indigo → warm bronze ombré

// Button.tsx — make the CTA variant the real money button (4.1)
//  • Primary purchase actions: variant="premium"  →  variant="cta"
//  • Apply elevation.warmGlow to the cta container
//  • Pressed state fill: cta.active #FF8856
//  • Keep navy premiumBtnGradient for secondary/brand CTAs only

// CustomPaywall.tsx — additive structure (4.2)
//  • Per-unit price line (monoBody, text.secondary) + struck anchor (text.tertiary, line-through)
//  • Filled SAVE % badge: bg accent.subtle, text accent.emphasis #C49A5E
//  • Free-vs-Premium comparison block: checks in state.success / text.disabled
//  • Social-proof micro line (real numbers only)
//  • CTA copy: "Unlock Premium" → "Reveal my full chart" / "Start 7 days free"
//  • "Maybe later" → present win-back BottomSheet before close
```

**Verification note:** all contrast ratios in this report were computed with the WCAG relative-luminance formula against `surface.deep #121214`. Re-run the check after changing `text.tertiary` and after finalizing any new gradient stops, since the celestial gradient must still carry `text.primary` at ≥4.5:1 (the proposed stops do: cream on `#1A2340` ≈ 13:1).

---

*Sources are linked inline in §3. This report covers visual design only; content, copy strategy, and pricing economics are noted where they intersect the visual surface but are out of scope for full treatment.*
