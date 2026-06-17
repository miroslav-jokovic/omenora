# OMENORA — Phase C (Paywall Structure): Windsurf Execution Prompts

**Companion to:** `2026-06-09-visual-design-audit.md` and `2026-06-09-visual-polish-windsurf-prompts.md`
**Date:** 2026-06-09
**Status of prior phases:** Phase A (CTA) and Phase B (contrast) are already implemented and type-clean in this repo. Phase C below supersedes the placeholder C-section of the earlier prompts doc with **verified** field names and anchors.

All facts below were confirmed by reading the actual source and the installed `react-native-purchases` v10 type definitions. Where a value cannot come from code (real ratings, discounted prices, final feature wording), the prompt forces a typed prop + `// TODO` instead of fabrication.

---

## Verified facts Windsurf must rely on (do not re-derive, do not assume beyond these)

**Live paywall:** `src/components/organisms/CustomPaywall.tsx`, mounted once in `src/context/PurchasesProvider.tsx` (~line 290) as `<CustomPaywall visible={paywallVisible} source={paywallSource} onClose={handlePaywallClose} onPurchased={handlePaywallPurchased} />`. The component returns `null` when `!visible` but **stays mounted**, so local state persists across open/close — reset state with a `useEffect` on `visible`.

**Existing helpers in CustomPaywall.tsx:**
- `type PlanKey = 'weekly' | 'monthly' | 'annual'`
- `PLAN_META: { key: PlanKey; label: string; cadence: string; badge?: string }[]` — order is annual, monthly, weekly; annual has `badge: 'BEST VALUE'`.
- `packageFor(key: PlanKey): PurchasesPackage | null`
- `priceFor(key: PlanKey): string` → `packageFor(key)?.product.priceString ?? FALLBACK_PRICE[key]`
- `const [selected, setSelected] = useState<PlanKey>('annual')`
- `handleContinue` → builds `pkg = packageFor(selected)`, then `purchaseSubscription(pkg)`.
- Primary CTA already uses `variant="cta"` (Phase A2). Plan rows render inside the `planSelector` slot. The "Maybe later" `Pressable` lives in `secondaryAction` and calls `onClose`.

**RevenueCat v10 `PurchasesStoreProduct` (access via `packageFor(key)?.product`) — exact fields confirmed:**
- `price: number` — value in local currency. For the **weekly** product this number *is* the weekly price.
- `priceString: string` — locale-formatted total.
- `pricePerWeek: number | null`, `pricePerMonth: number | null`, `pricePerYear: number | null` — `null` for non-subscriptions; may be approximate.
- `pricePerWeekString: string | null`, `pricePerMonthString: string | null`, `pricePerYearString: string | null` — locale-formatted, currency sign included. **Use these for display so no manual currency formatting is needed.**
- `currencyCode: string`
- `introPrice: PurchasesIntroPrice | null`
- `subscriptionPeriod: string | null` — ISO 8601 (`P1W`, `P1M`, `P1Y`).

**`PurchasesIntroPrice` — exact fields confirmed:**
- `price: number` — **`0` means a free trial.**
- `priceString: string`
- `cycles: number`
- `period: string` (ISO 8601)
- `periodUnit: string` — one of `'DAY' | 'WEEK' | 'MONTH' | 'YEAR'`
- `periodNumberOfUnits: number`

**BottomSheet** (`src/components/organisms/BottomSheet.tsx`): props are exactly `{ visible: boolean; onClose: () => void; height?: number; children: React.ReactNode }`. No title/header prop — content is fully custom children. Dismiss-on-backdrop and swipe-down already built in.

**Icons:** `Check` from `'lucide-react-native'` is already used in the repo (e.g. `LanguageScreen.tsx`). `Minus` is available from the same package.

**Tokens available (names confirmed):** `tokens.accent.subtle`, `tokens.accent.emphasis` (`#C49A5E`), `tokens.state.success` (`#7B9472`), `tokens.text.disabled`, `tokens.border.hairline`, `tokens.cardTokens`? — NOTE: the card background tuple is exported as `cardTokens.background.contentGradient` from `src/design/tokens/surface.ts` (import `cardTokens` directly, it is **not** under `tokens.`). `radius.xs/lg/xl`, `space[...]`, `layout.cardPaddingDefault`. Text variants: `monoBody`, `micro`, `label`, `caption`, `body`.

**Feature scope:** Compatibility and the Lucky Timing Calendar are **separate one-time IAPs** (`purchaseCompatibilitySingle`, `purchaseBoostPack` in PurchasesProvider) — they are **NOT** part of the Premium subscription. Do **not** list them as Premium features in the comparison table.

**Grounded Free-vs-Premium split** (derived from `TodayScreen.tsx` gating + the paywall's own benefit copy; confirm before shipping):
| Feature | Free | Premium |
|---|---|---|
| Daily archetype reading | excerpt | full |
| Your Big Three (Sun/Moon/Rising) | ✓ | ✓ |
| Full natal chart — every planet | ✗ | ✓ |
| Daily Love / Work / Health | ✗ | ✓ |
| Daily reflection & planetary weather | ✗ | ✓ |
| 90-day forecast | ✗ | ✓ |
| Counsel — your AI astrologer | ✗ | ✓ |

---

## Global instruction for the Windsurf session (paste once)

```
You are editing OMENORA (mobile-app/), src/components/organisms/CustomPaywall.tsx unless stated otherwise. Rules:
1. PRECISION: make only the change described; no refactors, renames, reordering, or reformatting of unrelated code.
2. NO FABRICATION: never hardcode prices, savings, ratings, counts, or trial lengths. Every number must derive from the RevenueCat package already available via packageFor(key), or come from a typed prop the human will fill. If a value isn't available, render nothing (no placeholder) — the paywall must look exactly as it does today when the live offering hasn't loaded.
3. TOKENS ONLY: import design tokens; no raw hex/spacing. cardTokens comes from '../../design/tokens' (re-exported from surface.ts) — confirm the import resolves before use.
4. VERIFY: after each task run `npx tsc --noEmit` and report the exact result. Do not mark done on any type error.
5. Use the verified RevenueCat field names provided; if any field is missing at runtime treat it as null and skip that UI.
```

---

## C1 — Per-period price + savings %

### Prompt
```
Goal: in src/components/organisms/CustomPaywall.tsx, add a per-period price line and a savings badge to the plan rows, deriving everything from packageFor(key)?.product. Do not fabricate numbers.

1. Add a helper above the return:
   const perWeekStringFor = (key: PlanKey): string | null =>
     packageFor(key)?.product.pricePerWeekString ?? null
   Render a per-week line ONLY for the 'annual' and 'monthly' rows (skip 'weekly', where it equals the total). Inside the existing planLeft View, under the cadence Text, add:
     {(p.key === 'annual' || p.key === 'monthly') && perWeekStringFor(p.key) != null && (
       <Text variant="monoBody" color="secondary">{`${perWeekStringFor(p.key)} / week`}</Text>
     )}

2. Add a savings calculation for the annual plan, computed strictly from numeric fields:
   const annualPerWeek = packageFor('annual')?.product.pricePerWeek ?? null
   const weeklyPrice   = packageFor('weekly')?.product.price ?? null
   const annualSavingsPct =
     annualPerWeek != null && weeklyPrice != null && weeklyPrice > 0
       ? Math.round((1 - annualPerWeek / weeklyPrice) * 100)
       : null
   Render a filled savings badge on the annual row only, next to (not replacing) the existing "BEST VALUE" badge, ONLY when annualSavingsPct != null && annualSavingsPct > 0:
     <View style={styles.savingsBadge}>
       <Text variant="micro" style={{ color: tokens.accent.emphasis }}>{`SAVE ${annualSavingsPct}%`}</Text>
     </View>

3. Add to StyleSheet:
   savingsBadge: {
     backgroundColor: tokens.accent.subtle,
     borderRadius: radius.xs,
     paddingVertical: space['0.5'],
     paddingHorizontal: space['2'],
   }

Do not change priceFor, packageFor, FALLBACK_PRICE, plan order, or purchase logic. When packages are null (offering not loaded) nothing new must render. Run `npx tsc --noEmit`.
```

### Acceptance criteria
- Annual/monthly rows show a locale-formatted "…/week" line only when real data exists.
- Annual row shows "SAVE N%" only when both annual and weekly packages are loaded and N>0.
- Fallback/pre-load state visually unchanged. `tsc` clean.

### Verify
```
grep -n "pricePerWeekString\|annualSavingsPct\|savingsBadge" src/components/organisms/CustomPaywall.tsx
npx tsc --noEmit
```

---

## C2 — Free-vs-Premium comparison table

### Prompt
```
In src/components/organisms/CustomPaywall.tsx, add a Free-vs-Premium comparison table in the `features` slot, BELOW the two existing <EditorialBenefit> blocks (inside the same <View style={styles.features}>).

Imports: add `Check, Minus` from 'lucide-react-native' (Check pattern already used elsewhere in the repo); add `cardTokens` to the existing token import from '../../design/tokens' and confirm it resolves.

Data (define as a const array inside the component file, above the component or above the return). // TODO: founder to confirm exact wording/scope before release:
   const COMPARISON: { label: string; free: boolean; premium: boolean }[] = [
     { label: 'Daily archetype reading', free: true,  premium: true  },  // free = excerpt, premium = full
     { label: 'Your Big Three',          free: true,  premium: true  },
     { label: 'Full natal chart',        free: false, premium: true  },
     { label: 'Daily Love / Work / Health', free: false, premium: true },
     { label: 'Reflection & planetary weather', free: false, premium: true },
     { label: '90-day forecast',         free: false, premium: true  },
     { label: 'Counsel — AI astrologer', free: false, premium: true  },
   ]
Do NOT include Compatibility or the Lucky Timing Calendar — they are separate one-time IAPs, not Premium.

Render: a container using a LinearGradient background (colors={cardTokens.background.contentGradient}, vertical) with borderRadius radius.lg and padding layout.cardPaddingDefault. A header row: an empty left cell, then right-aligned "Free" and "Premium" labels (Text variant="micro" color="tertiary"). Then one row per COMPARISON item: label on the left (Text variant="label" color="secondary", flex 1), and two fixed-width cells — for each of free/premium render <Check size={16} color={tokens.state.success}/> when true else <Minus size={16} color={tokens.text.disabled}/>. Separate rows with borderBottomWidth 0.5 / borderColor tokens.border.hairline (no border on the last row). Keep the two columns aligned with fixed-width cells (e.g. 56px each).

LinearGradient is from 'expo-linear-gradient' (already used in this codebase). Run `npx tsc --noEmit`.
```

### Acceptance criteria
- Table renders the 7 grounded rows with aligned Free/Premium check/minus columns; no Compatibility/Calendar rows; a `// TODO` for founder confirmation is present. `tsc` clean.

---

## C3 — Benefit-led + trial-aware CTA copy

### Prompt
```
In src/components/organisms/CustomPaywall.tsx, make the primary CTA label benefit-led and trial-aware, derived from the SELECTED package's introPrice. Do not assume a trial exists.

1. Add a helper:
   const freeTrialLabelFor = (key: PlanKey): string | null => {
     const intro = packageFor(key)?.product.introPrice
     if (intro == null || intro.price !== 0) return null
     const n = intro.periodNumberOfUnits
     const unit = intro.periodUnit            // 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'
     const unitWord = unit.toLowerCase() + (n === 1 ? '' : 's')  // day/days, week/weeks...
     return `Start ${n} ${unitWord} free`
   }
2. Compute the label for the primary CTA:
   const ctaLabel = freeTrialLabelFor(selected) ?? 'Reveal my full chart'
   Replace the hardcoded label="Unlock Premium" on the primary <Button variant="cta" ...> with label={ctaLabel}. Keep variant="cta", loading, disabled, onPress unchanged.

Do NOT add any free-trial toggle UI (Apple rejects trial toggles as of Feb 2026). Run `npx tsc --noEmit`.
```

### Acceptance criteria
- CTA reads "Start N day(s)/week(s) free" only when the selected package has a zero-price intro; otherwise "Reveal my full chart". No toggle. `tsc` clean.

### Verify
```
grep -n "freeTrialLabelFor\|Reveal my full chart\|ctaLabel" src/components/organisms/CustomPaywall.tsx
```

---

## C4 — Social-proof strip (GATED — no fabricated numbers)

### Prompt
```
In src/components/organisms/CustomPaywall.tsx, add an OPTIONAL social-proof line under the hero. Do not hardcode any rating or count.

1. Add to CustomPaywallProps: `socialProof?: string`.
2. In the component signature, destructure socialProof.
3. In the `hero` slot, after the archetype Text, render only when provided:
   {socialProof != null && (
     <Text variant="micro" color="secondary" style={{ textAlign: 'center', marginTop: space['3'] }}>{socialProof}</Text>
   )}
4. Add a comment above it: // TODO: pass a REAL App Store rating / verified user count from a trusted source. Never fabricate.
5. In src/context/PurchasesProvider.tsx do NOT pass socialProof yet (leave undefined).

Run `npx tsc --noEmit`.
```

### Acceptance criteria
- Renders only when a real string is supplied; nothing shown today; `// TODO` present. `tsc` clean.

---

## C5 — Post-dismiss win-back offer (one-time per open)

### Prompt
```
In src/components/organisms/CustomPaywall.tsx, intercept the "Maybe later" dismiss once per paywall open with a win-back BottomSheet offering the annual plan at its real price. Do not invent a discount.

1. Refactor purchase entry so a specific plan can be purchased without relying on async setState:
   - Rename the body of handleContinue into `const purchasePlan = async (key: PlanKey) => { ... }` using `key` instead of `selected` (i.e. `const pkg = packageFor(key)` and track('subscription_purchase_succeeded', { plan: key, source: ... })).
   - Define `const handleContinue = () => purchasePlan(selected)`. Keep the primary CTA calling handleContinue.
2. Add state: `const [winbackVisible, setWinbackVisible] = useState(false)` and `const [winbackUsed, setWinbackUsed] = useState(false)`.
3. Add `const handleMaybeLater = () => { if (!winbackUsed && packageFor('annual') != null) { setWinbackUsed(true); setWinbackVisible(true) } else { onClose() } }`. Change the "Maybe later" Pressable's onPress from onClose to handleMaybeLater. Leave the Modal's onRequestClose as onClose (hardware back fully closes).
4. Reset on open: add `useEffect(() => { if (visible) { setWinbackUsed(false); setWinbackVisible(false) } }, [visible])`.
5. Render a BottomSheet as a sibling AFTER <PaywallShell ... /> but still inside the <Modal>:
   <BottomSheet visible={winbackVisible} onClose={() => { setWinbackVisible(false); onClose() }}>
     ...content...
   </BottomSheet>
   Content: a short headline (Text variant="heading2" color="primary", e.g. "One more thing"), a value line (Text variant="body" color="secondary") that references the real annual price via priceFor('annual') and the annual per-week string if available — DO NOT state any discount or "limited time" unless a real promotional offering is wired (leave a // TODO for a RevenueCat promotional offer). A primary <Button variant="cta" fullWidth label={`Continue — ${priceFor('annual')} / year`} onPress={() => { setWinbackVisible(false); purchasePlan('annual') }} />, and a <Button variant="tertiary" fullWidth label="No thanks" onPress={() => { setWinbackVisible(false); onClose() }} />.
6. Import BottomSheet from '../organisms/BottomSheet' (same folder — use './BottomSheet').

Keep all existing purchase/restore logic intact. Run `npx tsc --noEmit`.
```

### Acceptance criteria
- First "Maybe later" opens the win-back sheet; dismissing it (or "No thanks") closes the paywall; reopening the paywall resets so it can show again next session.
- Win-back uses the **real** annual price; no fabricated discount; `// TODO` for promotional offer present. `tsc` clean.

### Verify
```
grep -n "purchasePlan\|winbackVisible\|handleMaybeLater\|BottomSheet" src/components/organisms/CustomPaywall.tsx
npx tsc --noEmit
```

---

## Recommended execution order & commits
1. C1 — `feat(paywall): per-period price + savings badge`
2. C3 — `feat(paywall): trial-aware benefit CTA copy`  *(small, do before the table so the CTA is verified early)*
3. C2 — `feat(paywall): free-vs-premium comparison table`
4. C4 — `feat(paywall): optional social-proof prop (gated)`
5. C5 — `feat(paywall): one-time win-back on dismiss`

Run each as its own task + commit, with `npx tsc --noEmit` green before moving on. After all five, do a manual pass: open the paywall with the live offering, confirm per-week + SAVE% appear, the CTA reflects trial state, the table aligns, and "Maybe later" shows the win-back exactly once.

## Human sign-off required before release (never let the tool fill these)
- C2: confirm the 7 feature rows and the "excerpt vs full" framing match the real entitlement.
- C3: trial length comes from the live App Store Connect offering — verify the configured intro period.
- C4: supply a real rating/count, or leave the strip off.
- C5: if you want an actual *discounted* win-back, configure a RevenueCat promotional offering and wire it; until then the sheet uses the standard annual price.
```
