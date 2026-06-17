# OMENORA — Visual Polish: Execution Checklist & Windsurf Prompts

**Companion to:** `2026-06-09-visual-design-audit.md`
**Date:** 2026-06-09
**Purpose:** Turn the audit into a precise, ordered execution plan. Every prompt below was written *after* reading the actual files it touches — paths, exports, call sites, and current values are verified, not assumed.

---

## How to use this document

Each task has: **verified context** (facts confirmed in the codebase), a **copy-paste prompt** for Windsurf (inside the fenced block), and **acceptance criteria + guardrails**. Run them **in order** — later tasks depend on earlier ones. After each, run the verification command and tick the checklist.

### Global guardrails — paste this into Windsurf once at the start of the session

```
You are editing the OMENORA Expo/React Native app (mobile-app/). Follow these rules for every change in this session:

1. PRECISION: Make ONLY the change described. Do not refactor, rename, reformat, reorder imports, or "improve" unrelated code.
2. NO ASSUMPTIONS: If a referenced symbol, file, export, or field does not exist exactly as described, STOP and report what you found instead of inventing a substitute. Never fabricate data (prices, ratings, counts, copy) — if real data is required, leave a clearly-marked TODO and a typed prop/parameter for it.
3. SCOPE: `variant="premium"` exists on BOTH the <Button> atom AND the <Card> organism. Only ever touch <Button> instances unless a task explicitly says Card.
4. TOKENS ONLY: Use design tokens from src/design/tokens. Do not hardcode hex values, spacing, or radii in components.
5. VERIFY BEFORE DONE: After each task, run `npx tsc --noEmit` and report the result. Do not mark a task complete if it introduces type errors.
6. CONFIRM CALL SITES: When a task lists exact files/lines to change, change ONLY those. Do not change other matches of the same pattern.
```

---

## Master checklist

**Phase A — P0 CTA prominence (highest leverage, low risk)**
- [ ] A1 — Upgrade the `cta` Button variant to full prominence + warm glow
- [ ] A2 — Route the 6 purchase/conversion buttons from `premium` → `cta`
- [ ] A3 — Visual QA pass: every buy button is orange & prominent; brand buttons still navy

**Phase B — P1 Accessibility / contrast (low risk)**
- [ ] B1 — Fix `text.tertiary` contrast token
- [ ] B2 — Promote reading-content uses of `tertiary` → `secondary`

**Phase C — P0 Paywall structure (medium, data-aware)**
- [ ] C1 — Per-period price + savings % (computed from RevenueCat data)
- [ ] C2 — Free-vs-Premium comparison table
- [ ] C3 — Benefit-led + trial-aware CTA copy
- [ ] C4 — Social-proof strip (REQUIRES REAL DATA — gated)
- [ ] C5 — Post-dismiss win-back offer

**Phase D — P1 Visual: the one expressive moment**
- [ ] D1 — Add `gradient.celestial` token
- [ ] D2 — Apply it to the paywall hero only

**Phase E — P2 Polish (optional, low risk)**
- [ ] E1 — Mono numerals for all prices
- [ ] E2 — Success haptic on confirmed purchase
- [ ] E3 — Reveal micro-motion on Big-Three cards

---

# Phase A — CTA prominence

## A1 — Upgrade the `cta` Button variant

### Verified context
- File: `src/components/atoms/Button.tsx`.
- `ButtonVariant` already includes `'cta'` (line 25). The `cta` entry exists in `variantStyles` (lines 59–63): `container.backgroundColor = ctaTokens.primary`, `label.color = ctaTokens.text`, `indicator = ctaTokens.text`.
- `cta` currently renders through the **standard/base path** (lines 173–202), using `styles.base` → `minHeight: layout.tapTarget` (44), `paddingVertical: space['3']` (12), `borderRadius: radius.md` (12), and `<Text variant="label">` (13px). The `premium` button is taller and louder: `minHeight: 56`, `paddingVertical: space['4']` (16), `borderRadius: radius.sm` (8), `labelLarge` (17px). **A bare variant swap would shrink the buy button — so we first bring `cta` up to premium's physical prominence.**
- `cta` is currently used in **zero** call sites (verified by grep), so changing its styling is risk-free to existing UI.
- `warmGlow` is exported from `src/design/tokens/elevation.ts` and re-exported via `src/design/tokens/index.ts` (`export * from './elevation'`). It is a **named export**, NOT a member of the `tokens` aggregate. `warmGlow.shadowColor = #A87D4E`. Note: `warmGlow.elevation = 0`, so the glow renders on iOS only; Android gets the flat orange fill (acceptable).
- `ctaTokens.active = #FF8856` exists (imported already as `cta as ctaTokens`).

### Prompt
```
In src/components/atoms/Button.tsx, make the existing `cta` variant render at the same physical prominence as the `premium` button, with a warm glow and a pressed state. Do NOT change the `premium` variant or any other variant.

1. Add `warmGlow` to the existing token import from '../../design/tokens' (it is a named export from elevation; keep all current imports).
2. Add a new style to the StyleSheet:
     ctaBase: { minHeight: 56, paddingVertical: space['4'], borderRadius: radius.sm }
3. In the standard (non-premium) render path's Pressable `style` array, after `vs.container`, add these two conditional entries (in this order):
     variant === 'cta' && styles.ctaBase,
     variant === 'cta' && warmGlow,
     variant === 'cta' && pressed && { backgroundColor: tokens.cta.active },
   Keep the existing `pressed && styles.pressed` entry as-is (the scale-down press effect still applies).
4. Change the label rendering in that same path so the `cta` variant uses the larger label size:
     <Text variant={variant === 'cta' ? 'labelLarge' : 'label'} style={vs.label}>
   Leave all other variants on `variant="label"`.

Do not touch the PremiumButtonShell, variantStyles values, handlePress, or any call site. Run `npx tsc --noEmit` and report.
```

### Acceptance criteria
- `cta` button is 56px tall, `radius.sm`, 17px label, near-black text on orange `#E8763A`, with a bronze glow on iOS.
- Pressed `cta` shows `#FF8856` fill + scale-down.
- `premium`, `primary`, `secondary`, `tertiary`, `danger` are visually unchanged.
- `tsc --noEmit` clean.

### Verify
```
git diff src/components/atoms/Button.tsx
npx tsc --noEmit
```

---

## A2 — Route purchase/conversion buttons to `cta`

### Verified context — exact, classified call sites
Rule applied: a button is a **purchase/conversion CTA** if its `onPress` leads to `purchaseSubscription`, `presentPaywall`, `onUpgrade`, or a paid unlock. These get `cta`. Onboarding navigation and already-entitled actions keep `premium` (navy).

**SWITCH to `variant="cta"` (6 sites):**

| File | Line | Button label | Why it qualifies |
|---|---|---|---|
| `src/components/organisms/CustomPaywall.tsx` | 174 | "Unlock Premium" | `handleContinue` → `purchaseSubscription` (the live buy button) |
| `src/screens/tabs/TodayScreen.tsx` | 326 | "Unlock Premium" | `presentPaywall('today_returning_user')` |
| `src/screens/onboarding/PremiumTeaserScreen.tsx` | 149 | (unlock) | `handleUnlock` → `presentPaywall` |
| `src/components/molecules/PostPurchaseUpsellSheet.tsx` | 66 | "Upgrade to Premium" | `onUpgrade` (purchase) |
| `src/components/organisms/ReadingFeatureCard.tsx` | 60 | `ctaLabel` | `handleUnlockPress` (paid unlock CTA used by locked feature cards) |
| `src/screens/tabs/CounselScreen.tsx` | 90 | "Start chatting" | free-user unlock CTA → `handleStartChat` |

**KEEP `variant="premium"` (do NOT change) — brand/navigation:**
`WelcomeScreen.tsx:154` ("Reveal my chart"), `CounselScreen.tsx:69` ("Open Counsel", already-premium), `CounselDisclosureModal.tsx:102 & 159` (consent flow), and all onboarding "continue" buttons: `NameScreen.tsx:97`, `BirthCityScreen.tsx:103`, `BirthTimeScreen.tsx:109`, `DateOfBirthScreen.tsx:114`, `BigThreeRevealScreen.tsx:110`, `OptionalQuestionsScreen.tsx:100`. Also all `<Card variant="premium">` — never touch.

### Prompt
```
Change the Button `variant` prop from "premium" to "cta" at EXACTLY these six locations, and nowhere else:

1. src/components/organisms/CustomPaywall.tsx — the <Button label="Unlock Premium" ...> around line 174 (inside primaryCta).
2. src/screens/tabs/TodayScreen.tsx — the <Button label="Unlock Premium" ...> around line 326 (the returning-user teaser, onPress calls presentPaywall('today_returning_user')).
3. src/screens/onboarding/PremiumTeaserScreen.tsx — the <Button> around line 149 whose onPress is handleUnlock.
4. src/components/molecules/PostPurchaseUpsellSheet.tsx — the <Button label="Upgrade to Premium" ...> around line 66.
5. src/components/organisms/ReadingFeatureCard.tsx — the <Button label={ctaLabel} ...> around line 60.
6. src/screens/tabs/CounselScreen.tsx — the <Button label="Start chatting" ...> around line 90.

Do NOT change any other Button with variant="premium" (Welcome "Reveal my chart", CounselScreen "Open Counsel" at ~line 69, CounselDisclosureModal, and all onboarding "continue" buttons stay "premium"). Never change any <Card variant="premium">. Change only the string "premium" → "cta" on the variant prop at the six sites above. Run `npx tsc --noEmit` and report.
```

### Acceptance criteria
- The 6 listed buttons render orange/`cta`; the 9 brand/nav premium buttons remain navy.
- No `<Card>` was touched.
- `tsc --noEmit` clean.

### Verify
```
grep -rn 'variant="cta"' src    # expect exactly 6
grep -rn 'variant="premium"' src/components/atoms ; # sanity: none here
git diff --stat
```

---

## A3 — Visual QA pass (manual)
Open: onboarding paywall, Today (as a returning free user), Counsel (free), a locked reading feature card, and the post-purchase upsell. Confirm the buy button is the brightest element on each, and that "Reveal my chart" / onboarding "continue" buttons are still navy.

---

# Phase B — Contrast / accessibility

## B1 — Fix `text.tertiary` contrast

### Verified context
- File: `src/design/tokens/colors.ts`, `text` object. Current `tertiary: '#6B655E'`.
- Computed WCAG ratios on `surface.deep #121214`: current `#6B655E` = **3.25:1** (fails AA 4.5 body). Proposed `#8A8278` = **4.94:1** on canvas, **3.52:1** on raised card `#2F2F33`. Cream/secondary unaffected.
- `text.disabled #4A4A50` (2.13:1) is **intentionally** left as-is for genuinely disabled controls — do not change it.

### Prompt
```
In src/design/tokens/colors.ts, in the `text` object, change ONLY the `tertiary` value:
  from: tertiary:   '#6B655E',  // warm brown (web: --omn-text-tertiary)
  to:   tertiary:   '#8A8278',  // warm taupe — WCAG AA 4.94:1 on #121214 (was #6B655E 3.25:1)
Do not change text.disabled, text.secondary, or any other token. Run `npx tsc --noEmit`.
```

### Verify
```
grep -n "tertiary:" src/design/tokens/colors.ts
```

---

## B2 — Promote reading-content uses of `tertiary` → `secondary`

### Verified context
`tertiary` is correct for non-essential metadata but is used on some **reading content** that should be more legible. Verified examples: `TodayScreen.tsx` "Your free reading for today" (`<Text variant="micro" color="tertiary">`), section labels, and various `color="tertiary"` body/caption strings. This task is a **review**, not a blind replace — only promote strings that are actual reading content, not structural labels/eyebrows.

### Prompt
```
Audit uses of color="tertiary" (and color: tokens.text.tertiary) across src/screens and src/components. For EACH occurrence, decide:
 - If the text is reading content the user is meant to read (sentences, descriptions, body copy, the "Your free reading for today" tag), change color="tertiary" → color="secondary".
 - If the text is a structural label, eyebrow, caption, timestamp, legal fine print, or decorative meta, LEAVE it as tertiary.
List every file+line you changed and every one you intentionally left, with a one-line reason each. Do not change any other props. Run `npx tsc --noEmit`.
```

### Acceptance criteria
- A written list of changed vs. kept occurrences (so the decision is auditable).
- Eyebrows/captions/legal remain tertiary.

---

# Phase C — Paywall structure

> These touch `src/components/organisms/CustomPaywall.tsx` (the live paywall, mounted in `PurchasesProvider.tsx:290`). Its slots come from `PaywallShell` (`hero`, `features`, `planSelector`, `primaryCta`, `secondaryAction`, `legalFooter`). `react-native-purchases` is **v10.1.0**. Do each sub-task as its own commit.

## C1 — Per-period price + savings %

### Verified context
- `CustomPaywall` already has `packageFor(key)` returning a `PurchasesPackage | null`, and `priceFor(key)` returning `product.priceString`. The plan rows are rendered in the `planSelector` slot (the `PLAN_META.map`).
- RevenueCat v10 `StoreProduct` exposes formatted per-period strings and numeric `price`. **Do not assume field names** — confirm them against the installed types before use.

### Prompt
```
Goal: in src/components/organisms/CustomPaywall.tsx, show a per-period price and a savings line WITHOUT inventing any numbers — everything must derive from the RevenueCat package already available via packageFor(key).

1. First, open node_modules/react-native-purchases and confirm the exact StoreProduct field names available in v10 for: formatted price-per-week/month string, and numeric price. Report what you find before editing. If per-period string fields exist, use them; if not, compute per-week from the numeric `price` and the package's billing period and format with the product's currencyCode/locale. Do NOT hardcode currency symbols.
2. In each plan row, under the existing priceString, add a small Geist Mono line:
     <Text variant="monoBody" color="secondary">{perPeriodString}</Text>
   e.g. annual → "≈ $1.92 / week". Only render it when the value is available; otherwise render nothing (no placeholder text).
3. Compute savings for the annual plan strictly from numeric prices already loaded: savingsPct = round(1 - (annualPricePerWeek / weeklyPrice)) when BOTH packages are present; otherwise render nothing. Show it as a filled badge distinct from the existing "BEST VALUE" outline badge:
     style: { backgroundColor: tokens.accent.subtle, borderRadius: radius.xs, paddingVertical: space['0.5'], paddingHorizontal: space['2'] }
     <Text variant="micro" style={{ color: tokens.accent.emphasis }}>SAVE {savingsPct}%</Text>
4. If the live offering hasn't loaded (packages null), the paywall must look exactly as it does today (no broken/empty rows).

Do not change purchase logic, plan order, or the FALLBACK_PRICE behavior. Run `npx tsc --noEmit`.
```

### Acceptance criteria
- Per-period + savings appear only when derived from real package data; never fabricated.
- Pre-load / fallback state is visually safe.

---

## C2 — Free-vs-Premium comparison table

### Verified context
- New block belongs in the `features` slot (or just above `planSelector`) of `CustomPaywall`. `state.success #7B9472`, `text.disabled`, `border.hairline`, and `cardTokens.background.contentGradient` exist for styling. Feature rows must reflect **actual** Premium entitlements — do not invent features.

### Prompt
```
In src/components/organisms/CustomPaywall.tsx, add a Free-vs-Premium comparison block in the `features` slot, below the existing EditorialBenefit copy.

Structure: a two-column table. Header row: empty | "Free" | "Premium". Each feature row: feature label (Text variant="label" color="secondary"), a Free cell, a Premium cell. Use a check glyph (lucide Check) colored tokens.state.success for included, and a minus/dash colored tokens.text.disabled for excluded. Row separators: borderBottomWidth 0.5, borderColor tokens.border.hairline. Wrap in a View with backgroundColor via LinearGradient cardTokens.background.contentGradient and borderRadius radius.lg, padding layout.cardPaddingDefault.

For the feature LIST: do not invent features. Derive the rows from what Premium actually unlocks in this app (e.g. full daily reading, dimensions, reflection, planetary weather, Counsel, forecast). Read TodayScreen.tsx and the LockedCard usages to ground the exact Free vs Premium split, and leave a // TODO comment listing the rows you chose so a human can confirm. Run `npx tsc --noEmit`.
```

### Acceptance criteria
- Table renders with accurate, app-grounded feature rows + a TODO listing them for human sign-off.
- Styling uses tokens only.

---

## C3 — Benefit-led, trial-aware CTA copy

### Verified context
- Current primary CTA label is the literal `"Unlock Premium"` in `CustomPaywall.tsx`. Apple began rejecting free-trial *toggles* (Feb 2026); a trial must be expressed as label/plan copy. Whether a trial exists is determined by the selected package's intro/offer data — detect it, don't assume it.

### Prompt
```
In src/components/organisms/CustomPaywall.tsx, make the primary CTA label benefit-led and trial-aware.

1. Determine from the SELECTED package whether it has a free intro/trial period (inspect the StoreProduct intro/offer fields in react-native-purchases v10; report the exact field you used). Do not assume a trial exists.
2. Label logic:
   - If a free trial is detected: label = `Start ${trialDays} days free` (derive trialDays from the intro period; if the unit isn't days, phrase it correctly e.g. "Start 1 week free").
   - Else: label = "Reveal my full chart".
3. Keep variant="cta" (set in A2), keep loading/disabled wiring. Do not add a trial toggle UI. Run `npx tsc --noEmit`.
```

### Acceptance criteria
- Label reflects real trial state; no toggle added; no fabricated trial.

---

## C4 — Social-proof strip — GATED, requires real data

### Verified context
This is the one place that **cannot be derived from code**. Rating/review/user counts must be real (App Store rating, verified totals). Do not ship fabricated numbers.

### Prompt
```
In src/components/organisms/CustomPaywall.tsx, add a single social-proof line directly under the hero, styled: <Text variant="micro" color="secondary" style={{ textAlign: 'center' }}>.

Do NOT hardcode any rating or count. Add it as a typed optional prop on CustomPaywallProps: `socialProof?: string` and render the line only when the prop is provided. Add a // TODO above it: "Wire real App Store rating / verified user count from a trusted source before enabling." Pass undefined for now from PurchasesProvider. Run `npx tsc --noEmit`.
```

### Acceptance criteria
- No fabricated numbers anywhere; renders only when real data is supplied.

---

## C5 — Post-dismiss win-back offer

### Verified context
- In `CustomPaywall.tsx`, the "Maybe later" `Pressable` (in `secondaryAction`) calls `onClose`. `onClose` is wired in `PurchasesProvider.tsx:290` to `handlePaywallClose`. `BottomSheet` (`src/components/organisms/BottomSheet.tsx`) takes `{ visible, onClose, children }`. A win-back must intercept the dismiss **once per session** (don't trap the user).

### Prompt
```
In src/components/organisms/CustomPaywall.tsx, add a one-time win-back step on dismiss.

1. Add local state `const [winbackShown, setWinbackShown] = useState(false)`.
2. Wrap the "Maybe later" handler: if !winbackShown AND an annual package exists, setWinbackShown(true) and show a win-back BottomSheet instead of immediately calling onClose. If winbackShown is already true, call onClose normally.
3. The win-back BottomSheet (use the existing BottomSheet organism) offers the annual plan with a brief value line and a primary Button variant="cta" that runs the existing handleContinue for the annual package, plus a "No thanks" tertiary Button that calls onClose. Do NOT invent a discount price — reuse the real annual package price; if you want to present a discounted offer, leave a // TODO to wire a RevenueCat promotional offering and DO NOT fabricate a discounted number.
4. Reset winbackShown to false whenever the paywall is re-opened (when `visible` transitions to true).

Keep all existing purchase/restore logic intact. Run `npx tsc --noEmit`.
```

### Acceptance criteria
- Dismiss shows the win-back at most once per open; second dismiss closes.
- No fabricated discount.

---

# Phase D — The one expressive moment

## D1 — Add `gradient.celestial` token

### Verified context
- File: `src/design/tokens/colors.ts`. `gradient` object currently has only `cardBase: ['#1E1E21', '#121214']`. Adding a key is non-breaking.
- Verified contrast: `text.primary #F2EDE5` over `#1A2340` = 13.27:1 and over `#3A2A1C` = 11.79:1 — both safe for cream text.

### Prompt
```
In src/design/tokens/colors.ts, in the `gradient` object, add one new key (do not change cardBase):
  celestial: ['#1A2340', '#3A2A1C'] as const,  // deep indigo → warm bronze; hero/reveal moments ONLY
Run `npx tsc --noEmit`.
```

---

## D2 — Apply the celestial gradient to the paywall hero only

### Verified context
- `PaywallShell` renders the `hero` slot centered. The celestial gradient should be a subtle backdrop behind the paywall hero text only — NOT on content screens. `expo-linear-gradient`'s `LinearGradient` is already used across the app.

### Prompt
```
Apply gradient.celestial as a subtle backdrop behind the CustomPaywall hero only (the archetype headline block). In src/components/organisms/CustomPaywall.tsx, wrap the existing hero content in a container that renders a LinearGradient (colors={tokens.gradient.celestial}, vertical) behind the text, at low opacity (e.g. style opacity 0.5) with borderRadius radius.xl and padding. Keep the hero text in tokens.text.primary (cream) — confirmed 11–13:1 contrast on these stops. Do NOT add this gradient anywhere else (no content screens, no buttons). Run `npx tsc --noEmit`.
```

### Acceptance criteria
- Gradient appears only behind the paywall hero; everywhere else unchanged.

---

# Phase E — Optional polish (P2)

## E1 — Mono numerals for prices
```
Ensure every user-facing price/number in CustomPaywall.tsx and PostPurchaseUpsellSheet.tsx renders with a Geist Mono variant (monoBody or eyebrow). Only change Text `variant` on numeric strings; do not change layout or values. Run `npx tsc --noEmit`.
```

## E2 — Success haptic on confirmed purchase
```
In src/components/organisms/CustomPaywall.tsx handleContinue, after `await purchaseSubscription(pkg)` succeeds (before onClose), fire Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success). Import * as Haptics from 'expo-haptics' if not already imported. Do not change error handling. Run `npx tsc --noEmit`.
```

## E3 — Reveal micro-motion on Big-Three cards
```
In src/screens/onboarding/BigThreeRevealScreen.tsx, add a staggered entrance to the three reveal cards using the existing Moti + motion tokens (easing.softSettle, stagger.child = 60ms), gated by the useReduceMotion hook so it's disabled when reduce-motion is on. Do not change content or layout. Run `npx tsc --noEmit`.
```

---

## Suggested commit / PR sequence
1. `feat(button): warm cta variant` (A1)
2. `fix(cta): route purchase buttons to warm cta` (A2)
3. `fix(a11y): tertiary text contrast` (B1, B2)
4. `feat(paywall): per-period price + savings` (C1)
5. `feat(paywall): comparison table` (C2)
6. `feat(paywall): trial-aware cta copy` (C3)
7. `feat(paywall): social proof prop (gated)` (C4)
8. `feat(paywall): win-back on dismiss` (C5)
9. `feat(visual): celestial hero gradient` (D1, D2)
10. `chore(polish): mono numerals, haptic, reveal motion` (E1–E3)

Keep A and B (zero-data, low-risk) separate from C (data-aware) so the high-leverage CTA + contrast fixes can ship immediately while the paywall data work is reviewed.

## What requires a human decision (never let the tool fabricate)
- C4 social-proof numbers (real rating/count).
- C5 any *discounted* win-back price (wire a real RevenueCat promotional offering).
- C2 the exact Free-vs-Premium feature split (confirm the TODO list).
- C3 trial length/existence (must come from the live offering, not copy).
