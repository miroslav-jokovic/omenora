# OMENORA Mobile App — Audit Reconnaissance
**Date:** 2026-06-05  
**Auditor:** Cascade (read-only, no code changes)  
**Scope:** `/Volumes/ESSD/Projects/Augur-V1/mobile-app/src/`

---

## 1. AUTHORITATIVE SECTION/SCREEN INVENTORY

### Root Stack Screens
Registered in `src/navigation/RootNavigator.tsx:38–77`.

| Route Name | File Path | Purpose |
|---|---|---|
| `Splash` | `src/screens/onboarding/SplashScreen.tsx` | Auth bootstrap, store hydration guard, routing decision |
| `Welcome` | `src/screens/onboarding/WelcomeScreen.tsx` | Entry CTA + sign-in |
| `Name` | `src/screens/onboarding/NameScreen.tsx` | Collect first name |
| `DateOfBirth` | `src/screens/onboarding/DateOfBirthScreen.tsx` | Collect DOB, calculate life path number |
| `BirthCity` | `src/screens/onboarding/BirthCityScreen.tsx` | Collect city of birth |
| `BirthTime` | `src/screens/onboarding/BirthTimeScreen.tsx` | Collect optional birth time |
| `Calculating` | `src/screens/onboarding/CalculatingScreen.tsx` | Calls `/api/generate-birth-chart`, sets archetype/signs |
| `BigThreeReveal` | `src/screens/onboarding/BigThreeRevealScreen.tsx` | Displays Sun/Moon/Rising + archetype name |
| `SaveYourReading` | `src/screens/onboarding/SaveYourReadingScreen.tsx` | Auth gate — Apple / Google / Email OTP sign-in |
| `OptionalQuestions` | `src/screens/onboarding/OptionalQuestionsScreen.tsx` | 3-question personalisation survey |
| `PremiumTeaser` | `src/screens/onboarding/PremiumTeaserScreen.tsx` | End of onboarding paywall upsell |
| `MainTabs` | `src/navigation/TabNavigator.tsx` | Shell for 4 bottom tabs |
| `Calendar` | `src/screens/CalendarScreen.tsx` | Lucky Timing 2026 — generate/display calendar |
| `Compatibility` | `src/screens/CompatibilityScreen.tsx` | Compatibility reading — input partner, generate |
| `TraditionSwitcher` | `src/screens/settings/TraditionSwitcherScreen.tsx` | Switch astrological tradition (Premium gate) |
| `CounselChat` | `src/screens/counsel/CounselChatScreen.tsx` | AI chat session with Counsel |
| `CrisisResources` | `src/screens/settings/CrisisResourcesScreen.tsx` | Static crisis hotlines |
| `Profile` | `src/screens/settings/ProfileScreen.tsx` | Edit name / DOB / birth time / city |
| `Notifications` | `src/screens/settings/NotificationsScreen.tsx` | Push notification toggle |
| `PrivacySettings` | `src/screens/settings/PrivacySettingsScreen.tsx` | Analytics opt-out |
| `Language` | `src/screens/settings/LanguageScreen.tsx` | Language selector (10 languages) |
| `DeleteAccount` | `src/screens/settings/DeleteAccountScreen.tsx` | Permanent account deletion flow |
| `Privacy` | `src/screens/PrivacyScreen.tsx` | Privacy policy (static) |
| `Terms` | `src/screens/TermsScreen.tsx` | Terms of service (static) |
| `Components` | `src/screens/dev/ComponentsScreen.tsx` | Dev-only component gallery (conditional: `__DEV__` guard at `RootNavigator.tsx:72`) |

### Tab Screens
Registered in `src/navigation/TabNavigator.tsx:38–43`.

| Tab Name | File Path | Purpose |
|---|---|---|
| `TodayTab` | `src/screens/tabs/TodayScreen.tsx` | Daily insight, moon phase hero, dimension cards |
| `ReadingsTab` | `src/screens/tabs/ReadingsScreen.tsx` | Archetype / Natal Chart / 90-Day Forecast |
| `CounselTab` | `src/screens/tabs/CounselScreen.tsx` | Counsel entry — paywall or chat CTA |
| `MoreTab` | `src/screens/tabs/MoreScreen.tsx` | Settings hub / account management |

### Purchase / Paywall Sheets
All are modal overlay components, not standalone screens.

| Component | File Path | Purpose |
|---|---|---|
| `CalendarIAPSheet` | `src/components/molecules/CalendarIAPSheet.tsx` | Calendar one-time purchase or Premium upsell |
| `CompatibilityIAPSheet` | `src/components/molecules/CompatibilityIAPSheet.tsx` | Single compatibility purchase or Premium upsell |
| `BoostPackSheet` | `src/components/molecules/BoostPackSheet.tsx` | Boost Pack (Counsel credits) purchase |
| `PostPurchaseUpsellSheet` | `src/components/molecules/PostPurchaseUpsellSheet.tsx` | Post-boost-purchase Premium upsell |
| RC hosted paywall | Triggered via `RevenueCatUI.presentPaywall()` in `PurchasesProvider.tsx:167–176` | Full-screen RC-hosted paywall for Premium subscription |

### Unreachable / Conditional Screens
- **`Components`** (`src/screens/dev/ComponentsScreen.tsx`): registered at `RootNavigator.tsx:72–74` inside `{__DEV__ && ...}`. Not reachable in production builds.
- **`CounselDisclosureModal`** (`src/screens/counsel/CounselDisclosureModal.tsx`): rendered inside `CounselChatScreen` as an overlay — not a registered route.

---

## 2. FREE vs GATED MAP (Revenue-Leak Audit)

### Gate mechanism legend
- **RC entitlement** — `isPremium`: `customerInfo?.entitlements?.active?.['premium'] !== undefined` (`PurchasesProvider.tsx:244–245`)
- **RC non-sub transaction** — `hasCalendar`: `isPremium || nonSubscriptionTransactions.some(t => t.productIdentifier === 'omenora_calendar_2026')` (`PurchasesProvider.tsx:247–251`)
- **Backend enforcement** — server returns HTTP 403 / `subscription_required` / `cap_reached` and the client reacts via `parseBackendError`

| Screen / Feature | Free or Gated | Gate Mechanism | Code Location |
|---|---|---|---|
| **Today — greeting + date** | Free | None | `TodayScreen.tsx:41–56` |
| **Today — daily archetype insight (theme + first paragraph `insightP1`)** | **FREE — ⚠️ REVENUE LEAK (see below)** | No gate | `TodayScreen.tsx:186–193` |
| **Today — Dimension cards (Love / Work / Health)** | Gated (Premium) | `isPremium && zodiacContent != null` | `TodayScreen.tsx:196–226` |
| **Today — Reflection card** | Gated (Premium) | `isPremium` | `TodayScreen.tsx:229–238` |
| **Today — Planetary weather card** | Gated (Premium) | `isPremium && zodiacContent != null` | `TodayScreen.tsx:241–250` |
| **Today — Counsel / Readings CTAs** | Gated (Premium) | `isPremium` | `TodayScreen.tsx:253–268` |
| **Today — First-run orientation card** | Free | `!isPremium && !hasSeenTodayIntro` | `TodayScreen.tsx:271–290` |
| **Today — Full Daily Reading LockedCard** | Locked card shown to free users | `!isPremium` | `TodayScreen.tsx:293–300` |
| **Today — Life Dimensions LockedCard** | Locked card shown to free users | `!isPremium && zodiacContent != null` | `TodayScreen.tsx:303–310` |
| **Readings — Big-Three Card (Sun/Moon/Rising)** | Free | None | `ReadingsScreen.tsx:260–275` |
| **Readings — ReadingHero (archetype key, element, power traits, identity teaser)** | Free | None | `ReadingsScreen.tsx:251–257` |
| **Readings — Full Archetype Reading** | Gated (Premium) | `isPremium` + backend 403/429 | `ReadingsScreen.tsx:279–363` |
| **Readings — Full Natal Chart** | Gated (Premium) | `isPremium` + backend 403/429 | `ReadingsScreen.tsx:366–484` |
| **Readings — 90-Day Forecast** | Gated (Premium) | `isPremium` + backend 403/429 | `ReadingsScreen.tsx:487–604` |
| **Counsel tab entry screen** | Free view; chat requires purchase | `isPremium` routes to chat; else paywall CTA or BoostPackSheet | `CounselScreen.tsx:64–107` |
| **CounselChatScreen — send message** | Gated (Premium or Boost credits) | Backend returns `subscription_required` / `cap_reached`; client parses via `parseBackendError` | `CounselChatScreen.tsx:165–184` |
| **Calendar screen** | Gated | `hasCalendar` (Premium or one-time IAP `omenora_calendar_2026`) | `CalendarScreen.tsx:296–316` |
| **Compatibility screen — form + result** | Gated (Premium); addon single-purchase path exists | `isPremium` renders form; else `LockedCard`; backend enforces via `subscription_required`/`cap_reached` | `CompatibilityScreen.tsx:210–253` |
| **TraditionSwitcher** | Gated (Premium) | `isPremium` | `TraditionSwitcherScreen.tsx:97–117` |
| **Profile, Language, Notifications, PrivacySettings, DeleteAccount, CrisisResources, Privacy, Terms** | Free | None | Various |
| **All onboarding screens (Splash → PremiumTeaser)** | Free (onboarding flow) | None | — |

### ⚠️ REVENUE LEAK: Today Screen — Personalized Archetype Insight

**Finding:** The archetype-specific `theme` label and the first paragraph (`insightP1`) of the daily `insight` text are rendered **unconditionally** for all users, including free/anonymous users.

- `archetypeContent` is derived from `data.archetypes[archetype.toLowerCase()]` — this is the user's specific archetype row fetched from the daily cache endpoint (`/api/get-daily-cache`).
- `insightP1` (first paragraph of `archetypeContent.insight`) is rendered at `TodayScreen.tsx:186–193` with no `isPremium` guard.
- The archetype `theme` label at `TodayScreen.tsx:187–189` is also unguarded.

This means **free users receive a personalized, archetype-specific daily reading fragment** that is positioned as a Premium value proposition in the `LockedCard` at line 294 ("Today's full reading: the cosmic stage you're moving through, a reflection written for your archetype, and the planetary weather shaping your day."). The `LockedCard` description implies the archetype insight is locked, but one paragraph of it is already visible for free.

The `reflection` text (also archetype-specific) is correctly gated at line 232 (`isPremium`). The unguarded `insightP1` sits directly above the LockedCard with no visual separator indicating it is a teaser.

---

## 3. PAYWALL & PURCHASE CALL-SITE INVENTORY

### All `presentPaywall()` / `presentPaywallIfNeeded()` call sites

| Surface | File | Line(s) | Hosted or Custom | Offering / Package | Placement ID passed |
|---|---|---|---|---|---|
| `PremiumTeaserScreen` — "Unlock" button | `src/screens/onboarding/PremiumTeaserScreen.tsx` | ~line 81 (`handleUnlock`) | Hosted RC paywall | `currentOffering` (RC default) | None |
| `TodayScreen` — "Full Daily Reading" LockedCard | `src/screens/tabs/TodayScreen.tsx:298` | `presentPaywall()` | Hosted RC paywall | `currentOffering` | None |
| `TodayScreen` — "Life Dimensions" LockedCard | `src/screens/tabs/TodayScreen.tsx:309` | `presentPaywall()` | Hosted RC paywall | `currentOffering` | None |
| `ReadingsScreen` — Archetype / NatalChart / Forecast `ReadingFeatureCard` unlock | `src/screens/tabs/ReadingsScreen.tsx:232–238` (`handleUnlockPress`) | `presentPaywall()` | Hosted RC paywall | `currentOffering` | None |
| `CounselScreen` — "Start chatting" | `src/screens/tabs/CounselScreen.tsx:34–40` (`handleStartChat`) | `presentPaywall()` | Hosted RC paywall | `currentOffering` | None |
| `CounselScreen` — Post-upsell "Upgrade to Premium" | `src/screens/tabs/CounselScreen.tsx:131–136` | `presentPaywall()` | Hosted RC paywall | `currentOffering` | None |
| `CompatibilityScreen` — LockedCard unlock (no addon offering) | `src/screens/CompatibilityScreen.tsx:127` | `presentPaywall()` | Hosted RC paywall | `currentOffering` | None |
| `CompatibilityScreen` — `subscription_required` error fallback | `src/screens/CompatibilityScreen.tsx:100` | `presentPaywall()` | Hosted RC paywall | `currentOffering` | None |
| `CompatibilityIAPSheet` — "See subscription plans" / upsell CTA | `src/components/molecules/CompatibilityIAPSheet.tsx` | `presentPaywall()` | Hosted RC paywall | `currentOffering` | None |
| `CalendarIAPSheet` — "Upgrade to Premium" | `src/components/molecules/CalendarIAPSheet.tsx` | `presentPaywall()` | Hosted RC paywall | `currentOffering` | None |
| `TraditionSwitcherScreen` — LockedCard unlock | `src/screens/settings/TraditionSwitcherScreen.tsx:79` | `presentPaywall()` | Hosted RC paywall | `currentOffering` | None |
| `WelcomeScreen` — sign-in / auth gate path | `src/context/AuthProvider.tsx` (via `showAuthGate`) | Indirect — `presentPaywallIfNeeded` in `PurchasesProvider.tsx:231–242` | Hosted RC paywall | `currentOffering`, entitlement `'premium'` | None |

### Custom IAP Sheet call sites

| Surface | File | Sheet | Offering Key | Package(s) |
|---|---|---|---|---|
| `CalendarScreen` — LockedCard unlock | `src/screens/CalendarScreen.tsx:193–196` | `CalendarIAPSheet` | Product: `omenora_calendar_2026` (non-subscription, fetched via `Purchases.getProducts`) | `omenora_calendar_2026` |
| `CalendarIAPSheet` — "Buy calendar" CTA | `src/components/molecules/CalendarIAPSheet.tsx:20` | `purchaseCalendar()` → `Purchases.purchaseStoreProduct` | Non-subscription product `omenora_calendar_2026` | `omenora_calendar_2026` |
| `CompatibilityScreen` — LockedCard / `subscription_required` | `src/screens/CompatibilityScreen.tsx:97–98` | `CompatibilityIAPSheet` | `addons` offering | `omenora_compatibility_single` |
| `CompatibilityIAPSheet` — "Buy single reading" CTA | `src/components/molecules/CompatibilityIAPSheet.tsx` | `purchaseCompatibilitySingle()` → `Purchases.purchasePackage` | `addons` offering, package identifier `omenora_compatibility_single` | `omenora_compatibility_single` |
| `CounselScreen` — "pay per conversation" | `src/screens/tabs/CounselScreen.tsx:98` | `BoostPackSheet` | `counsel_boosts` offering | `spark`, `insight`, `ascend` |
| `CounselChatScreen` — cap reached | `src/screens/counsel/CounselChatScreen.tsx:125` | `BoostPackSheet` | `counsel_boosts` offering | `spark`, `insight`, `ascend` |
| `BoostPackSheet` — pack purchase | `src/components/molecules/BoostPackSheet.tsx` | `purchaseBoostPack(identifier)` → `Purchases.purchasePackage` | `counsel_boosts` offering | `spark` / `insight` / `ascend` |

### Summary Table: Surface → Hosted-or-Custom → Offering → Package(s)

| Surface | Hosted or Custom | Offering Identifier | Package(s) |
|---|---|---|---|
| Premium subscription (all LockedCard / teaser surfaces) | Hosted RC paywall (`RevenueCatUI.presentPaywall`) | RC `currentOffering` (default) | UNVERIFIED — depends on RC dashboard config |
| Calendar one-time purchase | Custom `CalendarIAPSheet` | Non-subscription product | `omenora_calendar_2026` |
| Compatibility single reading | Custom `CompatibilityIAPSheet` | `addons` | `omenora_compatibility_single` |
| Counsel boost packs | Custom `BoostPackSheet` | `counsel_boosts` | `spark`, `insight`, `ascend` |
| Customer Center (manage subscription) | RC hosted `RevenueCatUI.presentCustomerCenter` | — | — |

---

## 4. REVENUECAT / IAP WIRING & PLATFORM PARITY

### SDK Initialization
- `Purchases.configure({ apiKey })` called in `PurchasesProvider.tsx:67`
- Runs inside a `useEffect([], [])` — executes once on provider mount
- API key source: `process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` (`PurchasesProvider.tsx:47`)
- Only one env var exists for RC; no Android key variable is defined anywhere in the codebase
- If key is missing, logs warning `'EXPO_PUBLIC_REVENUECAT_API_KEY_IOS not set — SDK disabled'` and sets `isReady = true` (fail-open), `PurchasesProvider.tsx:49–53`

### Platform Guards

| Guard | Location | Effect |
|---|---|---|
| `if (Platform.OS !== 'ios')` — hard bail | `PurchasesProvider.tsx:55–59` | On any non-iOS platform: SDK is **never configured**. `isReady` is set to `true`, `customerInfo` stays `null`, `isPremium` stays `false`, all purchase functions reject immediately. |
| Apple sign-in button | `SaveYourReadingScreen.tsx:246` | `{Platform.OS === 'ios' && <AppleAuthButton ...>}` — hidden on Android |
| Tab bar padding | `TabNavigator.tsx:52` | Cosmetic only |
| `KeyboardAvoidingView behavior` | `NameScreen.tsx:41` | Cosmetic only |

### Android Purchasing — Gaps

1. **Complete SDK disable:** `PurchasesProvider.tsx:55–59` — `if (Platform.OS !== 'ios') { console.warn('...'); setIsReady(true); return }` — the entire RevenueCat SDK is skipped on Android. No Android RC API key, no `Purchases.configure`, no offerings fetch.
2. **No `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID` env var** — not present in `.env.example` (`mobile-app/.env.example:19`) or referenced anywhere in `src/`.
3. **`purchaseCalendar`** calls `Purchases.getProducts(..., Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION)` — this SDK call would fail silently on Android since the SDK is never initialized.
4. **`purchaseBoostPack` and `purchaseCompatibilitySingle`** reference `boostPacksOffering` / `compatibilityAddonOffering` which are both `null` on Android (offerings never fetched) — both throw the "not available" error immediately.
5. **Apple Sign-In** is iOS-only (`Platform.OS === 'ios'` guard in `SaveYourReadingScreen.tsx:246`). On Android, only Google and email OTP are available.

**Conclusion:** The app is functionally iOS-only for all purchasing. Android users would see free-tier content only, with all purchase CTAs failing silently or erroring.

---

## 5. CONVERSION INSTRUMENTATION COVERAGE

### Search findings
A full grep across `src/` for analytics-related symbols (`analytics`, `trackEvent`, `logEvent`, `posthog`, `amplitude`, `segment`, `mixpanel`, `track`) returned **zero results**. There are no client-side analytics calls in the mobile app codebase.

The RC SDK emits its own internal purchase events to the RevenueCat dashboard (purchase started, purchase completed, etc.) as a side-effect of `Purchases.purchasePackage` / `Purchases.purchaseStoreProduct` / `Purchases.restorePurchases` calls. These are automatic and not visible in source code.

### Coverage Table

| Monetization Moment | Client-side event | RC automatic event | Status |
|---|---|---|---|
| Paywall viewed (RC hosted) | ❌ None | ✅ RC tracks automatically | Partial — RC only |
| Paywall viewed (custom CalendarIAPSheet) | ❌ None | ❌ None | **MISSING** |
| Paywall viewed (custom CompatibilityIAPSheet) | ❌ None | ❌ None | **MISSING** |
| Paywall viewed (custom BoostPackSheet) | ❌ None | ❌ None | **MISSING** |
| Purchase started | ❌ None | ✅ RC tracks automatically | Partial — RC only |
| Purchase completed (Premium subscription) | ❌ None | ✅ RC tracks automatically | Partial — RC only |
| Purchase completed (Calendar IAP) | ❌ None | ✅ RC tracks automatically | Partial — RC only |
| Purchase completed (Compatibility single) | ❌ None | ✅ RC tracks automatically | Partial — RC only |
| Purchase completed (Boost pack) | ❌ None | ✅ RC tracks automatically | Partial — RC only |
| Purchase failed | ❌ None | ✅ RC tracks automatically | Partial — RC only |
| Restore tapped / completed | ❌ None | ✅ RC tracks `restore_purchases` automatically | Partial — RC only |
| Post-purchase upsell shown | ❌ None | ❌ None | **MISSING** |
| Post-purchase upsell accepted | ❌ None | ❌ None | **MISSING** |
| Post-purchase upsell dismissed | ❌ None | ❌ None | **MISSING** |
| Paywall dismissed without purchase | ❌ None | ✅ RC tracks automatically (PAYWALL_RESULT.CANCELLED) | Partial — RC only |
| Onboarding PremiumTeaser shown | ❌ None | ❌ None | **MISSING** |
| LockedCard impression (any surface) | ❌ None | ❌ None | **MISSING** |
| Cap-reached event (Counsel / Compatibility) | ❌ None | ❌ None | **MISSING** |
| SaveYourReading declined (decline count tracked in store) | Store only (`saveDeclineCount`) | ❌ None | **MISSING** |

**Summary:** Zero custom client-side monetization analytics. All instrumentation relies entirely on RevenueCat's automatic purchase lifecycle events. Custom sheet impressions, upsell funnel steps, LockedCard impressions, onboarding paywall exposure, and cap-hit events are entirely untracked.

---

## 6. CREDITS, CAPS & COMPLIANCE GATES

### 6.1 User Credits / Credit Transactions (Boost Pack flow)

**Client-side:**  
- `CounselUsage` type has two discriminated variants: `UsagePremium` (`source: 'premium'`, `count`, `cap`, `period`, `resets_at`) and `UsageCredit` (`source: 'credit'`, `credit_balance_remaining`). Defined at `src/api/endpoints.ts:275–288`.
- After each `counselMessage` call, the response includes a `usage` field of type `CounselUsage`. The client updates local `usage` state (`CounselChatScreen.tsx:164`).
- `credit_balance_remaining` is displayed in the usage row at `CounselChatScreen.tsx:248–254`.
- After a boost pack purchase (`BoostPackSheet`'s `onPurchaseSuccess`), the client resets `usage` to `null` (`CounselChatScreen.tsx:314`) so the next message re-fetches usage from the server.

**Server-side credit management:** UNVERIFIED from client code. The client has no direct access to `user_credits` or `credit_transactions` tables. All credit accounting is server-enforced and reflected in the `usage` response field.

**Boost pack credit amounts (hardcoded client-side labels):**  
- `spark` = 5 conversations (`CounselChatScreen.tsx:310`)  
- `insight` = 15 conversations (`CounselChatScreen.tsx:311`)  
- `ascend` = 35 conversations (`CounselChatScreen.tsx:312`)  
These are display labels only; the actual credit grant is server-enforced on purchase via RevenueCat webhook (UNVERIFIED from client code).

### 6.2 Counsel Conversations Cap

**Exact cap value:** UNVERIFIED from client code. The `cap` value is **server-sourced** — it comes from the `usage.cap` field in the `CounselMessageResponse` (`src/api/endpoints.ts:313–317`). No hardcoded cap constant exists in client code.

**Period:** Also server-sourced via `usage.period` and `usage.resets_at` fields.

**Client enforcement:** A client-side pre-flight check at `CounselChatScreen.tsx:115–127` intercepts before the API call if `usage.source === 'premium' && usage.count >= usage.cap`. This is a UI optimization; the server independently enforces the cap and returns `cap_reached` if exceeded.

**Cap state on first load:** `usage` starts as `null` (`CounselChatScreen.tsx:87`). The cap is only known after the first successful message is sent and the server returns usage data in the response. There is no pre-fetch of usage state before the first message.

### 6.3 Counsel Disclosure Gate

- `CounselDisclosureModal` is rendered inside `CounselChatScreen` as an overlay (`CounselChatScreen.tsx:325–329`).
- Visibility logic: `useState(!hasAcceptedCounselDisclosure || (route.params?.showDisclosure ?? false))` at `CounselChatScreen.tsx:68–70`.
- `hasAcceptedCounselDisclosure` is a persisted Zustand field (`profileStore.ts`).
- On accept: `setHasAcceptedCounselDisclosure(true)` called at `CounselDisclosureModal.tsx:45`, persisted via `AsyncStorage`.
- The modal is **non-dismissable** — `onClose={() => {}}` (no-op) at `CounselDisclosureModal.tsx:52`. Users cannot bypass it by tapping outside.
- The `showDisclosure: true` route param allows re-triggering from `MoreScreen.tsx:272` ("Counsel guidelines" menu item).

**Hydration guard:** There is no explicit Zustand hydration wait before evaluating `hasAcceptedCounselDisclosure` in `CounselChatScreen`. The `useState` initializer reads from Zustand synchronously at mount time. If Zustand has not yet hydrated from `AsyncStorage` when the screen mounts, `hasAcceptedCounselDisclosure` would read as `false` (initial Zustand default), causing the disclosure modal to appear even if the user had previously accepted. This is a latent race condition.  
Compare: `SplashScreen.tsx:68–75` and `TodayScreen.tsx:93–100` both explicitly wait for `useProfileStore.persist.onFinishHydration`. `CounselChatScreen` does not perform this wait.

### 6.4 Restore Purchases Presence

| Surface | Has Restore? | Implementation |
|---|---|---|
| `CalendarIAPSheet` | ✅ Yes | `restorePurchases()` button at `CalendarIAPSheet.tsx:44–55` |
| `CompatibilityIAPSheet` | ❌ No | No restore option present in `CompatibilityIAPSheet.tsx` |
| `BoostPackSheet` | ❌ No | No restore option present in `BoostPackSheet.tsx` |
| `MoreScreen` → "Restore Purchases" | ✅ Yes | `handleRestore` → `restorePurchases()` at `MoreScreen.tsx:58–68` |
| RC hosted paywall | ✅ Yes | RevenueCatUI includes restore by default |

**Note:** Apple App Store Review guidelines require a Restore Purchases mechanism to be accessible. It is reachable via `MoreScreen`, but is absent from `CompatibilityIAPSheet` and `BoostPackSheet`.

### 6.5 i18n Coverage

**Mobile app i18n system:** There is **no i18n framework** in the mobile app. No `i18next`, `react-intl`, `@lingui`, or similar library is imported anywhere in `src/`. All UI strings in screens and components are **hardcoded in English**.

The `language` field in API requests (`languageOverride ?? 'en'`) is passed to the backend so the server returns AI-generated content in the selected language. However, all static UI copy (button labels, sheet titles, error messages, section headings, onboarding copy, disclosure text, crisis resource text, etc.) remains hardcoded in English regardless of the selected language.

**10 languages listed in `src/constants/questions.ts:1–12`:**  
`en`, `es`, `fr`, `de`, `pt`, `it`, `ru`, `zh`, `hi`, `ko`

**Coverage:** Server-generated AI content is localized for all 10 languages (backend-controlled). All client-side static strings are English-only. This includes:
- All paywall sheet copy (`CalendarIAPSheet`, `CompatibilityIAPSheet`, `BoostPackSheet`, `PostPurchaseUpsellSheet`)
- All error messages in `CounselChatScreen`, `ReadingsScreen`, `CalendarScreen`, `CompatibilityScreen`
- All `CounselDisclosureModal` content
- All onboarding screen copy
- All settings and account management screens
- All `Alert.alert` dialog text

---

## OPEN QUESTIONS / UNVERIFIED

1. **RC `currentOffering` identifier** — The RC dashboard offering ID for the Premium subscription is never referenced in client code. The hosted paywall uses whatever RC's `currentOffering` resolves to. The exact package identifiers (monthly / annual) are UNVERIFIED from client source.

2. **Counsel cap exact value and period** — `usage.cap` and `usage.period` are server-sourced fields. The actual cap number (e.g. 30/month for Premium) is UNVERIFIED from client code.

3. **Boost pack server-side credit grant** — Whether the RevenueCat webhook correctly credits `user_credits` after a boost pack purchase is a backend concern. Client only resets `usage` to `null` on `onPurchaseSuccess`. Server-side `credit_transactions` table and webhook handler are UNVERIFIED.

4. **`CompatibilityResponse.usage` field type** — The `CompatibilityResponse` interface at `src/api/endpoints.ts:77–81` declares `usage: CounselUsage`. It is unclear whether the compatibility endpoint returns a `CounselUsage`-shaped object (which is semantically a Counsel concept) or a different shape. The compatibility screen does not consume the `usage` field at all — it is discarded. UNVERIFIED whether this is intentional.

5. **`api.generateDailyInsight` / `api.getReport` / `api.checkReportExists` usage** — These endpoint functions are defined in `src/api/endpoints.ts` but no call sites were found in any screen file during this audit. Their current usage status in the mobile app is UNVERIFIED.

6. **`PLAY_STORE_URL` and `GOOGLE_PAY` / `APPLE_PAY` feature flags** — `src/constants/config.ts:14,18–22` defines `PLAY_STORE_URL`, `GOOGLE_PAY: true`, and `APPLE_PAY: true`. No screen in `src/` references these flags. Their purpose and whether they gate any conditional UI is UNVERIFIED.

7. **`AuthProvider` — RC `Purchases.logOut()` on sign-out** — It is UNVERIFIED from client code whether `Purchases.logOut()` is called when a user signs out. The `AuthProvider.tsx` handles sign-out but calling this tool was not within scope to re-read the full provider for this detail.

8. **`DeleteAccountScreen` — subscription cancellation by Apple** — The screen instructs users to cancel via the App Store (`DeleteAccountScreen.tsx:54`) but does not revoke entitlements server-side. Whether the backend deletes RC customer data on account deletion is UNVERIFIED.

9. **`calendarProduct` null-fallback pricing** — `CalendarIAPSheet` displays price from `calendarProduct?.product.priceString`. If `calendarProduct` is null (RC not initialized, or product not found), the price display falls back to a fallback string. The exact fallback string is UNVERIFIED from this audit pass.

10. **`previewMode: false` in all compatibility requests** — `CompatibilityScreen.tsx:79` always sends `previewMode: false`. The `previewMode: true` path (used in the web funnel) is never triggered from the mobile app. Whether the backend applies different credit deduction or gating for `previewMode: false` is UNVERIFIED.
