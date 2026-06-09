# OMENORA Mobile — Submission Readiness

**Created:** 2026-06-09 · **Status:** Active launch-tracking doc. Consolidates the polish/hardening arc (P1–P12), the on-device verification pass, and the manual founder steps remaining before App Store submission.

> Companion to `MASTER_PLAN_LAUNCH.md`. That doc defined the arc; this one tracks readiness to ship.

---

## 1. Engineering arc P1–P12 — COMPLETE (code)

All items below are implemented, `tsc --noEmit` clean, and `npm test` green (Jest harness + money-path smoke tests). Verified per-prompt with scoped diffs.

| Phase | Shipped | Closes |
|---|---|---|
| P1 | Sensitive log redaction (token_hash URLs, Google userInfo dump, API response body) | EH-1, EH-2, EH-9 |
| P2 | Production `console.*` strip via babel (Hermes-bundle verified; keeps warn/error) | EH-3 |
| P3 | AES-encrypted Supabase session at rest (SecureStore + ciphertext in AsyncStorage) | EH-4 |
| P4 | Axios 401→refresh+retry; safe connection-error retry (no timeout/5xx double-charge) | EH-5, EH-6 |
| P5 | `Sentry.captureException` on money-path/auth; per-screen error boundary; `is_anonymous` typed; recursive PII scrub | EH-7, EH-8, EH-10, EH-11 |
| P6 | Notifications via central apiClient; friendly sign-out errors; stale-comment cleanup | EH-13, UX-8/UX-9 |
| P7 | Apple SIWA refresh-token **revocation on account deletion** (backend) | **B1 / CP-1** |
| P8 | Jest harness + smoke tests: entitlement gate, crisis detection, life-path, time/answers | BL-5 |
| P9 | **Custom OMENORA paywall replaces the RevenueCat hosted paywall** across all call-sites | **MC-1**, MC-5 |
| P10 | PostHog analytics: Supabase-UUID identity bridge, opt-out wired, full funnel/paywall/purchase taxonomy with per-source attribution, web↔mobile identity stitch | MC-4, MC-5, CP-2 |
| P11 | Returning-free-user teaser; Today "Explore" row; free-reading framing; Welcome-to-Premium toast | MC-2, MC-3, MC-6, MC-8 |
| P12 | Archetype-fallback fix; Counsel disclosure hydration guard; crisis-screen hardening; de-dups; dead-code removal; Logomark atom | UX-13, UX-5, UX-10, UX-7, UX-12, D-6 |

**Findings closed without code (verified):** BL-2 permissions (already removed) · BL-4 EAS submit IDs (already filled) · EH-12 dev DSN/staging (acceptable) · MC-7 compatibility restore (retracted — product is a consumable, not restorable) · UX-3 delete-error UI (AuthProvider already alerts).

---

## 2. On-device verification pass

Run once on a **rebuilt dev client** with `EXPO_PUBLIC_POSTHOG_KEY` set (P10 added native modules — OTA will not include them).

### Hardening (P2–P9)
- [ ] App boots; onboarding (Moti/reanimated) animations play
- [ ] Sign in → force-quit → relaunch **stays signed in**; AsyncStorage value under the `sb-…-auth-token` key is **hex ciphertext**, not `eyJ…`
- [ ] Airplane mode → trigger an AI generate → retries then shows a network error (no crash)
- [ ] Temporary `throw` in a screen → ErrorState fallback shows (app not blanked); back works
- [ ] Tap any locked card → **custom paywall** slides up (NOT the RC hosted one); annual pre-selected + "BEST VALUE"; "Maybe later" dismisses
- [ ] Notifications toggle registers / cancels

### Conversion + analytics (P10–P12)
- [ ] Returning free user (after dismissing first-run intro): premium teaser card on Today; dismiss → gone; reappears after ~7 days
- [ ] Today "Explore" row → Compatibility and Calendar open
- [ ] "Your free reading for today" label under the free insight
- [ ] Complete a sandbox purchase → "Welcome to Premium" toast
- [ ] Crisis resources: Call / Text / Visit open; VoiceOver reads each action
- [ ] Logo renders on More + Welcome
- [ ] PostHog: `paywall_viewed {source}`, onboarding step events, and a purchase event land in the project
- [ ] Toggle "Share anonymous usage data" OFF → capture stops

---

## 3. Manual founder steps to submission

### Commit / deploy
- [ ] Commit mobile P11/P12 batch (diff-review first)
- [ ] Deploy **backend** on `main` (carries P7 Apple revoke)
- [ ] Deploy **web** (augur) on `main` (carries P10e identity bridge)

### Environment / secrets
- [ ] `EXPO_PUBLIC_POSTHOG_KEY` (web project token) → `mobile-app/.env` + EAS
- [ ] Confirm `APPLE_SIWA_*` (Team ID, Key ID, Client ID, private key) set in **Railway production** (P7 revoke is a no-op without them)
- [ ] Confirm Anthropic API key in Railway production (Counsel crashes without it)
- [ ] New **dev/TestFlight build** (native modules added in P10)

### App Store Connect
- [ ] Complete metadata for all 8 products (clears the `MISSING_METADATA` warnings → live prices replace fallbacks): 3 subs (weekly/monthly/annual), calendar IAP, 3 counsel packs, compatibility single
- [ ] Subscriptions created with **NO intro trial** (hard paywall)
- [ ] Listing assets (screenshots, description, app-preview), App Privacy questionnaire, encryption declaration (`ITSAppUsesNonExemptEncryption=false` already set)
- [ ] EAS submit: fill the local `.p8` (iOS) and Play service-account (Android) key paths at submit time

### Final
- [ ] Sandbox purchase sweep (all 3 sub tiers, boost pack, compatibility single, calendar)
- [ ] Apple Developer Org conversion decision (Individual vs UNCC Inc.) + Paid Apps agreement
- [ ] **Submit (iOS first per plan)**

---

## 4. Remaining non-code items

| Item | Type | When |
|---|---|---|
| **UX-1** — migrate city search off free Nominatim (ToS forbids bulk/commercial; throttles under ad traffic) | Founder decision (provider + API key) → build | **Before paid ads** |
| Doc reconciliation — `MONETIZATION_SPEC_V4` → 3-tier/no-trial; PRODUCT_MAP stale 30/day + $12.99 notes | Doc edit (Windsurf prompt ready) | Now |
| UX-2 font-scaling cap · UX-4 Button a11y · UX-6 date locale (with i18n) · UX-11 privacy revert | v1.1 (founder-deferred) | v1.1 |
| CP-3 — server-side Counsel consent timestamp | Optional backend | v1.1 |
| Bulk a11y · full i18n · full test suite / E2E | v1.1 (founder-deferred) | v1.1 |

---

## 5. Pre-ads "money machine" (post-submission, before paid spend)

From the Conversion Build Plan — not submission-gating, but required before scaling TikTok/Meta:

- [ ] W3 — push notification delivery pipeline (tokens captured; delivery absent)
- [ ] W2 — deep-link routing (`NavigationContainer linking`)
- [ ] W7 — install attribution / MMP (LTV:CAC unmeasurable without it)
- [ ] UX-1 geocoder migration (above)
- [ ] Confirm the unit-economics scoreboard (LTV:CAC, payback, D1/D7/D30) is live in PostHog before scaling spend

---

*Update this doc as items complete. Engineering arc is done; the path to submission is now manual platform + config work.*
