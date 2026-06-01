# Design System Cleanup Plan

**Goal:** One canonical import pattern across every file. Delete the competing system.  
**Standard pattern:** `import { tokens, space, layout, ... } from '../../design/tokens'`  
**Status:** [x] COMPLETE  
**Last verified:** Full exhaustive scan — all files confirmed

---

## The Two Problems

### Problem 1 — Raw primitive imports (wrong pattern)
Two ways to access the same token data exist simultaneously:

| Pattern | Example | Status |
|---------|---------|--------|
| ✅ **Standard** — namespaced via `tokens` object | `tokens.surface.base` | Keep |
| ❌ **Old** — raw primitive destructured directly | `surface.base` (imported as `surface`) | Eliminate |

Both read identical values from `colors.ts`. The old pattern bypasses the `tokens` aggregate.

### Problem 2 — ThemeProvider cold-purple gradient
`App.tsx` wraps the entire app in `ThemeProvider` which renders:
```
LinearGradient colors={['#050410', '#0a0a1a', '#050410']}
```
This is a **cold-purple/indigo** gradient that conflicts with the warm-charcoal token system (`tokens.surface.base = #15110D`). It affects every single screen visually. `ThemeProvider` also provides `reduceMotion` state — that functionality must be preserved via a new standalone hook before deleting ThemeProvider.

---

## Complete File Inventory

### FILES TO DELETE (2)

| File | Why safe to delete |
|------|-------------------|
| `src/design/theme/ThemeProvider.tsx` | Cold-purple gradient + context wrapper. `reduceMotion` logic extracted to new hook first |
| `src/design/theme/useTheme.ts` | Thin proxy for `ThemeContext` — no logic of its own |

**Also update:** `App.tsx` — remove `ThemeProvider` import and wrapper after deletion.

---

### SCREENS — needs fix (10 files)

All have raw primitive imports. Fix = replace primitive with `tokens.xxx` and clean import line.

| File | Remove from import | All usages to fix |
|------|--------------------|-------------------|
| `onboarding/WelcomeScreen.tsx` | `surface, accent, text, fontFamily` | `surface.base` → `tokens.surface.base`<br>`accent.primary` → `tokens.accent.primary`<br>`text.disabled` → `tokens.text.disabled`<br>`text.tertiary` → `tokens.text.tertiary`<br>`fontFamily.displayItalic` → `tokens.fontFamily.displayItalic`* |
| `onboarding/SplashScreen.tsx` | `surface` | `surface.base` → `tokens.surface.base` |
| `onboarding/CalculatingScreen.tsx` | `surface` | `surface.base` → `tokens.surface.base` |
| `onboarding/NameScreen.tsx` | `surface` (keep `tokens`) | `surface.base` → `tokens.surface.base` |
| `onboarding/BirthCityScreen.tsx` | `surface` (keep `tokens`) | `surface.base` → `tokens.surface.base` |
| `onboarding/DateOfBirthScreen.tsx` | `surface` (keep `tokens`) | `surface.base` → `tokens.surface.base` |
| `onboarding/BirthTimeScreen.tsx` | `surface` (keep `tokens`) | `surface.base` → `tokens.surface.base` |
| `onboarding/PremiumTeaserScreen.tsx` | `surface, border` | `surface.deep` → `tokens.surface.deep`<br>`border.gold` → `tokens.border.gold` |
| `onboarding/SaveYourReadingScreen.tsx` | `typeScale, fontFamily` (keep `tokens`) | `typeScale.labelLarge` → `tokens.typeScale.labelLarge`*<br>`fontFamily.uiSemiBold` → `tokens.fontFamily.uiSemiBold`* |
| `tabs/ReadingsScreen.tsx` | `accent` (keep `tokens`) | `accent.primary` (2 uses as `fill` prop on ArchetypeIcon) → `tokens.accent.primary` |

> *Note: `typeScale` and `fontFamily` are exported as named exports from tokens barrel but are NOT properties on the `tokens` aggregate object. They stay as direct named imports — just remove the redundant raw primitive ones where both exist. See note below.

---

### SCREENS — already standard, no changes needed (19 files) ✅

`onboarding/BigThreeRevealScreen.tsx`, `onboarding/OptionalQuestionsScreen.tsx`,  
`counsel/CounselChatScreen.tsx`, `counsel/CounselDisclosureModal.tsx`,  
`tabs/CounselScreen.tsx`, `tabs/TodayScreen.tsx`, `tabs/MoreScreen.tsx`,  
`CalendarScreen.tsx`, `CompatibilityScreen.tsx`, `PrivacyScreen.tsx`, `TermsScreen.tsx`,  
`settings/CrisisResourcesScreen.tsx`, `settings/DeleteAccountScreen.tsx`,  
`settings/LanguageScreen.tsx`, `settings/NotificationsScreen.tsx`,  
`settings/PrivacySettingsScreen.tsx`, `settings/TraditionSwitcherScreen.tsx`,  
`settings/ProfileScreen.tsx`, `dev/ComponentsScreen.tsx`

---

### COMPONENTS — needs fix (5 files)

| File | Issue | Fix |
|------|-------|-----|
| `organisms/AuthGate.tsx` | `const { tokens } = useTheme()` — gets tokens via context | Replace with direct `import { tokens }` from tokens |
| `organisms/AuthGate.tsx` | `useTheme()` for `reduceMotion` | **AuthGate does NOT use `reduceMotion`** — confirmed by scan. Just remove `useTheme` entirely |
| `organisms/ReadingCard.tsx` | `import { space, text }` — raw `text` primitive | `text.disabled` → `tokens.text.disabled`. Remove `text`, keep `space` |
| `organisms/TransitCard.tsx` | `import { space, text }` — raw `text` primitive | `text.disabled` → `tokens.text.disabled`. Remove `text`, keep `space` |
| `atmosphere/AtmosphericBackground.tsx` | `import { accent, surface }` | `accent.primary` (8 usages) → `tokens.accent.primary`<br>`surface.deep` (3 usages) → `tokens.surface.base` / `tokens.surface.deep`<br>`surface.base` → `tokens.surface.base` |
| `atoms/Badge.tsx` | Hardcoded `'#FFFFFF'` in `countText` style | Replace with `tokens.specialty.white` |

### COMPONENTS — special case: raw primitives used as TypeScript type keys (leave as-is)

| File | Why acceptable |
|------|----------------|
| `atoms/Text.tsx` | Imports `text as textColors` and `typeScale` — used as `keyof typeof text` for prop typing. Cannot use `tokens.text` for this — TS doesn't support `keyof typeof tokens.text` cleanly with the current type structure |
| `atoms/Icon.tsx` | Same reason — `text` and `accent` imported for `keyof` type unions on prop API |

These two files are **intentionally** using direct imports for type inference. This is correct and should not change.

### COMPONENTS — useTheme consumers for reduceMotion (3 files — fix after new hook exists)

| File | Fix |
|------|-----|
| `organisms/BottomSheet.tsx` | Replace `const { reduceMotion } = useTheme()` with `const reduceMotion = useReduceMotion()` |
| `atoms/Skeleton.tsx` | Replace `const { reduceMotion } = useTheme()` with `const reduceMotion = useReduceMotion()` |
| `molecules/ProgressDots.tsx` | Replace `const { reduceMotion } = useTheme()` with `const reduceMotion = useReduceMotion()` |

---

### IMPORTANT NOTE — `typeScale` and `fontFamily` are NOT on `tokens`

`tokens` = `{ surface, text, accent, border, state, specialty, gradient }` — defined in `colors.ts`.  
`typeScale`, `fontFamily`, `space`, `layout`, `radius`, `motion`, `cardTokens` are **separate named exports** from the barrel (`tokens/index.ts`).  
They are correctly imported as: `import { tokens, space, layout, typeScale, fontFamily } from '../../design/tokens'`  
**Do NOT try to write `tokens.typeScale` — it doesn't exist.**

---

## Migration Plan (safe order)

### Phase 1 — Create `useReduceMotion` hook
- Create `src/hooks/useReduceMotion.ts` — extract `AccessibilityInfo` logic from `ThemeProvider`
- Update 3 consumers: `BottomSheet`, `Skeleton`, `ProgressDots`

### Phase 2 — Fix `AuthGate.tsx`
- Remove `useTheme` import entirely
- `const { tokens } = useTheme()` → `tokens` already in direct import on line 15 — just delete the `useTheme` call

### Phase 3 — Delete ThemeProvider system
- Delete `src/design/theme/ThemeProvider.tsx`
- Delete `src/design/theme/useTheme.ts`
- Remove `ThemeProvider` import + wrapper from `App.tsx`

### Phase 4 — Fix 10 screen files
- Replace each raw primitive with `tokens.xxx` equivalent
- Clean import lines (remove old primitive, add `tokens` if missing)

### Phase 5 — Fix 5 component files
- `ReadingCard.tsx`, `TransitCard.tsx`, `AtmosphericBackground.tsx`, `Badge.tsx`
- AuthGate done in Phase 2

### Phase 6 — Verify
```bash
npx tsc --noEmit
```
Zero errors = cleanup complete.

---

## What Does NOT Change

- Token values — no color changes whatsoever
- `src/design/tokens/` directory — untouched
- `atoms/Text.tsx` and `atoms/Icon.tsx` — intentionally keep raw imports for TS type inference
- All component APIs and props
- Business logic, navigation, RevenueCat, auth, storage

---

## Progress Tracker

- [x] Phase 1 — `src/hooks/useReduceMotion.ts` created, 3 consumers updated
- [x] Phase 2 — `AuthGate.tsx` `useTheme` removed
- [x] Phase 3 — `ThemeProvider.tsx` + `useTheme.ts` deleted, `App.tsx` updated
- [x] Phase 4 — 10 screen files updated
- [x] Phase 5 — 4 component files updated (ReadingCard, TransitCard, AtmosphericBackground, Badge)
- [x] Phase 6 — `tsc --noEmit` = 0 errors
- [x] Git commit — ce9f7d9 on feature/phase-5-counsel
