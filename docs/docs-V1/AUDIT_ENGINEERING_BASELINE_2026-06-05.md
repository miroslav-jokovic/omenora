# OMENORA Mobile App — Engineering Baseline Audit
**Date:** 2026-06-05  
**Auditor:** Cascade (read-only, no code changes)  
**Scope:** `/Volumes/ESSD/Projects/Augur-V1/mobile-app/`  
**Method:** Static analysis of source files, config, and lockfile only. No runtime execution.  
**Severity tags:** `[BLOCKER]` — must fix before App Store production; `[HARDEN]` — should fix for hardened production posture; `[INFO]` — observation, no immediate action required.  
**UNVERIFIED** — used wherever a claim cannot be confirmed from source code alone (e.g., runtime behaviour, server-side enforcement, App Store configuration).

---

## Table of Contents
1. [Security](#1-security)
2. [Architecture & Structure](#2-architecture--structure)
3. [Error Handling & Observability](#3-error-handling--observability)
4. [Performance](#4-performance)
5. [Data Privacy & Compliance](#5-data-privacy--compliance)
6. [Accessibility](#6-accessibility)
7. [Offline / Resilience](#7-offline--resilience)
8. [Build & Release Configuration](#8-build--release-configuration)
9. [Dependency Health](#9-dependency-health)
10. [Testing](#10-testing)
11. [Internationalization (I18N)](#11-internationalization-i18n)

---

## 1. Security

### 1.1 Token Storage — Supabase Session in AsyncStorage `[HARDEN]`
**File:** `src/lib/supabase.ts:14-20`

The Supabase client is configured with `storage: AsyncStorage`. `AsyncStorage` is **not encrypted** on either iOS or Android; it writes to plain SQLite on Android and an unprotected file on iOS. Although `expo-secure-store` is listed as a dependency in `package.json:53` and configured as an Expo plugin in `app.json:112`, it is **not used** for the Supabase session.

The Supabase access token and refresh token are therefore stored in cleartext on-device. On a rooted Android device or a jailbroken iPhone with a non-AppSandbox tool, these tokens are recoverable without exploiting any OS vulnerability.

**Evidence of SecureStore availability but non-use:**
- `package.json:53` — `"expo-secure-store": "~14.2.4"` installed.
- `app.json:112` — `"expo-secure-store"` registered as an Expo plugin.
- `src/lib/supabase.ts:2` — imports `AsyncStorage`, no SecureStore import.

### 1.2 Supabase Anon Key Bundled in `EXPO_PUBLIC_` Variable `[INFO]`
**File:** `src/lib/supabase.ts:6`, `.env.example:12`

`EXPO_PUBLIC_SUPABASE_ANON_KEY` is intended to be public and is correctly exposed via Expo's `EXPO_PUBLIC_` convention, which bundles values into the JavaScript bundle. Supabase anon keys are designed for public client-side use and are secured via Row-Level Security (RLS) policies server-side. Whether RLS is correctly configured is **UNVERIFIED** (requires server-side audit).

### 1.3 Google OAuth Client IDs in `EXPO_PUBLIC_` Variables `[INFO]`
**File:** `src/context/AuthProvider.tsx:13-14`

`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` are loaded at module level and bundled into the app binary. Google OAuth client IDs are public identifiers by design (they appear in the binary regardless). The iOS client ID is also hardcoded in `app.json:82` as the `iosUrlScheme`. No secret value is exposed here.

### 1.4 RevenueCat API Key Bundled in App Binary `[INFO]`
**File:** `src/context/PurchasesProvider.tsx:47`, `.env.example:19`

`EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` is bundled via `EXPO_PUBLIC_` and is visible in the app binary. RevenueCat public API keys are designed to be included in app binaries (they are scoped and rate-limited by App Store server-to-server receipt validation). This is the intended usage per RevenueCat documentation.

### 1.5 Raw `fetch()` Calls Bypass Axios Interceptor Auth `[HARDEN]`
**Files:**
- `src/context/AuthProvider.tsx:302` — `fetch(…/api/auth/request-magic-link, …)` — manually attaches `Authorization` header only in `deleteAccount`, not in `signInWithMagicLink`.
- `src/context/AuthProvider.tsx:302-313` — `signInWithMagicLink` posts to `/api/auth/request-magic-link` without an `Authorization` header (pre-auth flow, acceptable).
- `src/context/AuthProvider.tsx:439` — `deleteAccount` correctly attaches `Bearer ${token}`.
- `src/screens/settings/NotificationsScreen.tsx:33` — `fetch(…/api/notifications/register, …)` — manually builds `Authorization: Bearer ${token}` header.

The three raw `fetch()` calls do not go through the Axios interceptor in `src/api/client.ts`. If the token attachment logic ever needs updating (refresh, rotation), these calls will not benefit from the centralised interceptor and must be updated separately.

### 1.6 Deep-Link Token Hash Logged to Console in Production `[HARDEN]`
**File:** `App.tsx:72, 81`

```
console.log('[DeepLink] Received URL:', url)
console.log('[DeepLink] Initial URL:', url)
```

The `url` parameter for magic-link deep links contains a `token_hash` query parameter (a time-limited but sensitive credential). Logging the full URL to console means the token hash appears in device logs in production. On iOS, device logs are readable via Xcode or through third-party crash-reporting tools if log collection is enabled.

### 1.7 Auth Error Messages Surfaced Verbatim to Users `[HARDEN]`
**Files:**
- `src/context/AuthProvider.tsx:265` — `Alert.alert('Sign In Failed', err?.message ?? …)` — Google sign-in.
- `src/context/AuthProvider.tsx:290` — same pattern — Apple sign-in.
- `src/context/AuthProvider.tsx:332, 347, 388, 511, 516` — multiple auth operations.

Supabase and provider SDK error messages may contain internal identifiers, rate-limit context, or server stack frames. Surfacing `err.message` verbatim may leak implementation details to an attacker probing the auth flow.

### 1.8 Apple Sign-In Token Revocation Not Implemented `[BLOCKER]`
**File:** `src/context/AuthProvider.tsx:463-465`

An inline code comment explicitly acknowledges this gap:
```
// d. Apple token revocation — expo-apple-authentication ~7.2.4 has no
//    revokeAsync API. Follow-up required: server-side revoke via
//    Apple REST API POST /auth/revoke using the stored refresh token.
```

Apple's App Store Review Guidelines (section 5.1.1) require that Sign in with Apple tokens are revoked when a user deletes their account. Failure to implement this is an App Store rejection risk.

### 1.9 Sentry `beforeSend` PII Scrubbing is Shallow `[HARDEN]`
**File:** `App.tsx:36-63`

The `beforeSend` callback scrubs `event.user.ip_address`, `event.user.email`, `event.request.headers['user-agent']`, and a fixed list of fields (`email`, `firstName`, `dateOfBirth`, `city`, `ip_address`) from `event.request.data` and `event.extra`. However:
- The scrubbing only operates on top-level keys of `event.request.data` and `event.extra`. Nested objects (e.g., `{ user: { email: '...' } }`) are not recursively scrubbed.
- `event.exception.values[].stacktrace.frames[].vars` (local variable capture) is not sanitized.
- `event.breadcrumbs` are not inspected for PII.

### 1.10 `is_anonymous` Cast via `as any` Pattern `[HARDEN]`
**File:** `src/context/AuthProvider.tsx:375, 412, 531`

Three uses of `(currentSession.user as any).is_anonymous` and `(session?.user as any)?.is_anonymous`. The `is_anonymous` field is present on the Supabase `User` type in recent SDK versions but may not be typed in the version pinned (`^2.105.3`). The `as any` cast suppresses type safety — if the field name or shape changes, the guard will silently fail, potentially granting anonymous users permanent-user access paths.

---

## 2. Architecture & Structure

### 2.1 TypeScript Strict Mode Enabled `[INFO]`
**File:** `tsconfig.json:18-23`

`"strict": true`, `"noImplicitAny": true`, `"strictNullChecks": true`, `"noImplicitReturns": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true` are all set. This is the correct baseline for a production TypeScript React Native codebase.

### 2.2 `any` Type Escape Hatches Present `[HARDEN]`
**Approximate count:** 48 occurrences of `: any` or `as any` across `src/` (measured via `grep -rn "any\b" src/`).

Significant instances:
- `src/context/AuthProvider.tsx:131, 197, 209, 262, 287, 315, 329, 344, 375, 412, 449, 472, 475, 514, 531` — most are `catch (err: any)` blocks, a common pattern in TypeScript before `useUnknownInCatchVariables` was standard. This is low-risk individually but represents a systematic loose typing pattern in error handling.
- `src/context/AuthProvider.tsx:274` — `(userInfo as any)?.idToken` — workaround for a Google Sign-In SDK type mismatch.
- `src/context/AuthProvider.tsx:449` — `(errorData as any).message` — untyped error body parsing.

No `@ts-ignore` or `@ts-expect-error` directives were found in any source file.

### 2.3 State Management: Single Zustand Store Persists PII `[HARDEN]`
**File:** `src/stores/profileStore.ts:258-289`

`useProfileStore` persists via `createJSONStorage(() => AsyncStorage)` under the key `'omenora-analysis-storage'`. The `partialize` function includes `firstName`, `dateOfBirth`, `timeOfBirth`, `city`, `archetype`, `answers`, and `analyticsEnabled` — all of which are PII or user-behaviour data.

This data is stored unencrypted in AsyncStorage (same concern as §1.1). On a compromised device, an attacker can read the full profile without needing the auth token.

### 2.4 RevenueCat SDK is iOS-Only `[HARDEN]`
**File:** `src/context/PurchasesProvider.tsx:55-58`

```
if (Platform.OS !== 'ios') {
  console.warn('[Purchases] non-iOS platform — SDK disabled')
  setIsReady(true)
  return
}
```

The app declares `"android": { "buildType": "app-bundle" }` in `eas.json:38-39` and lists Android permissions in `app.json:48-56`, implying an Android build is planned or exists. However all purchase flows are hard-gated by iOS-only. An Android user can never become premium. The `FEATURES.GOOGLE_PAY: true` flag in `src/constants/config.ts:19` implies Android payment intent exists but is not wired.

### 2.5 Navigation Architecture: Flat Root Stack with All Screens `[INFO]`
**File:** `src/navigation/RootNavigator.tsx:1-78`

All screens are in a single `NativeStackNavigator`. Tab navigation is nested inside `MainTabs`. The structure is appropriate for the current screen count and does not introduce obvious deep-linking or back-stack hazards.

### 2.6 Dead API Endpoints in `endpoints.ts` `[INFO]`
**File:** `src/api/endpoints.ts:327-335, 361-364`

`api.getReport()`, `api.checkReportExists()`, and `api.generateDailyInsight()` are defined in the endpoint module but no call sites were found in any screen or service file (confirmed via grep). These functions are dead code — they add surface area for confusion but pose no runtime risk.

### 2.7 Deprecated `signInWithMagicLink` Method Retained `[INFO]`
**File:** `src/context/AuthProvider.tsx:294-320`

A `// @deprecated` comment marks `signInWithMagicLink` as superseded by `sendEmailOtp` + `verifyEmailOtp`. The method remains in `AuthContextValue` (visible in `AuthContext`) and is included in the provider value at line 538. It still fires real API calls. If callers invoke it, the magic-link redirect `https://omenora.com/auth-callback` hardcoded at line 307 may not exist on the web app. **UNVERIFIED** — web routing for `/auth-callback` not audited here.

### 2.8 Inline SVG Logo Duplicated in Two Screen Files `[INFO]`
**Files:** `src/screens/tabs/MoreScreen.tsx:40-47`, `src/screens/onboarding/WelcomeScreen.tsx:36`

The OMENORA logomark SVG string is duplicated verbatim in two separate screen files. Not a production risk, but a maintainability concern.

---

## 3. Error Handling & Observability

### 3.1 Sentry Initialized Correctly `[INFO]`
**File:** `App.tsx:2, 30-64, 149`

`@sentry/react-native` is imported and `Sentry.init()` is called at module top-level before any React component renders. `App` is wrapped with `Sentry.wrap(App)` at line 149, which enables the Sentry React Native error boundary and native crash reporting.

Configuration:
- `dsn: process.env.EXPO_PUBLIC_SENTRY_DSN` — loaded from env var.
- `environment: __DEV__ ? 'development' : 'production'` — correct segregation.
- `tracesSampleRate: 0` — performance tracing disabled (saves quota, but no performance data).
- `sendDefaultPii: false` — correct.
- `enableNativeFramesTracking: !isRunningInExpoGo()` — correct guard.

### 3.2 No Manual `Sentry.captureException()` Calls `[HARDEN]`
Grep across all `.ts`/`.tsx` files found **zero** explicit `Sentry.captureException()` or `Sentry.captureMessage()` calls in `src/`. Sentry only captures unhandled exceptions and the automatic React error boundary provided by `Sentry.wrap`. All `try/catch` blocks in the codebase swallow errors to `console.error`/`console.warn` only. Critical business errors (failed profile save, purchase failure, auth transfer failure) are not explicitly reported to Sentry.

### 3.3 No React Error Boundaries Below the Sentry Root `[HARDEN]`
**File:** `App.tsx:132-146`

No custom `ErrorBoundary` class components (`componentDidCatch`, `getDerivedStateFromError`) were found anywhere in `src/`. The only error boundary is the one implicit in `Sentry.wrap(App)`, which covers the entire app tree. A crash in any child component will catch at the root boundary with no per-screen recovery UI.

### 3.4 Extensive `console.log/warn/error` in Production Code `[HARDEN]`
Production builds (`__DEV__ === false`) will still emit all `console.*` calls because there is no log-stripping transform configured (no `babel-plugin-transform-remove-console` or equivalent in `package.json` devDependencies).

Key production log leaks:
- `App.tsx:72, 81` — full deep-link URLs including `token_hash` (see §1.6).
- `src/context/AuthProvider.tsx:108` — `console.log('[Auth] transfer succeeded:', data)` — prints RPC return data.
- `src/context/AuthProvider.tsx:160` — `console.log('[Auth] profileStore hydrated from server for user:', targetId)` — logs Supabase user UUID.
- `src/context/AuthProvider.tsx:178` — logs user UUID.
- `src/context/PurchasesProvider.tsx:89, 113, 139, 170, 236` — multiple `console.log` calls including `user.id`.
- `src/api/client.ts:37` — `console.error('API Error:', error.response.status, error.response.data)` — logs full response body, which may contain server error details.

### 3.5 API Client Logs Full Response Body on Error `[HARDEN]`
**File:** `src/api/client.ts:37`

```
console.error('API Error:', error.response.status, error.response.data);
```

`error.response.data` may contain server-side stack traces, database error details, or user-identifying information in non-production backends.

### 3.6 401 Handling in Axios Interceptor Does Not Refresh Token `[HARDEN]`
**File:** `src/api/client.ts:45-48`

When a 401 response is received, the interceptor rejects with `new Error('Authentication required')` and does not attempt a Supabase token refresh (`supabase.auth.refreshSession()`). If the access token expires mid-session, all API calls will silently fail with a generic error rather than transparently refreshing and retrying.

Supabase's own client does auto-refresh (`autoRefreshToken: true` in `src/lib/supabase.ts:17`), but the Axios client reads the session token once per request via `supabase.auth.getSession()` — if a 401 is returned, the token was already stale before the request was made and auto-refresh had not yet fired.

### 3.7 Sentry DSN Absent from `development` Build Profile `[HARDEN]`
**File:** `eas.json:7-13`

The `development` and `development-simulator` build profiles do not set `EXPO_PUBLIC_SENTRY_DSN`. Only `preview` and `production` profiles set it. This means errors during `eas build --profile development` builds are silently dropped by Sentry (DSN is undefined → `Sentry.init` with `dsn: undefined` → SDK is a no-op). Preview builds should catch regressions before production, and DSN absence here means preview builds have full Sentry coverage but development builds do not.

---

## 4. Performance

### 4.1 Startup Blocking: Font Loading Blocks Render `[INFO]`
**File:** `App.tsx:100-130`

`useFonts()` is called for 6 font variants (Onest Light/Regular/Medium/SemiBold, GeistMono Regular/Medium). The `App` component returns `null` until both `appIsReady` and `fontsLoaded` are true. The native splash screen is held via `SplashScreen.preventAutoHideAsync()`. This is the standard Expo pattern and does not expose a blank-screen FOUC, but font loading is network-dependent on first install.

### 4.2 No `FlatList` or Virtualized Lists Used `[INFO]`
Across all screen files, no `FlatList`, `VirtualizedList`, or `SectionList` usage was found. All long content (natal chart planets/aspects, forecast key transits/monthly highlights, compatibility sections) is rendered via `.map()` inside `ScrollView`.

Specific unbounded maps in `ReadingsScreen.tsx`:
- Line 439: `natalChartState.data.planets.map(…)` — up to 10 planet cards.
- Line 449: `natalChartState.data.aspects.map(…)` — aspect count is variable, up to ~15+.
- Line 554: `sortedTransits.map(…)` — transit count variable.
- Line 565: `forecastState.data.monthlyHighlights.map(…)` — up to 12 items.

Given that these lists are bounded by API response schema (not user-generated unbounded data), the practical impact is low. No virtualization risk in current data volumes.

### 4.3 AbortController Used Correctly in TodayScreen `[INFO]`
**File:** `src/screens/tabs/TodayScreen.tsx:35, 60-85`

`useRef<AbortController>` pattern is correctly implemented — previous controller is aborted before starting a new fetch, and the cleanup function at line 90 aborts on unmount. This prevents stale state updates from concurrent fetches.

### 4.4 `formattedDate` Uses Hardcoded `'en-US'` Locale `[HARDEN]`
**File:** `src/screens/tabs/TodayScreen.tsx:55`

```
today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
```

The locale is hardcoded to `'en-US'` regardless of the device locale or the user's `languageOverride`. Users with non-English `languageOverride` settings will see the date formatted in English.

### 4.5 No Image Caching Strategy `[INFO]`
The codebase does not import `expo-image` or `react-native-fast-image`. Standard React Native `Image` is used (via component abstractions). Expo's default `Image` component in SDK 53 caches to disk by default on iOS/Android, so this is **UNVERIFIED** as a concern — the default caching may be sufficient for the current image volume.

---

## 5. Data Privacy & Compliance

### 5.1 No ATT (App Tracking Transparency) Prompt `[BLOCKER]`
**Files:** `app.json` (full file), `package.json` (full file)

`expo-tracking-transparency` is **not installed** (absent from `package.json` dependencies). `NSUserTrackingUsageDescription` is **absent** from `app.json:22-33` (`infoPlist` block). No `requestTrackingPermissionsAsync()` call exists anywhere in `src/`.

Apple requires ATT consent before any cross-app or cross-site tracking occurs. While OMENORA mobile does not use advertising SDKs (no Meta/TikTok pixel equivalent found), the RevenueCat SDK (`react-native-purchases`) may use IDFA for attribution depending on its configuration. **UNVERIFIED** — whether RevenueCat's iOS SDK accesses IDFA without `NSUserTrackingUsageDescription` triggers App Store rejection. Apple's policy requires the key and prompt if IDFA is accessed.

### 5.2 Analytics Opt-Out Toggle Has No Effect on Mobile `[HARDEN]`
**Files:** `src/screens/settings/PrivacySettingsScreen.tsx:1-98`, `src/stores/profileStore.ts:80-81`, `App.tsx:30-64`

The `analyticsEnabled` flag is stored in `profileStore` and synced to the backend via `updateProfileField`. However:
- There is no analytics SDK (PostHog, Amplitude, etc.) initialized in the mobile app.
- Sentry is not gated by `analyticsEnabled`.
- There is no code that reads `analyticsEnabled` and conditionally disables any SDK.

The toggle therefore only updates a backend database column and has no runtime effect on the mobile app. Users who disable analytics still have Sentry error reporting active. This may conflict with user expectations and privacy policy claims.

### 5.3 PII Persisted Unencrypted in AsyncStorage `[HARDEN]`
**File:** `src/stores/profileStore.ts:258-289`

Persisted keys include: `firstName`, `dateOfBirth`, `timeOfBirth`, `city`, `archetype`, `answers`, `languageOverride`. These constitute PII under GDPR/CCPA definitions (name + date of birth = directly identifying; location = sensitive). All stored unencrypted in AsyncStorage (see §1.1, §2.3).

### 5.4 Account Deletion: No Apple Token Revocation `[BLOCKER]`
**File:** `src/context/AuthProvider.tsx:463-465`

As noted in §1.8, Apple token revocation is not implemented. Apple's App Store Review Guidelines §5.1.1(v) state: *"If you offer Sign in with Apple, you must provide an option for users to delete their accounts."* The guideline implies the complete deletion process, which Apple defines as including token revocation. This is an App Store compliance requirement.

### 5.5 Account Deletion Route Hidden for Anonymous Users `[INFO]`
**File:** `src/screens/tabs/MoreScreen.tsx:282-291`

The "Account deletion" list item is wrapped in `{!isAnonymous && (…)}`. Anonymous users cannot access the deletion flow. Since anonymous sessions are not permanent accounts, this is reasonable — however, the anonymous user's data (birth chart, readings) does persist in Supabase under their anonymous user ID for 30 days. There is no self-service way for an anonymous user to request deletion of that server-side data.

### 5.6 Location Permission Declarations Without Runtime Usage `[HARDEN]`
**File:** `app.json:31-32, 54-55`

`NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysUsageDescription` (iOS) and `android.permission.ACCESS_COARSE_LOCATION`, `android.permission.ACCESS_FINE_LOCATION` (Android) are declared. However, `expo-location` is **not installed** (absent from `package.json`) and no `getCurrentPosition`, `watchPosition`, or Expo Location API call exists in `src/`.

Declaring permissions not used by the app violates App Store and Google Play policy guidelines (minimal permission requirement). Reviewers may question the declared location usage, and the `NSLocationAlwaysUsageDescription` string ("OMENORA uses your location to provide accurate astrological calculations based on your birthplace") implies active location access that does not occur at runtime.

### 5.7 Camera, Microphone, Photo Library Permissions Declared with Null Justification `[HARDEN]`
**File:** `app.json:28-30`

Three `Info.plist` keys are declared with usage strings that explicitly state the app does **not** require the permission:
- `NSCameraUsageDescription: "This app does not require camera access."`
- `NSMicrophoneUsageDescription: "This app does not require microphone access."`
- `NSPhotoLibraryUsageDescription: "This app does not require photo library access."`

These strings serve a valid defensive purpose (preventing crashes if a third-party library requests access) but violate App Store Review Guidelines, which require usage descriptions to accurately describe why the app uses that capability. A reviewer seeing "This app does not require camera access" may reject the app for the misleading description. The correct approach is to remove the keys entirely if the capabilities are not used.

### 5.8 Counsel AI Disclosure Consent Stored Only Client-Side `[HARDEN]`
**File:** `src/stores/profileStore.ts:84`, `src/screens/counsel/CounselDisclosureModal.tsx`

`hasAcceptedCounselDisclosure` is persisted in Zustand's AsyncStorage persist layer. It is not written to the Supabase `user_profiles` table (only `analyticsEnabled`, `language_override`, and profile fields are synced — confirmed in `profileStore.ts:198-213`). If a user reinstalls the app or clears storage, they will be prompted again, but the original consent timestamp and user-agent are not recorded server-side. This may be insufficient for a legally defensible consent audit trail given the AI mental wellness context.

---

## 6. Accessibility

### 6.1 Accessibility Coverage is Sparse `[HARDEN]`
Total `accessibilityLabel` + `accessibilityRole` annotations found across all `src/` files: **40 occurrences** across the entire codebase. Total `Pressable`/`onPress` interactive elements: **183 occurrences** in screen files alone.

The ratio indicates that the vast majority of interactive elements lack explicit accessibility labels or roles. Screen reader users (VoiceOver on iOS, TalkBack on Android) will encounter unlabelled buttons throughout the app.

Specific gaps noted:
- All `Card`, `ReadingCard`, `TransitCard`, `ReadingFeatureCard`, `LockedCard` components — no `accessibilityRole` declarations found in the component files (not individually audited but no grep match in screens).
- Most `ListItem` usages in `MoreScreen.tsx` — no `accessibilityLabel` per item.
- `TodayScreen.tsx:277-283` — dismiss button (`X`) has `accessibilityLabel="Dismiss"` and `accessibilityRole="button"` (good example, not consistent across the app).

### 6.2 No `allowFontScaling` or `maxFontSizeMultiplier` Control `[HARDEN]`
Grep returned **zero** occurrences of `allowFontScaling` or `maxFontSizeMultiplier` in `src/`. React Native `Text` components scale with the system Dynamic Type setting by default. The app uses a custom `Text` atom component (`src/components/atoms/Text`) — whether it suppresses or passes through font scaling is **UNVERIFIED** (atom file not audited). Uncontrolled font scaling can break fixed-height card layouts.

### 6.3 Dark-Mode-Only App — No Color Contrast Audit Possible `[INFO]`
**File:** `app.json:8` — `"userInterfaceStyle": "dark"`, `src/constants/config.ts:22` — `FEATURES.DARK_MODE_ONLY: true`.

The app forces dark mode only. Color contrast ratios against the dark background (`#15110D`) cannot be verified from source alone (**UNVERIFIED**). WCAG 2.1 AA requires 4.5:1 for normal text and 3:1 for large text. No color contrast audit was performed.

### 6.4 `hitSlop` Used Inconsistently `[INFO]`
`hitSlop` is present on some small `Pressable` targets (e.g., `TodayScreen.tsx:279`, onboarding back buttons, `BirthCityScreen.tsx:56`) but not consistently applied to all small touch targets. Apple HIG recommends a minimum 44×44pt touch target.

---

## 7. Offline / Resilience

### 7.1 No Network State Awareness Library `[HARDEN]`
Grep returned **zero** occurrences of `NetInfo`, `useNetInfo`, `@react-native-community/netinfo`, or equivalent. The app makes no distinction between an offline state and a server error. Users who are offline receive generic error messages (e.g., `"Network error. Please check your connection."` from `src/api/client.ts:52`) without proactive UI state changes or offline mode.

### 7.2 `pendingServerSync` Flag Provides Partial Offline Resilience for Profile Saves `[INFO]`
**File:** `src/stores/profileStore.ts:218-222`, `src/screens/onboarding/SplashScreen.tsx:145-149`

The `pendingServerSync` flag is set when a profile save fails due to a network error (`ProfileSaveError.kind === 'network'`), and the `SplashScreen` attempts to flush it on next launch. This is a minimal but functional offline-resilient pattern for profile data.

### 7.3 Reading Cache Survives App Restart `[INFO]`
**File:** `src/stores/profileStore.ts:276-279`

`archetypeReading`, `natalChartReading`, `forecastReading`, and `calendarData` are all included in the `partialize` persist function. These large AI-generated reading objects are cached in AsyncStorage and loaded on next launch, allowing the Readings screen to display content without a network round-trip.

### 7.4 No Retry Logic for Axios API Calls `[HARDEN]`
**File:** `src/api/client.ts` (full file)

The Axios interceptor at `src/api/client.ts:29-57` does not implement any retry logic for transient errors (5xx, network timeout). The `retryWithBackoff` function in `src/services/profileService.ts:14-30` is only used for Supabase direct writes, not for Axios-based API calls. AI reading generation endpoints (archetype, natal chart, forecast) can fail transiently (cold start, LLM timeout) with no automatic retry — the user must manually tap "Try again."

### 7.5 Session Bootstrap Timeout with User Recovery `[INFO]`
**File:** `src/screens/onboarding/SplashScreen.tsx:77-93`

An 8-second timeout (`SESSION_WAIT_MS = 8000`) triggers a "Tap to retry" UI if no session materialises after startup. This is a correct resilience pattern for offline-at-launch scenarios.

---

## 8. Build & Release Configuration

### 8.1 EAS Submit Config Contains Literal Placeholder Values `[BLOCKER]`
**File:** `eas.json:53-61`

```json
"serviceAccountKeyPath": "path-to-service-account-key.json",
"ascAppId": "[YOUR_APPLE_APP_ID]",
"ascApiKeyPath": "path-to-asc-api-key.p8",
"ascApiKeyIssuerId": "[YOUR_ISSUER_ID]",
"ascApiKeyId": "[YOUR_KEY_ID]"
```

These literal placeholder strings will cause `eas submit` to fail. The service account key path for Android and the Apple App Store Connect API credentials for iOS must be populated before automated submission is possible.

### 8.2 Sentry DSN Missing from `development` Build Profile `[HARDEN]`
**File:** `eas.json:7-13` (see §3.7)

The `development` build profile has no `env` block at all. `EXPO_PUBLIC_SENTRY_DSN` is therefore not injected at build time for development builds. Sentry is a no-op in development EAS builds.

### 8.3 `app.json` Version Still at `1.0.0` / `versionCode: 1` `[INFO]`
**File:** `app.json:5, 21, 43`

`"version": "1.0.0"`, `"buildNumber": "1.0.0"` (iOS), `"versionCode": 1` (Android). This is consistent for a pre-launch or early-launch app. No automated version-bump scripts were found in `package.json` scripts, suggesting version management is manual.

### 8.4 `runtimeVersion` Policy Set to `appVersion` `[INFO]`
**File:** `app.json:134-136`

```json
"runtimeVersion": { "policy": "appVersion" }
```

This means OTA updates (via `expo-updates`) are only delivered to clients whose `version` matches. Any native code change requires a full app store binary update. This is the safest policy choice.

### 8.5 OTA Updates `checkAutomatically: ON_LOAD` `[INFO]`
**File:** `app.json:131`

Updates are checked on every app load. `fallbackToCacheTimeout: 0` means the app will not wait for an update download before launching — the update is applied on the next cold start. This is a safe configuration for production.

### 8.6 Android Build Type `apk` in Preview Profile `[HARDEN]`
**File:** `eas.json:26`

`preview` builds produce an APK (`"buildType": "apk"`) for Android. APK bundles are less optimised than AAB (App Bundle) and have a larger download size. More importantly, APKs from `eas build --profile preview` can be sideloaded — this is intentional for internal testing but should be documented as a risk since preview builds have Sentry DSN enabled.

### 8.7 `development` iOS Build Uses `adhoc` Enterprise Provisioning `[INFO]`
**File:** `eas.json:12`

`"enterpriseProvisioning": "adhoc"` for the `development` iOS profile. Enterprise provisioning is appropriate for internal distribution to registered devices. This is a correct configuration for a small development team.

### 8.8 No Separate Staging/UAT Environment `[HARDEN]`
The `eas.json` defines three profiles: `development`, `preview`, `production`. There is no `staging` profile with a distinct API base URL (`EXPO_PUBLIC_API_BASE_URL`). Both `preview` and `production` builds will default to `https://api.omenora.com` (the hardcoded fallback in `src/constants/config.ts:7-8`) unless the env var is overridden externally. **UNVERIFIED** — whether `EXPO_PUBLIC_API_BASE_URL` is set differently per profile via EAS secrets.

---

## 9. Dependency Health

### 9.1 Expo SDK 53 — Current `[INFO]`
**File:** `package.json:31` — `"expo": "~53.0.0"`

Expo SDK 53 is the latest stable release as of mid-2026. All Expo packages are pinned to compatible `~53.x` versions. No Expo SDK version skew detected.

### 9.2 React Native 0.79.6 — New Architecture Enabled `[INFO]`
**File:** `package.json:62` — `"react-native": "0.79.6"`, `app.json:104-109` — `"newArchEnabled": true` for both iOS and Android.

React Native 0.79.x with New Architecture (Fabric renderer + JSI) enabled. This is the correct forward-looking configuration for SDK 53. Some third-party libraries may have incomplete New Architecture support. **UNVERIFIED** — no compatibility audit of all dependencies was performed against New Architecture.

### 9.3 `@sentry/react-native` Pinned to `^8.11.1` `[HARDEN]`
**File:** `package.json:28`

The Sentry React Native SDK is at `^8.11.1`. The lockfile (`package-lock.json`) shows the installed Sentry internal packages (`@sentry-internal/*`, `@sentry/core`, `@sentry/browser`) are at `10.51.0` — a significant version mismatch between the `@sentry/react-native` declared version and the internal core packages. This is caused by the `^` range and peer dependency resolution. **UNVERIFIED** — whether the installed combination is the officially supported pairing per Sentry's compatibility matrix.

### 9.4 `@supabase/supabase-js` at `^2.105.3` `[INFO]`
**File:** `package.json:29`

Supabase JS SDK at `^2.105.3`. This is a recent 2.x release. The `is_anonymous` field on the User type (see §1.10) should be typed in this version — the `as any` cast in `AuthProvider.tsx` may be unnecessary.

### 9.5 `react-native-purchases` at `^10.1.0` `[INFO]`
**File:** `package.json:58`

RevenueCat SDK at `10.1.0`. This is a recent release. Version 10.x introduced breaking changes from 9.x. **UNVERIFIED** — whether the installed version is fully compatible with React Native 0.79 New Architecture.

### 9.6 `zustand` at `^4.5.4` — Not v5 `[INFO]`
**File:** `package.json:67`

Zustand 4.x is stable and production-ready. Zustand 5 was released in late 2024 with breaking changes. No action required, but a migration window exists for future upgrades.

### 9.7 `promise` Package Listed as Runtime Dependency `[INFO]`
**File:** `package.json:64` — `"promise": "^8.3.0"`

The `promise` polyfill package is listed as a runtime dependency. Modern React Native (0.72+) ships with native Promise support via the Hermes engine. This polyfill may be a transitive requirement from another package or a legacy holdover. **UNVERIFIED** — whether it is actively required at runtime.

### 9.8 No Audit of Known CVEs in Dependencies `[INFO]`
No `npm audit` or equivalent was run as part of this read-only audit. **UNVERIFIED** — whether any installed packages contain known security vulnerabilities. This should be run separately.

---

## 10. Testing

### 10.1 Zero Test Files Found `[BLOCKER]`
A recursive search for `*.test.*`, `*.spec.*`, and `__tests__` directories across the entire `mobile-app/` tree (excluding `node_modules`) returned **zero results**.

Jest and `jest-expo` are installed as devDependencies (`package.json:74-75`) and a `"test": "jest"` script is defined (`package.json:10`). No `jest.config.*` file was found. The testing infrastructure is scaffolded but no tests exist.

The following critical paths have no test coverage:
- Authentication flow (anonymous → permanent sign-in, account deletion).
- Premium entitlement gating (`isPremium` checks in TodayScreen, ReadingsScreen, CounselScreen).
- Purchase flows (RevenueCat `purchaseBoostPack`, `purchaseCalendar`, `purchaseCompatibilitySingle`).
- Profile persistence and hydration (cross-identity stale data guard in `SplashScreen.tsx:112-113`).
- Crisis keyword detection in `CounselChatScreen`.
- `profileStore` state transitions (reset, `commitProfileToServer`, `pendingServerSync`).

### 10.2 No E2E Test Framework `[HARDEN]`
No Detox, Maestro, or Appium configuration was found. There is no automated UI test suite capable of exercising purchase flows or auth transitions on a simulator or device.

---

## 11. Internationalization (I18N)

### 11.1 No I18N Framework Installed `[HARDEN]`
`i18next`, `react-i18next`, `expo-localization` (runtime usage), `react-native-localize`, or any equivalent i18n library was found in **neither** the dependencies nor the runtime imports. `expo-localization` is installed (`package.json:45`) but grep returned **zero** occurrences of `getLocales`, `locale`, or any `expo-localization` import in `src/`.

### 11.2 All UI Strings are Hardcoded in English `[HARDEN]`
All user-facing strings in screens, alerts, and components are hardcoded English literals. Examples:

- `src/screens/tabs/TodayScreen.tsx:202-203` — `"Love"`, `"Work"`, `"Health"`, `"Today's cosmic stage"`, `"Reflection"`.
- `src/screens/tabs/TodayScreen.tsx:287` — Full paragraph: `'Your daily reading above is yours, free, every day...'`
- `src/screens/tabs/ReadingsScreen.tsx:283-287` — `"Your complete psychological framework…"`, `"1 per month · Cached after first generation."`.
- `src/context/AuthProvider.tsx:206, 211, 265, 290, 317, 331, 347, 360, 388, 400, 477` — All alert titles and messages.
- `src/screens/settings/DeleteAccountScreen.tsx:24, 88-90, 100` — Deletion confirmation strings.
- `src/screens/tabs/MoreScreen.tsx:135, 157, 184, 249, 304` — All section headings and menu labels.

### 11.3 Backend Language Override Present but UI is English-Only `[HARDEN]`
**File:** `src/stores/profileStore.ts:53, 107`, `src/constants/questions.ts`

The app supports a `languageOverride` field (stored in profileStore and synced to the backend) and uses it when making API requests for AI-generated content (e.g., `src/screens/tabs/ReadingsScreen.tsx:50` passes `languageOverride ?? 'en'` to the reading request). The AI-generated content from the backend is therefore returned in the selected language. However, all UI chrome (labels, buttons, alerts, empty states, error messages) remains English regardless of `languageOverride`. This creates a mixed-language experience that undermines the usefulness of the language setting.

### 11.4 Date Formatting Locale Hardcoded `[INFO]`
**File:** `src/screens/tabs/TodayScreen.tsx:55`

As noted in §4.4, `toLocaleDateString('en-US', …)` ignores `languageOverride`.

---

## Summary Table

| # | Finding | Severity | File(s) |
|---|---------|----------|---------|
| 1.1 | Supabase session stored in unencrypted AsyncStorage | `[HARDEN]` | `src/lib/supabase.ts:14-20` |
| 1.6 | Deep-link `token_hash` logged to console | `[HARDEN]` | `App.tsx:72, 81` |
| 1.7 | Verbatim SDK error messages surfaced to users | `[HARDEN]` | `src/context/AuthProvider.tsx:265,290` |
| 1.8 | Apple Sign-In token revocation not implemented | `[BLOCKER]` | `src/context/AuthProvider.tsx:463-465` |
| 1.9 | Sentry `beforeSend` scrubbing is shallow (no nested/breadcrumb) | `[HARDEN]` | `App.tsx:36-63` |
| 1.10 | `is_anonymous` read via unsafe `as any` cast | `[HARDEN]` | `src/context/AuthProvider.tsx:375,412,531` |
| 2.4 | RevenueCat SDK is iOS-only; Android users cannot purchase | `[HARDEN]` | `src/context/PurchasesProvider.tsx:55-58` |
| 3.2 | No `Sentry.captureException()` calls; errors only logged | `[HARDEN]` | all `src/` |
| 3.3 | No per-screen React error boundaries | `[HARDEN]` | `App.tsx:132-146` |
| 3.4 | `console.log/warn/error` active in production builds | `[HARDEN]` | multiple |
| 3.6 | 401 handler does not attempt token refresh | `[HARDEN]` | `src/api/client.ts:45-48` |
| 3.7 | Sentry DSN absent from `development` build profile | `[HARDEN]` | `eas.json:7-13` |
| 4.4 | Date formatting locale hardcoded to `'en-US'` | `[HARDEN]` | `src/screens/tabs/TodayScreen.tsx:55` |
| 5.1 | No ATT prompt; `NSUserTrackingUsageDescription` absent | `[BLOCKER]` | `app.json:22-33` |
| 5.2 | Analytics opt-out toggle has no runtime effect on mobile | `[HARDEN]` | `src/screens/settings/PrivacySettingsScreen.tsx` |
| 5.3 | PII persisted unencrypted in AsyncStorage | `[HARDEN]` | `src/stores/profileStore.ts:258-289` |
| 5.4 | Apple token revocation absent (compliance) | `[BLOCKER]` | `src/context/AuthProvider.tsx:463-465` |
| 5.6 | Location permissions declared without runtime usage | `[HARDEN]` | `app.json:31-32, 54-55` |
| 5.7 | Camera/mic/photo permissions with null justification strings | `[HARDEN]` | `app.json:28-30` |
| 5.8 | Counsel consent stored client-side only | `[HARDEN]` | `src/stores/profileStore.ts:84` |
| 6.1 | Accessibility labels/roles missing on most interactive elements | `[HARDEN]` | all `src/screens/` |
| 6.2 | No `allowFontScaling`/`maxFontSizeMultiplier` control | `[HARDEN]` | all `src/` |
| 7.1 | No network state awareness library | `[HARDEN]` | all `src/` |
| 7.4 | No retry logic for Axios API calls | `[HARDEN]` | `src/api/client.ts` |
| 8.1 | EAS submit config has literal placeholder values | `[BLOCKER]` | `eas.json:53-61` |
| 8.8 | No staging environment in EAS profiles | `[HARDEN]` | `eas.json` |
| 10.1 | Zero test files exist | `[BLOCKER]` | `mobile-app/` |
| 10.2 | No E2E test framework | `[HARDEN]` | `mobile-app/` |
| 11.1 | No I18N framework installed | `[HARDEN]` | `package.json` |
| 11.2 | All UI strings hardcoded in English | `[HARDEN]` | all `src/screens/` |
| 11.3 | UI chrome English-only despite backend language support | `[HARDEN]` | all `src/screens/` |

**BLOCKERS (5):** Apple token revocation (×2: §1.8/§5.4), ATT prompt (§5.1), EAS submit placeholders (§8.1), zero tests (§10.1).

---

*End of audit. No code changes were proposed or made. All findings are based solely on static analysis of the files listed above.*
