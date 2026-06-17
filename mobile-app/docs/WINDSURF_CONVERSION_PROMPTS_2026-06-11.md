# Windsurf Execution Prompts — Conversion Design Fixes

> **Source:** `mobile-app/docs/audits/CONVERSION_DESIGN_AUDIT_2026-06-11.md`
> **Discipline:** One prompt at a time. Wait for Windsurf's report before sending the next. Diff review before any commit. Hold locally before push. Verify on an SE-class simulator before declaring done.
> **Global forbids (apply to every prompt):** No new dependencies. No navigation architecture rewrites. No changes to pricing values, plan structure, or the no-trial lock. No fabricated social proof, counts, ratings, or timers. No fallback-price-derived math (live RC prices only — same rule as BoostPackSheet). No file creation/modification outside the files each prompt names.

---

## Master checklist

| # | Prompt | Files touched | Status | Blocked on |
|---|---|---|---|---|
| P1 | Paywall core redesign (price math, selection dominance, badge, pinned CTA, trust line) | `PaywallShell.tsx`, `CustomPaywall.tsx` | ☐ READY | — |
| P2 | Pre-paywall momentum screen + life-focus echo | new `ChartPreparationScreen.tsx`, `RootNavigator.tsx`, `OptionalQuestionsScreen.tsx`, `PremiumTeaserScreen.tsx` | ☐ READY | — |
| P3 | W5 paywall re-entry + W4 funnel teaser cards | `TodayScreen.tsx`, `ReadingsScreen.tsx` | ☐ READY | — |
| P4 | Free vs Premium comparison table on paywall | `CustomPaywall.tsx` (+ 1 new molecule) | ☐ READY | P1 merged |
| P5 | Polish: contrast sweep, selection haptics, upsell arithmetic | tokens consumers (sweep), `PostPurchaseUpsellSheet.tsx` | ☐ READY | — |
| — | 24h post-close welcome offer | — | ☐ BLOCKED | Founder lock in STRATEGY.md + App Store Connect intro-offer setup |
| — | Badge copy "BEST VALUE" → "MOST POPULAR" A/B | — | ☐ BLOCKED | Founder decision (copy is documented in MOBILE_SCREENS.md; do not change at execution time) |
| — | Proof row (rating / review) on paywall | — | ☐ BLOCKED | Real App Store reviews exist (post-launch) |
| — | Weekly price raise to $6.99–7.99 | — | ☐ BLOCKED | Already open in STRATEGY §282; decide before RC/Stripe product creation |

Execution order: P1 → P2 → P3 → P5 → P4 (P4 after P1's diff is merged since both touch `CustomPaywall.tsx`).

---

## PROMPT P1 — Paywall core redesign

Copy-paste everything between the lines into Windsurf:

---

**TASK: Redesign the visual conversion layer of the custom paywall. Two files only: `src/components/templates/PaywallShell.tsx` and `src/components/organisms/CustomPaywall.tsx`. Surgical edits. Do not touch any other file. No new dependencies. No changes to purchase logic, plan structure, prices, analytics events, or accessibility roles (extend labels where noted).**

**Context you must verify first (read-only):** `src/design/tokens/colors.ts` (use `accent.emphasis #C49A5E`, `accent.subtle`, `accent.primary`, `text.inverse`, existing `cta` tokens), `src/design/tokens/spacing.ts` (`space`, `layout`), `src/design/tokens/radius.ts`, `src/components/atoms/Text.tsx` (variant = any `typeScale` key), `src/components/atoms/Button.tsx`. All values below come from these tokens — introduce zero new hex literals.

### Change 1 — PaywallShell: pinned CTA footer

Current shell is a single `ScreenWrapper scroll`. On SE-class devices the CTA falls below the fold. Restructure:

- Root: `ScreenWrapper scroll={false} padded={false} background="base"`, inner layout = column: `<ScrollView style={{flex:1}} contentContainerStyle={{paddingHorizontal: layout.screenPadding}}>` containing hero / features / planSelector / secondaryAction / legalFooter (existing spacing preserved), then a **fixed footer View** (sibling after the ScrollView, not inside it).
- Fixed footer spec: `paddingHorizontal: layout.screenPadding`, `paddingTop: space['3']`, `paddingBottom: max(safe-area inset bottom, space['4'])` (use `useSafeAreaInsets` — already a project dependency via React Navigation), `backgroundColor: tokens.surface.base`, `borderTopWidth: StyleSheet.hairlineWidth`, `borderTopColor: tokens.border.subtle`.
- New props on `PaywallShellProps`: `ctaSubline?: React.ReactNode` (renders directly under `primaryCta`, centered, `marginTop: space['2']`) and `footerAction?: React.ReactNode` (renders under the subline, centered, `marginTop: space['3']`). `primaryCta`, `ctaSubline`, `footerAction` all render inside the fixed footer. `secondaryAction` and `legalFooter` stay in the scroll area.
- Reduce hero vertical padding from `space['8']` to `space['6']` to reclaim fold space.

### Change 2 — CustomPaywall: plan rows with price math

Add two computed helpers (live RC data only — if `currentOffering` is null, render nothing for these elements; NEVER compute from `FALLBACK_PRICE`):

- `perMonthFor('annual')`: `annualPkg.product.price / 12`, formatted with `Intl.NumberFormat(undefined, {style:'currency', currency: product.currencyCode})` → e.g. `$8.33/mo`.
- `savingsVsWeekly`: `Math.round((1 - annualPrice / (weeklyPrice * 52)) * 100)` → e.g. `68`. Render only if both live prices exist and result is between 1 and 99.

Plan row redesign (replace current `planRow` / `planRowSelected` styles):

- **Base row:** `borderRadius: radius.lg`, `paddingVertical: space['4']`, `paddingHorizontal: space['4']`, `borderWidth: 1`, `borderColor: tokens.border.subtle`. Unselected rows additionally `opacity: 0.85`.
- **Selected row:** `opacity: 1`, `borderWidth: 2`, `borderColor: tokens.accent.emphasis`, `backgroundColor: tokens.accent.subtle`. To prevent layout shift between 1px/2px borders, keep `borderWidth: 2` on all rows and use `transparent`-toned `tokens.border.subtle` for unselected (or `margin: -1` compensation — pick the cleaner; no jump on selection).
- **Selection indicator:** leading radio glyph column, 20px circle: unselected `borderWidth:1.5, borderColor: tokens.border.strong`; selected filled `tokens.accent.emphasis` with inner 8px dot `tokens.text.inverse`.
- **Price column:** selected plan price renders `variant="heading1"` (24px), unselected `variant="heading2"` (20px), color primary.
- **Annual row extras:** under the price, `Text variant="caption"` color `accent` (use a style override `color: tokens.accent.emphasis`): `≈ {perMonth}/mo` (live only). On the row's left column under the cadence line, a **savings chip**: `backgroundColor: tokens.accent.primary`, `borderRadius: radius.xs`, `paddingHorizontal: space['2']`, `paddingVertical: space['0.5']`, child `Text variant="subMicro"` with `color: tokens.text.inverse`: `SAVE {n}%` (live only).
- **Badge ("BEST VALUE" — copy unchanged):** convert from outline to **filled chip overlapping the card's top edge**: `position:'absolute'`, `top: -10`, `left: space['4']`, `backgroundColor: tokens.accent.primary`, `borderRadius: radius.pill`, `paddingHorizontal: space['2.5'] ?? 10`, `paddingVertical: 2`, child `Text variant="micro"` `color: tokens.text.inverse`. Give the annual row `marginTop: space['2']` so the chip doesn't clip; parent `plans` View needs `overflow: 'visible'`.
- Update each row's `accessibilityLabel` to include the per-month and savings figures when present (e.g. "Annual, $99.99 per year, about $8.33 per month, save 68 percent, best value").

### Change 3 — CustomPaywall: trust line + CTA subline

- Between `features` and `planSelector`, add the trust line that PremiumTeaser already carries (copy verbatim from `PremiumTeaserScreen.tsx`): "Every word calculated from your exact birth moment — not a sun-sign guess." Style: `Text variant="caption"` color secondary, centered, `marginTop: space['5']`.
- Pass new `ctaSubline` to the shell: `Text variant="caption"` color tertiary, centered, dynamic on selection: `{priceFor(selected)} {cadence} · cancel anytime in the App Store` — uses `priceFor()` which already falls back safely to `FALLBACK_PRICE` (price *display* may use fallback as today; only *derived math* may not).
- Move "Maybe later" into the shell's new `footerAction` slot (so it stays visible with the CTA). "Restore Purchases", error text, and legal block remain in the scroll area exactly as now.

### Verification (report back, do not commit until diff review)

1. `npx tsc --noEmit` passes.
2. iPhone SE (3rd gen) simulator: CTA + subline + "Maybe later" visible without scrolling; no badge clipping; selecting each plan updates subline and shows no layout jump.
3. With offerings stubbed to null: no per-month line, no savings chip, no crash; CTA still works against fallback display prices.
4. VoiceOver: each plan row announces label, price, per-month, savings, selected state.
5. Confirm zero new hex literals and zero files changed beyond the two named.

---

## PROMPT P2 — Momentum screen + life-focus echo

---

**TASK: Insert a chart-preparation transition screen between OptionalQuestions and PremiumTeaser, and make PremiumTeaser echo the user's stated life focus. Files: create `src/screens/onboarding/ChartPreparationScreen.tsx`; edit `src/navigation/RootNavigator.tsx`, `src/screens/onboarding/OptionalQuestionsScreen.tsx`, `src/screens/onboarding/PremiumTeaserScreen.tsx`. Nothing else. No new dependencies (use `Animated` from react-native).**

**Hard constraint:** every string shown must be TRUE. No fake progress percentages, no invented user counts, no testimonials (none exist yet). The screen narrates real work products only.

### ChartPreparationScreen

- Read from `useProfileStore`: the user's real Big Three / placements (inspect the store first and use whichever real fields exist — e.g. sun/moon/rising signs, archetype). 
- Visual: `ScreenWrapper` base background, centered column. Eyebrow `Text variant="eyebrow"` color secondary: "PREPARING YOUR READING". Then three lines that fade in sequentially (Animated opacity+translateY 8px, ~500ms each, ~700ms apart, `easeOut`), each `Text variant="bodyLarge"` color primary with a leading bronze check (lucide `Check`, 16px, `tokens.accent.emphasis`):
  1. "Mapping all 10 planets from your birth moment"
  2. "Reading your {sunSign} Sun against today's sky" (live field; if missing, "Reading your chart against today's sky")
  3. "Preparing your 90-day window"
- After the third line settles (+~600ms), auto-`navigation.replace('PremiumTeaser')`. Total dwell ≤ 3.2s. No buttons. `gestureEnabled: false` like the rest of the post-reveal flow. Respect reduced motion (`AccessibilityInfo.isReduceMotionEnabled` → render all lines immediately, dwell 1.2s).

### Wiring

- `RootNavigator.tsx`: register `ChartPreparation` Stack.Screen next to the other onboarding screens, `options={{ gestureEnabled: false }}`.
- `OptionalQuestionsScreen.tsx`: both `saveAllAndNavigate()` and the "Skip for now" path change `navigation.replace('PremiumTeaser')` → `navigation.replace('ChartPreparation')`.
- Add the screen to the navigation param list type wherever the other onboarding screens are declared.

### Life-focus echo (PremiumTeaserScreen)

- Read `useProfileStore((s) => s.answers['life_focus'])`. It is a JSON-serialized string array (see OptionalQuestionsScreen QUESTIONS for the exact option values — build the mapping from those values, do not guess). Map the FIRST selected value to a phrase (e.g. love → "your love life", work/career → "your work decisions", etc. per the actual option set).
- If present, replace the generic tail of Benefit 2 ("daily guidance written for your chart") with "daily guidance for {focusPhrase}, written for your chart". If absent or unparseable, keep the existing copy verbatim. Wrap the JSON.parse in try/catch.

### Verification

1. `npx tsc --noEmit` passes.
2. Full onboarding run-through: Questions → ChartPreparation (3 lines tick in) → PremiumTeaser; skip path identical; back-gesture disabled.
3. Reduced-motion setting: lines render instantly, no animation.
4. life_focus selected → echoed phrase appears; skipped → original copy byte-identical.

---

## PROMPT P3 — W5 paywall re-entry + W4 funnel teasers

---

**TASK: Give free users a persistent route back to the PremiumTeaser surface (W5) and surface the Compatibility/Calendar funnels in context (W4). Files: `src/screens/tabs/TodayScreen.tsx`, `src/screens/tabs/ReadingsScreen.tsx`. Nothing else.**

**Read-only first:** inspect how TodayScreen renders its existing locked cards (`!isPremium` branches) and reuse that exact card component/pattern — do not invent a new card style. Inspect how navigation to `Compatibility` and `Calendar` screens is done from MoreScreen and reuse it.

### W5 — Unlock pill (TodayScreen)

- Condition: `storeHydrated && !isPremium` (same hydration guard as the A5 intro card).
- Element: compact pill in the Today header area: `borderWidth: 1`, `borderColor: tokens.border.accent`, `borderRadius: radius.pill`, `paddingHorizontal: space['3']`, `paddingVertical: space['1.5']`, child `Text variant="micro"` `color: tokens.accent.emphasis`: "UNLOCK {ARCHETYPE NAME}" (fall back to "UNLOCK PREMIUM" if archetype missing). Min tap target 44px (`hitSlop` as needed).
- Action: `navigation.navigate('PremiumTeaser')` (the narrative surface — NOT `presentPaywall()` directly). Track with the existing analytics helper: `track('premium_teaser_opened', { source: 'today_header_pill' })` — match existing event-naming conventions you find in the file.

### W4 — Two teaser cards

1. **ReadingsScreen — Compatibility teaser** (free AND premium users; it's an IAP/feature, placement after the existing locked/feature cards): reuse the locked-card pattern. Copy — title: "Compatibility"; body: "Full chart compatibility for two people — not a sun-sign match. See how your charts actually fit." CTA routes to the Compatibility screen (which owns its own IAP sheet).
2. **TodayScreen — Calendar teaser** (below the existing locked cards): title: "2026 Lucky Timing Calendar"; body: "Auspicious dates for love, work, money, and major decisions — all 12 months." Routes to the Calendar screen.
- Both cards: identical visual primitives to the existing locked cards (same component, spacing `layout.cardGap`, no new styles beyond what the pattern needs).

### Verification

1. `npx tsc --noEmit` passes.
2. Free user: pill visible on Today, opens PremiumTeaser, decline returns to MainTabs cleanly (PremiumTeaser's existing replace behavior); premium user: pill absent.
3. Teaser cards render for the correct audiences and navigate correctly; no duplicate Compatibility entry if ReadingsScreen already references it anywhere.
4. Cold start with slow hydration: pill does not flash for premium users (hydration guard works).

---

## PROMPT P4 — Free vs Premium comparison table *(run after P1 is merged)*

---

**TASK: Add a collapsible Free vs Premium comparison table to the custom paywall. Files: create `src/components/molecules/PlanComparisonTable.tsx`; edit `src/components/organisms/CustomPaywall.tsx` (insert between trust line and plan selector). Nothing else.**

- Trigger row: `Pressable` centered text `Text variant="label"` color accent ("See everything inside") with chevron (lucide `ChevronDown`/`ChevronUp`, 16px, `tokens.accent.emphasis`). Collapsed by default. `LayoutAnimation` or `Animated` height — no new deps.
- Table: 6 rows × 3 columns (feature label / FREE / PREMIUM). Header row: `Text variant="subMicro"` color tertiary. Feature labels `Text variant="caption"` color secondary. Checks: lucide `Check` 16px `tokens.accent.emphasis`; absent: an em-dash `Text variant="caption"` color tertiary (not a red X — we never shame the free tier).
- Row content (verified against real entitlements — keep exactly):
  1. Daily reading & moon phase — ✓ / ✓
  2. Love, Work & Health guidance — — / ✓
  3. Full archetype portrait & natal chart (all 10 planets) — — / ✓
  4. 90-day forecast — — / ✓
  5. Counsel — 30 conversations/month — — / ✓
  6. Compatibility — 10 readings/month — — / ✓
- Surfaces: row separators `StyleSheet.hairlineWidth` `tokens.border.subtle`; PREMIUM column header in `tokens.accent.emphasis`; no card background (sits flat on the paywall surface).
- Accessibility: the trigger announces expanded/collapsed state.

### Verification

1. `npx tsc --noEmit`; SE simulator: expanding the table never pushes the pinned CTA off-screen (footer is fixed — confirm).
2. Row 5/6 numbers match `entitlements` reality (30/month, 10/month) — cite where you verified.

---

## PROMPT P5 — Polish: contrast sweep, haptics, upsell arithmetic

---

**TASK: Three small fixes. Files: any component rendering bronze `accent.primary` text at `micro`/`subMicro`/`caption` size on card surfaces (sweep — list them in your report before editing), `src/components/organisms/CustomPaywall.tsx` (haptics only), `src/components/molecules/PostPurchaseUpsellSheet.tsx`.**

1. **Contrast sweep:** `accent.primary #A87D4E` on `surface.base/raised` is 4.15:1 — fails WCAG AA below 18px. Grep for `color: tokens.accent.primary` / `color="accent"` usages at micro/subMicro/caption sizes rendered on card surfaces; swap text color to `tokens.accent.emphasis #C49A5E` (5.92:1). Do NOT touch borders, icons ≥18px, or large-type accent uses. Report the full list of changed call sites.
2. **Selection haptics:** in `CustomPaywall` plan-row `onPress`, add `Haptics.selectionAsync()` (expo-haptics is already a dependency — verify via Button.tsx import).
3. **Upsell arithmetic:** in `PostPurchaseUpsellSheet`, under the existing copy, add a compact visual sum line: `{n} bought` chip + "+" + `30/month` chip = stacked total, using existing chip-style tokens (`surface.overlay` fill, `radius.sm`, `Text variant="label"`). Pure presentation; no logic changes.

### Verification

1. `npx tsc --noEmit`; visual pass on every changed call site (screenshot list).
2. Haptic fires on plan selection on device (note: simulator won't vibrate — confirm no crash).

---

## PROMPT P6 — Welcome screen conversion fixes (decisions locked by research 2026-06-11)

---

**TASK: Four surgical changes to `src/screens/onboarding/WelcomeScreen.tsx`. One file only. No copy changes to headline/subhead/eyebrow (locked A2 copy). No layout restructuring.**

1. **CTA variant:** `Button` for "Reveal my chart" changes `variant="premium"` → `variant="primary"` (bronze fill). Rationale on file: premium navy surface fails WCAG 1.4.11 non-text contrast vs background (1.23–1.74:1 < 3:1); bronze passes at 5.09:1. Do NOT use `variant="cta"` — orange remains purchase-exclusive.
2. **CTA microcopy:** directly under the Button (inside the same `actions` View, gap preserved): `Text variant="caption" color="tertiary"`, centered: `Free · takes about a minute`. Exactly this string — it is factually true (Big Three reveal is free, no account required) and must not be embellished.
3. **Analytics:** CTA `onPress` becomes `() => { track('welcome_cta_tapped'); navigation.navigate('Name') }`. Match the import already present (`track` from `../../lib/analytics`). Also add `track('welcome_signin_tapped')` to the sign-in Pressable's onPress before `showAuthGate(...)`.
4. **Animation timing:** `WELCOME_CTA_TRANSITION` delay `600` → `400`; `WELCOME_SUBHEAD_TRANSITION` delay `400` → `300`. Headline and wordmark timings unchanged.

### Verification
1. `npx tsc --noEmit` passes; only one file in the diff.
2. Simulator: bronze button clearly bounded against the atmosphere; microcopy renders single-line on SE-width; CTA interactive by ~1.0s.
3. Both new events fire (console/PostHog debug).
4. Confirm "Free · takes about a minute" wording matches exactly.

### Deferred (do not implement)
- DOB-first reorder → post-launch experiment #1: variant = Welcome routes to DateOfBirth before Name; metric = welcome→reveal completion; guardrail = reveal→teaser rate; minimum sample before judging.
- Proof laurel above CTA → blocked until real App Store ratings exist.

---

## After each prompt

Windsurf reports → founder reviews diff → hold locally → SE-simulator + device verification → commit. Update the checklist table at the top of this file. Only then generate/send the next prompt.
