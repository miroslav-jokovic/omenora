# OMENORA PostHog Analytics Audit
**Date:** 2026-06-05  
**Auditor:** Cascade (read-only, no code changes)  
**Scope:** `/Volumes/ESSD/Projects/Augur-V1/augur/` (web) and `/Volumes/ESSD/Projects/Augur-V1/mobile-app/` (mobile)

---

## 1. WEB POSTHOG STATE (augur/)

### 1.1 Package Installation

- **Package name:** `posthog-js`
- **Declared version:** `^1.369.3` — `augur/package.json:37`
- **Installed version (node_modules):** `1.369.3` — confirmed from `augur/node_modules/posthog-js/package.json` `"version"` field

### 1.2 Initialization

- **File:** `augur/app/plugins/pixels.client.ts:1–30`
- **Init call:** `posthog.init(posthogKey, { ... })` at line `23`
- **API key source:** `config.public.posthogKey` — read from Nuxt `runtimeConfig.public.posthogKey` at `pixels.client.ts:7`. The runtime config key is declared as an empty-string default at `augur/nuxt.config.ts:75`. At runtime, Nuxt would populate it from the env var `NUXT_PUBLIC_POSTHOG_KEY` (standard Nuxt public key naming convention).
- **Actual key value:** UNVERIFIED — `augur/.env` is not readable by this audit. `augur/.env.example` does not contain a `NUXT_PUBLIC_POSTHOG_KEY` entry at all. No PostHog key placeholder exists anywhere in the example file.
- **Host:** `https://app.posthog.com` — `pixels.client.ts:24`. This is the US cloud region (`us.posthog.com` is a redirect alias; `app.posthog.com` is the canonical US ingestion endpoint).

### 1.3 Production vs Dev/Personal Project

UNVERIFIED — the actual key value cannot be read. No comment in the code indicates whether the configured key is a production project or a dev/personal project. The only observable evidence is:
- The init guard `if (posthogKey)` at `pixels.client.ts:22` means PostHog does not init if the env var is unset or empty, which would be the case in local dev if `NUXT_PUBLIC_POSTHOG_KEY` is not set.
- `augur/.env.example` has no PostHog key entry, suggesting the key is stored in the live `.env` but is intentionally not templated.

### 1.4 Init Options

```
pixels.client.ts:23–29
posthog.init(posthogKey, {
  api_host: 'https://app.posthog.com',
  capture_pageview: true,
  capture_pageleave: true,
  autocapture: false,
  persistence: 'localStorage+cookie',
})
```

- **`capture_pageview: true`** — PostHog fires its own `$pageview` event on init and on route changes automatically.
- **`capture_pageleave: true`** — PostHog fires `$pageleave` automatically.
- **`autocapture: false`** — PostHog will NOT auto-capture clicks, form submissions, or DOM mutations. All event capture is explicit.
- **`persistence: 'localStorage+cookie'`** — PostHog persists its anonymous distinct ID and session data in both localStorage AND a cookie.

### 1.5 Explicit PostHog `capture()` Call Sites

PostHog capture is routed exclusively through the `safeTrack` internal helper (`pixels.client.ts:115–138`). The helper fires `posthog.capture(eventName, props ?? {})` at line `132` only if `posthogKey && posthog.__loaded`. Every `safeTrack` call therefore results in a PostHog capture. The named plugin helpers that call `safeTrack` are:

| Plugin helper | PostHog event name | Called from | Call site file + line |
|---|---|---|---|
| `trackLandingView` | `landing_view` | UNVERIFIED — `$trackLandingView` is defined in plugin but no call site found in `app/pages/` during this audit | — |
| `trackCompatibilityQuizStart` | `compatibility_quiz_start` | `pages/compatibility-quiz.vue:158` (onMounted) | `compatibility-quiz.vue:158` |
| `trackCompatibilityPaywallView` | `compatibility_paywall_view` | `pages/compatibility.vue:891` | `compatibility.vue:891` |
| `trackAnalysisStart` | `analysis_start` | `pages/analysis.vue:250` (onMounted) | `analysis.vue:250` |
| `trackStep1Complete` | `step1_complete` | `pages/analysis.vue:347` and `analysis.vue:358` | `analysis.vue:347`, `analysis.vue:358` |
| `trackQuestionAnswered` | `question_answered` | `pages/analysis.vue:387` (answers watcher) | `analysis.vue:387` |
| `trackQuestionAnswered` | `question_answered` | `pages/compatibility-quiz.vue:315` | `compatibility-quiz.vue:315` |
| `trackAnalysisSubmit` | `analysis_submit` | `pages/analysis.vue:509` | `analysis.vue:509` |
| `trackPreviewLoadingStart` | `preview_loading_start` | `pages/preview.vue:326` | `preview.vue:326` |
| `trackViewContent` | `ViewContent` | `pages/preview.vue:379` (nextTick after load) | `preview.vue:379` |
| `trackPreviewLoaded` | `preview_loaded` | `pages/preview.vue:385` (nextTick after load) | `preview.vue:385` |
| `trackPaywallView` | `paywall_view` | `pages/preview.vue:391` (nextTick after load) | `preview.vue:391` |
| `trackTierSelected` | `tier_selected` | `pages/preview.vue:565` | `preview.vue:565` |
| `trackInitiateCheckout` | `InitiateCheckout` | `pages/preview.vue:571` | `preview.vue:571` |
| `trackInitiateCheckout` | `InitiateCheckout` | `pages/compatibility-quiz.vue:338` | `compatibility-quiz.vue:338` |
| `trackInitiateCheckout` | `InitiateCheckout` | `pages/compatibility.vue:756` | `compatibility.vue:756` |
| `trackEmailCaptureSuccess` | `email_capture_success` | `pages/preview.vue:539` | `preview.vue:539` |
| `trackPurchase` | `checkout_complete` | `pages/report.vue:1123` | `report.vue:1123` |
| `trackPurchase` | `checkout_complete` | `pages/calendar.vue:250` | `calendar.vue:250` |
| `trackPurchase` | `checkout_complete` | `pages/compatibility.vue:1098` | `compatibility.vue:1098` |
| `trackReportViewed` | `report_viewed` | `pages/report.vue:900`, `report.vue:936`, `report.vue:1030`, `report.vue:1051` | `report.vue` (4 call sites) |
| `trackShareCardOpened` | `share_card_opened` | `pages/report.vue:1138` | `report.vue:1138` |
| `trackShareCardDownloaded` | `share_card_downloaded` | `pages/report.vue:1167` | `report.vue:1167` |
| `trackCustomEvent` | (caller-supplied name) | `pages/compatibility.vue:498` (via local `trackEvent` wrapper) | `compatibility.vue:498` |
| `trackUpsellViewed` | `upsell_viewed` | UNVERIFIED — defined in plugin at `pixels.client.ts:454` but no call site found in `app/pages/` during this audit | — |
| `trackUpsellAccepted` | `upsell_accepted` | UNVERIFIED — defined in plugin at `pixels.client.ts:464` but no call site found in `app/pages/` during this audit | — |

**Important note on `trackViewContent` and `trackInitiateCheckout`:** These helpers do NOT call `safeTrack`; they issue platform-specific calls (TikTok/Meta only) and do not send to PostHog. Only `trackPurchase` wraps with `safeTrack` → PostHog via `checkout_complete` event name (`pixels.client.ts:295`).

**Autocapture:** Disabled — `pixels.client.ts:27`. Confirmed above.

### 1.6 `posthog.identify()` Call Sites

**Finding: `posthog.identify()` is NEVER called anywhere in the codebase.**

- The plugin's `identifyUser` helper (`pixels.client.ts:507–518`) only calls `ttq.identify()` (TikTok pixel SHA-256 hashed email). It does **not** call `posthog.identify()`.
- `$identifyUser` is consumed at `pages/compatibility.vue:493` and called at `compatibility.vue:639`. That call reaches `ttq.identify` only — no PostHog identify.
- No other file in `augur/app/` calls `posthog.identify`.
- No Supabase user ID, email, or any other identifier is ever passed to PostHog. All PostHog data is under PostHog's own anonymous `distinct_id`.

### 1.7 Consent / Opt-Out / Cookie Gate

**Finding: There is no consent gate, cookie banner, opt-out mechanism, or `posthog.opt_out_capturing()` call anywhere in the web codebase.**

- A search across all `.vue` and `.ts` files in `augur/app/` for `consent`, `opt_out`, `opt_in`, `gdpr`, and `cookie` returned zero results.
- PostHog initializes unconditionally for any visitor when `posthogKey` is set — no user action required.
- `persistence: 'localStorage+cookie'` means PostHog writes a cookie on page load without consent prompt.

### 1.8 Meta Pixel / TikTok Pixel Coexistence with PostHog

The three trackers are **entirely independent** — they do not route through each other. The architecture is:

1. **PostHog** — initialized via `posthog.init()` at `pixels.client.ts:23`. Receives events via `safeTrack` wrapper (line 132). Fires automatically on pageview/pageleave.
2. **Meta Pixel** — initialized via the inline `fbevents.js` injection at `pixels.client.ts:74–95`. Fires `PageView` on init and on every route change (`pixels.client.ts:103–105`). Receives custom events via `fbq('trackCustom', ...)` inside `safeTrack` (line 125) and standard events via direct `fbq('track', ...)` calls within individual named helpers (e.g. `trackViewContent`, `trackInitiateCheckout`, `trackPurchase`).
3. **TikTok Pixel** — initialized via the inline `events.js` injection at `pixels.client.ts:33–71`. Fires `page()` on init and on every route change (`pixels.client.ts:100–102`). Receives events via `ttq.track(...)` inside `safeTrack` (line 118) and direct calls in named helpers.

**Event name alignment:** `safeTrack` fires the same `eventName` string to all three destinations simultaneously. However, named helpers like `trackViewContent`, `trackInitiateCheckout` use **platform-native event names** for Meta/TikTok (`ViewContent`, `InitiateCheckout`, etc.) and do NOT call `safeTrack`, so those events do not reach PostHog.

**Summary:** Meta and TikTok fire independently of PostHog. PostHog only receives events routed through `safeTrack`. Events sent directly to Meta/TikTok via named helpers are invisible to PostHog.

---

## 2. MOBILE POSTHOG STATE (mobile-app/)

### 2.1 Package Installation

**Confirmed: No PostHog package is installed.**

`mobile-app/package.json` (all 84 lines read) contains no reference to `posthog-react-native`, `posthog-js`, or any `@posthog/*` package in either `dependencies` or `devDependencies`.

### 2.2 PostHog Init or Capture Calls in Source

**Confirmed: Zero PostHog calls exist anywhere in `mobile-app/src/`.**

A full grep across `mobile-app/src/` for the string `posthog` returned no results. No init, no capture, no identify.

**The prior recon claim of zero mobile PostHog is correct.**

---

## 3. IDENTITY BRIDGE FEASIBILITY

### 3.1 Canonical User Identifier Available on Mobile (post-auth)

After a user authenticates in the mobile app, the following identifiers are available in client state:

- **Supabase user ID (`user.id`):** Available via `useAuth()` → `AuthContext` → `user: User | null`. The `user` object is the Supabase `User` type. `user.id` is the Supabase UUID. Accessible at `src/context/AuthContext.ts:7` (type declaration) and `src/context/AuthProvider.tsx:36` (provider state).
- **Email:** Available via `useAuth()` → `AuthContext`. The web `useAuth` composable exposes `userEmail` as a computed. In mobile, `user.email` is accessible on the `User` object. However, anonymous Supabase users have no email. Email is only present for permanent (non-anonymous) users.
- **`isAnonymous` flag:** `src/context/AuthContext.ts:7` — distinguishes anonymous from permanent users.

The Supabase `user.id` (UUID) is the canonical persistent identifier — it is available for both anonymous and permanent users, and survives the anonymous → permanent account merge (`AuthProvider.tsx:137`).

### 3.2 Canonical User Identifier Available on Web (at identify point)

The web `useAuth` composable (`augur/app/composables/useAuth.ts`) exposes:
- `session.value?.user?.id` — Supabase user UUID (accessible, not currently passed to PostHog)
- `userEmail` — computed from `session.value?.user?.email` at `useAuth.ts:170`

At the one place `$identifyUser` is called (`compatibility.vue:639`), the identifier passed is the **raw email string** — and it only goes to TikTok (hashed SHA-256), not PostHog.

### 3.3 Can Web and Mobile Share One PostHog Identity?

**Yes — using the Supabase user UUID.**

- Mobile: `user.id` (Supabase UUID) is available post-auth at `src/context/AuthProvider.tsx:137` (line where `Purchases.logIn(user.id)` is already called, confirming the pattern).
- Web: `session.value?.user?.id` is available in `useAuth.ts`.
- The Supabase UUID is the same value on both platforms for any user who has authenticated with the same Supabase project.
- If `posthog.identify(supabaseUserId)` were called on web and `posthog.capture` with the same distinct ID were called on mobile, sessions would stitch in PostHog.

**The correct shared ID is the Supabase user UUID.** Email is unsuitable as the bridge because anonymous users lack one.

---

## 4. PRIVACY / OPT-OUT WIRING

### 4.1 Mobile `analyticsEnabled` Toggle — What It Actually Does

The `PrivacySettingsScreen.tsx` toggle controls the `analyticsEnabled` field in Zustand (`profileStore`) and optionally syncs it to the server column `analytics_enabled` via `updateProfileField` (`PrivacySettingsScreen.tsx:28`).

**What it does NOT do:**
- It does not call any analytics SDK method.
- It does not disable PostHog (PostHog is not installed on mobile).
- It does not disable Sentry (`@sentry/react-native` is installed — `mobile-app/package.json:28` — but no Sentry opt-out logic is tied to `analyticsEnabled`).
- It does not prevent any data from being sent anywhere.

**What it does:**
- Writes `analyticsEnabled: boolean` to Zustand local state (`profileStore.ts`).
- If the user is not anonymous, writes the value to the `analytics_enabled` column in Supabase `user_profiles` table via `updateProfileField`.
- The field is read nowhere in `mobile-app/src/` except at the store definition. No screen, hook, or API call reads `analyticsEnabled` to conditionally suppress any tracking. It is a write-only flag with no downstream effect in the client.

This confirms the prior recon claim: the toggle currently does nothing observable in terms of analytics suppression.

### 4.2 Web Opt-Out — `posthog.opt_out_capturing()`

**Finding: `posthog.opt_out_capturing()` (or any equivalent) is never called anywhere in `augur/app/`.**

There is no cookie banner, no consent management, and no user-facing opt-out mechanism on the web side. PostHog runs unconditionally for all visitors when the API key is set.

---

## OPEN QUESTIONS / UNVERIFIED

1. **PostHog API key value** — `NUXT_PUBLIC_POSTHOG_KEY` is not in `.env.example`. The actual key in `.env` could not be read. Whether it is a production project key or a dev/personal project key is UNVERIFIED.

2. **`NUXT_PUBLIC_POSTHOG_KEY` env var name** — The runtime config key is `posthogKey` (`nuxt.config.ts:75`). Nuxt maps public runtime config to `NUXT_PUBLIC_<SCREAMING_SNAKE_CASE>`, which would be `NUXT_PUBLIC_POSTHOG_KEY`. This mapping has not been confirmed by reading the live `.env` file.

3. **`trackLandingView`, `trackUpsellViewed`, `trackUpsellAccepted` call sites** — These three helpers are defined in `pixels.client.ts` and would fire to PostHog via `safeTrack`, but no call sites were found in `app/pages/` during this audit. They may be called from components or may be defined but unused. UNVERIFIED.

4. **PostHog `$pageview` and `$pageleave` deduplication with SPA routing** — `capture_pageview: true` fires an initial pageview on `posthog.init()`. The router `afterEach` hook (`pixels.client.ts:99–111`) does NOT explicitly call `posthog.capture('$pageview', ...)`. Whether PostHog's internal SPA page-change tracking fires on each navigation is determined by PostHog's own SDK behavior, not by code in this repo. UNVERIFIED.

5. **`analyticsEnabled` server-side use** — The `analytics_enabled` column is written to Supabase via `updateProfileField`. Whether the backend reads this column to suppress any server-side analytics, logging, or data pipelines is UNVERIFIED from client code.

6. **Sentry + `analyticsEnabled` relationship on mobile** — `@sentry/react-native` is installed (`mobile-app/package.json:28`). No code was found gating Sentry initialization or event capture on the `analyticsEnabled` flag. Whether Sentry init elsewhere checks this flag is UNVERIFIED (Sentry init file not audited in this pass).

7. **PostHog distinct ID persistence across sessions** — With `persistence: 'localStorage+cookie'`, PostHog uses both storage mechanisms. If a user clears cookies but not localStorage (or vice versa), PostHog's identity handling is determined by the SDK's internal resolution logic. No custom `loaded` callback is set, so there is no application-level control over distinct ID assignment.

8. **`identifyUser` TikTok hashing correctness** — The helper hashes the email with SHA-256 via Web Crypto API (`pixels.client.ts:187–194`). Whether this matches TikTok's expected hashing format (lowercase + trim only, or additional normalization) is UNVERIFIED.
