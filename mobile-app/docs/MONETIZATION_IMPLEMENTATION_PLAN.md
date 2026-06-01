# OMENORA Monetization Implementation Plan

**Source of truth for monetization spec:** `MONETIZATION_SPEC_V4.md`  
**Status legend:**  
- `PENDING SPECIFICATION` — phase scope known, internal steps not yet researched/documented  
- `READY FOR IMPLEMENTATION` — phase fully specified, can be executed without further research  
- `IN PROGRESS` — implementation underway  
- `SHIPPED` — phase complete, on main, verified

---

## Progress Log

Append-only record of implementation work completed. Each entry references the phase step and the verifiable outcome.

### 2026-05-14 — Track C (Supabase migrations) shipped

Three SQL migration files created and executed directly against Supabase project scvjjbgejmkomyciabex:
- 20260514120000_user_credits_table.sql — table created, backfilled 61 user rows, RLS policy in place
- 20260514120100_credit_transactions_table.sql — ledger created, UNIQUE constraint on revenuecat_event_id for idempotency, 2 indexes, RLS policy in place
- 20260514120200_credit_rpc_functions.sql — three SECURITY DEFINER RPCs (grant_credits, clawback_credits, consume_credit), EXECUTE granted to service_role only after locking down anon/authenticated default grants

Verification: all 6 manual RPC tests passed (grant, idempotency on duplicate event_id, additional grant stacking, consume decrement, clawback subtraction, floor-at-zero on excess clawback). Test data cleaned up post-verification.

### 2026-05-14 — Phase 1 (Backend Cap Correction & Credit Infrastructure) shipped

Files modified:
- server/utils/entitlements.ts — counsel cap flipped from daily to monthly; new SUGGESTED_PRODUCTS constants; new AccessContext discriminated union type; new exported requirePremiumOrCreditAccess helper
- server/utils/credits.ts (new) — wraps the three RPCs as TypeScript helpers (getCreditBalance, consumeCredit, grantCredits, clawbackCredits)
- server/api/revenuecat/webhook.post.ts — new CONSUMABLE_PRODUCTS constant; new branch handling NON_RENEWING_PURCHASE, CANCELLATION, REFUND, EXPIRATION for the four consumable products before the existing entitlement-loop path
- server/api/counsel/message.post.ts — guard swapped to requirePremiumOrCreditAccess; success path branches on ctx.source (premium → incrementUsage; credit → consumeCredit); response shape now includes source field
- server/api/generate-compatibility.post.ts — same guard swap; credit-source users with previewMode=true forced into full-mode path (paid for full reading); usage field added to response with source branching

Backend verification: tsc --noEmit exit code 0 across all changes. requirePremiumWithUsage and incrementUsage left byte-identical for the 3 other endpoints (archetype, natal_chart, forecast) that don't support credit fallback.

### 2026-05-14 — Phase 2 (Mobile Monetization UI) — Steps 2.1 through 2.9 shipped

Steps completed:
- 2.1 — src/api/client.ts: 429 interceptor preserves AxiosError body; new getErrorBody helper exported
- 2.2 — src/api/errors.ts (new): parseBackendError function returns BackendError discriminated union covering subscription_required, cap_reached, auth_required, network, unknown
- 2.3 — src/api/endpoints.ts: CounselUsage discriminated union exported; CounselMessageResponse.usage and CompatibilityResponse.usage typed as CounselUsage; CounselChatScreen received companion type narrowing
- 2.4 — src/context/PurchasesContext.ts and PurchasesProvider.tsx: 4 new fields (boostPacksOffering, compatibilityAddonOffering, purchaseBoostPack, purchaseCompatibilitySingle) added to context value; offerings fetched at both init and post-logIn sites
- 2.5 — TodayScreen LockedCards uncommented (placement: feature_archetype_today and feature_dimensions_today); ReadingsScreen catch blocks for archetype, natal_chart, forecast endpoints use parseBackendError; subscription_required triggers presentPaywall; state resets to 'initial' after paywall dismiss
- 2.6a — src/components/molecules/CompatibilityIAPSheet.tsx (new): bottom-sheet component listing single $4.99 compat reading + upsell to premium; backdrop-dismiss pattern; userCancelled silent; loading state when offering null
- 2.6b — CompatibilityScreen.tsx: catch block routes subscription_required and cap_reached to CompatibilityIAPSheet (with fallback to presentPaywall if offering null); sheet renders at screen root; onPurchaseSuccess re-fires handleSubmit
- 2.7a — src/components/molecules/BoostPackSheet.tsx (new): three-pack sheet (spark/insight/ascend) with badge approach for "MOST POPULAR" (insight) using tokens.accent.emphasis; package lookup via p.identifier; per-row purchase state
- 2.7b — CounselChatScreen.tsx: cap-check wording updated to monthly; cap_reached and pre-check both open BoostPackSheet; subscription_required catch path navigates back to CounselScreen tab; usage counter shows "this month" for premium and "N conversations remaining" for credit; getPostPurchaseMessage helper added
- 2.8 — CounselScreen.tsx (tab entry): added Button variant="tertiary" "Or pay per conversation — from $1.99" below "Start chatting" for free users; opens BoostPackSheet; onPurchaseSuccess navigates to CounselChat
- 2.9 — CounselChatScreen.tsx: removed the !isPremium entry guard useEffect entirely; removed isPremium destructure and usePurchases import (became dead code); free users with credits can now enter and send

Mobile verification: tsc --noEmit exit code 0 across all 12 files modified or created across these 9 steps. No backend regressions (backend changes are tolerated by both old and new clients).

### 2026-05-14 — Phase 2 Steps 2.10–2.11 shipped

Step 2.10 — Toast post-purchase confirmation:
- 2.10a — Toast component made safe-area aware: `useSafeAreaInsets` + `space['2']` top offset; public props unchanged.
- 2.10b — CompatibilityScreen wired: success Toast ("Compatibility reading unlocked"), `iapSheetVisible` state added, `handleSubmit` retry preserved on `onPurchaseSuccess`.
- 2.10c — CounselChatScreen wired: Toast replaces the prior system-chat-bubble post-purchase confirmation pattern; `getPostPurchaseMessage` helper removed; `setUsage(null)` preserved. CounselScreen (tab entry) intentionally excluded — it navigates away immediately on purchase success, making any toast invisible.

Step 2.11 — Calendar IAP plumbing:
- 2.11a — `MONETIZATION_SPEC_V4.md` updated: 2026 Lucky Timing Calendar added to Premium inclusions in section 1; IAP audience narrowed to "Free users only" in section 2; footnote added in section 6 (RevenueCat product mapping).
- 2.11b-pre — `restorePurchases` added to `PurchasesContext` + `PurchasesProvider`. Signature: `() => Promise<CustomerInfo>`. Implementation calls `Purchases.restorePurchases()` then `refreshCustomerInfo()`, mirroring existing purchase method discipline.
- 2.11b — `CalendarIAPSheet` component built (`src/components/molecules/CalendarIAPSheet.tsx`). Mirrors `CompatibilityIAPSheet` structure with an added Restore Purchases affordance required for Apple App Review §3.1.1 compliance on the only non-consumable IAP (`omenora_calendar_2026`). Two options: IAP purchase + subscription upsell. In-sheet error display. No direct react-native-purchases SDK imports (all via context). Added to molecules barrel.
- 2.11c — `CalendarScreen` consolidated: `LockedCard` `onUnlockPress` now opens `CalendarIAPSheet` (no longer calls `presentPaywall` directly). Inline ghost "Buy 2026 Calendar" button removed. `handleBuyCalendar` handler removed. `Alert.alert` "Purchase failed" error path removed. `isPurchasingCalendar` local state removed. Toast wired for both IAP purchase success ("2026 Calendar unlocked") and restore success ("Purchases restored"). Restore detection via `useRef` pair (`prevHasCalendar` + `sheetWasOpen`). TraditionSwitcher verified clean — no changes required.

Mobile verification: `tsc --noEmit` exit code 0 across all files.

---

## Phase template (applies to every phase below)

Each phase will be filled in with these sub-sections during the per-phase specification pass:

- **Goal** — single-sentence outcome statement
- **Scope (in)** — what this phase delivers
- **Scope (out)** — what this phase explicitly does not deliver
- **Pre-conditions** — what must be true before phase can start (other phases, external dependencies, account states)
- **Dependencies (external)** — App Store Connect, RevenueCat dashboard, Apple Developer Program, Supabase schema, third-party services
- **Implementation steps** — ordered, numbered, atomic enough that no step requires mid-flight research
- **Files affected** — full list of files to create, modify, or delete
- **Acceptance criteria** — verifiable conditions that prove the phase shipped correctly
- **Rollback plan** — what to do if the phase ships broken
- **Risks / open questions** — anything surfaced during specification that needs explicit decision before implementation starts

---

## Phase 0 — Account & Infrastructure Prerequisites

**Status:** IN PROGRESS — Track C complete; Tracks A/B/D pending external dependencies

### Goal
Establish every account, dashboard, and database prerequisite required to create RevenueCat products and accept payment, before any backend or mobile code is written.

### Scope (in)
- Apple Developer Program organization conversion (Individual → Organization under UNCC Inc.)
- App Store Connect agreements, tax forms, banking — all to "Clear" status
- App Store Connect subscription group creation
- App Store Connect product placeholders created (configuration may be incomplete pending screenshots/metadata)
- RevenueCat project verification + entitlement creation (`premium`, `calendar_2026`)
- RevenueCat offering structure created (subscriptions offering + consumables offering)
- Supabase schema additions: `user_credits` table, `credit_transactions` ledger
- Environment variable additions for mobile RevenueCat SDK keys
- Bundle ID / app identifier verification across all systems

### Scope (out)
- Any backend gating logic changes (Phase 1)
- Any mobile UI changes (Phase 2+)
- Any paywall configuration in RevenueCat (Phase 3)
- Calendar prompt regeneration for future years (Phase 7)

### Pre-conditions
- D-U-N-S Number issued by D&B for United Northwest Carriers Inc. (applied ~May 4, 2026; typical wait up to 30 business days)
- Apple Developer Program Account Holder access for the OMENORA team
- Supabase project admin access for project ref `scvjjbgejmkomyciabex` 
- RevenueCat project admin access for project `3f9c1cd9` 
- A US business bank account in the name of United Northwest Carriers Inc. (S-Corp) accepting USD wire transfers from Apple

### Dependencies (external)
- Apple Developer Program (organization status, D-U-N-S verification)
- Apple App Store Connect (Agreements / Tax / Banking module)
- RevenueCat dashboard (project 3f9c1cd9)
- Supabase (project scvjjbgejmkomyciabex)
- D&B (D-U-N-S Number issuance — outside our control)

### Implementation steps

The steps below are split into three tracks. Tracks A and B can proceed in parallel once D-U-N-S issues. Track C can start immediately and does not depend on Apple.

**Track A — Apple Developer & App Store Connect (sequential, gated by D-U-N-S)**

1. Confirm D-U-N-S Number issuance from D&B for United Northwest Carriers Inc. Status check via D&B portal or email confirmation.
2. In Apple Developer account, request Individual → Organization conversion using the D-U-N-S Number. Apple reviews; typical wait 1–5 business days.
3. After organization conversion completes, sign in to App Store Connect as Account Holder for the converted org.
4. Navigate to Business → Agreements. Sign the Paid Applications Agreement under the UNCC Inc. legal entity.
5. Submit a new W-9 tax form under United Northwest Carriers Inc. EIN 47-3249610. The previously cancelled W-9 (entity mismatch under sole proprietor) is now superseded.
6. Add primary bank account information for UNCC Inc. business account. Wait for Apple banking partner verification — status must reach "Clear" before subscription products can be created.
7. In App Store Connect → My Apps → OMENORA (App ID 6768273672) → Features → Subscriptions, create a new Subscription Group named `omenora_premium_group`. Reference name only — not user-facing.
8. Add subscription product `omenora_monthly` to the group: 1-month duration, price tier $14.99 USD, with 7-day free trial introductory offer.
9. Add subscription product `omenora_annual` to the group: 1-year duration, price tier $99.99 USD, with 7-day free trial introductory offer.
10. In App Store Connect → Features → In-App Purchases, create non-consumable product `omenora_calendar_2026`, price tier $4.99 USD.
11. Create consumable product `omenora_compatibility_single`, price tier $4.99 USD.
12. Create consumable products `omenora_counsel_spark` ($1.99), `omenora_counsel_insight` ($4.99), `omenora_counsel_ascend` ($9.99).
13. For all 7 products: localized display name + description in English, review screenshot if Apple requires (often deferred until first review submission).

**Track B — RevenueCat dashboard (depends on Apple products existing)**

14. In RevenueCat project 3f9c1cd9, navigate to Product Catalog → Entitlements. Create entitlement `premium` (description: "Premium subscription access").
15. Create entitlement `calendar_2026` (description: "2026 Lucky Timing Calendar access").
16. Do NOT create entitlements for any consumable products.
17. Navigate to Product Catalog → Products → iOS. Import or create products matching the App Store Connect product IDs verbatim: `omenora_monthly`, `omenora_annual`, `omenora_calendar_2026`, `omenora_compatibility_single`, `omenora_counsel_spark`, `omenora_counsel_insight`, `omenora_counsel_ascend`.
18. Attach `premium` entitlement to both `omenora_monthly` and `omenora_annual`.
19. Attach `calendar_2026` entitlement to `omenora_calendar_2026`.
20. Verify consumable products have NO entitlement attached.
21. Mark consumable products as consumable type (NOT non-consumable). Default for new products in RevenueCat is consumable for non-subscription products, but verify explicitly.
22. Navigate to Offerings. Create offering `default` with two packages:
    - Package "Monthly" attached to `omenora_monthly` 
    - Package "Annual" attached to `omenora_annual` 
23. Create offering `counsel_boosts` with three packages, each with a custom identifier (not duration-based):
    - Package identifier `spark` attached to `omenora_counsel_spark` 
    - Package identifier `insight` attached to `omenora_counsel_insight` 
    - Package identifier `ascend` attached to `omenora_counsel_ascend` 
24. Create offering `addons` with two packages:
    - Package "Calendar 2026" attached to `omenora_calendar_2026` 
    - Package "Single Compatibility" attached to `omenora_compatibility_single` 
25. Mark the `default` offering as the project default.
26. Navigate to Project Settings → API keys. Copy the public iOS SDK key. Store securely (will be added to mobile env vars in Phase 1).
27. Navigate to Webhooks. Verify the existing webhook endpoint URL points to `https://omenora.com/api/revenuecat/webhook`. Verify `NUXT_REVENUECAT_WEBHOOK_SECRET` is set on the server.

**Track C — Supabase schema (no external dependency, can proceed immediately)**

28. Open the Supabase SQL editor for project scvjjbgejmkomyciabex.
29. Run migration to create `user_credits` table:
    - Columns: `user_id` UUID PRIMARY KEY (FK to auth.users with ON DELETE CASCADE), `counsel_credits` INTEGER NOT NULL DEFAULT 0, `compat_credits` INTEGER NOT NULL DEFAULT 0, `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()
    - Constraints: CHECK `counsel_credits >= 0`, CHECK `compat_credits >= 0` 
    - RLS policy: users can SELECT their own row only; INSERT and UPDATE limited to service role
30. Run migration to create `credit_transactions` ledger table:
    - Columns: `id` UUID PRIMARY KEY DEFAULT gen_random_uuid(), `user_id` UUID NOT NULL (FK to auth.users with ON DELETE CASCADE), `revenuecat_event_id` TEXT UNIQUE (nullable), `transaction_type` TEXT NOT NULL CHECK IN ('purchase', 'refund', 'consumption'), `credit_type` TEXT NOT NULL CHECK IN ('counsel', 'compat'), `delta` INTEGER NOT NULL, `product_id` TEXT, `metadata` JSONB, `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
    - Indexes: `(user_id, created_at DESC)` for history queries, partial index on `revenuecat_event_id WHERE NOT NULL` for idempotency lookups
    - RLS policy: users can SELECT their own rows; INSERT limited to service role
31. Verify both tables created with `\d user_credits` and `\d credit_transactions`.
32. Backfill: create empty `user_credits` row for every existing user. SQL: `INSERT INTO user_credits (user_id) SELECT id FROM auth.users ON CONFLICT (user_id) DO NOTHING;` 

**Track D — Mobile environment variables (depends on Track B step 26)**

33. Add to mobile app environment configuration:
    - `EXPO_PUBLIC_REVENUECAT_IOS_KEY` (value from Track B step 26)
    - `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (placeholder for future; can be empty string for v1 iOS-only launch)
34. Verify these are loaded in the existing `PurchasesProvider` at app initialization. No code change in Phase 0 — just confirm the env var loading mechanism exists and accepts these new keys.

### Files affected

No application files modified in this phase. All work is dashboard configuration and Supabase migrations. Two new migration files will be created in `supabase/migrations/`:

- `supabase/migrations/<timestamp>_create_user_credits.sql` 
- `supabase/migrations/<timestamp>_create_credit_transactions.sql` 

### Acceptance criteria

- Apple Developer status: Organization (not Individual), under United Northwest Carriers Inc.
- App Store Connect Agreements / Tax / Banking: all three showing "Clear" or "Active" status
- App Store Connect: 1 subscription group containing 2 subscription products + 5 in-app purchase products (1 non-consumable + 4 consumables), all in "Ready to Submit" or "Approved" state
- RevenueCat dashboard: 2 entitlements (`premium`, `calendar_2026`), 7 products imported, 3 offerings configured (`default`, `counsel_boosts`, `addons`), webhook endpoint verified
- Supabase: `user_credits` and `credit_transactions` tables exist with constraints, indexes, and RLS policies; `user_credits` backfilled for all existing users
- Mobile env vars: iOS RevenueCat public key available to the bundle

### Rollback plan

- If D-U-N-S issuance is delayed beyond 30 business days, escalate to D&B support. Apple does not currently accept alternative verification methods for Organization conversion.
- If Apple rejects W-9 or banking info, contact Apple Developer Support with case escalation. No code rollback needed — Phase 0 is dashboard-only.
- Supabase migrations are reversible: `DROP TABLE credit_transactions; DROP TABLE user_credits;` removes them cleanly. No data dependency yet exists (Phase 1 is the first consumer).

### Risks / open questions

1. **D-U-N-S timeline.** D&B processing typically takes 5–30 business days. If 30 days elapse without issuance, Apple Developer Support cannot accept alternative verification — D&B is the only path. This is the single largest schedule risk for Phase 0.
2. **W-9 entity mismatch resolution.** The previously cancelled W-9 was under the old sole-proprietor entity. The new W-9 under UNCC Inc. EIN 47-3249610 needs to be filed via App Store Connect after the org conversion. Verify no manual Apple intervention is required.
3. **Banking partner verification.** Apple uses a banking partner to verify bank accounts; the wait can be 1–7 business days after submission. The account must accept USD wires from Apple's Singapore-based payment entity — confirm with the bank ahead of submission.
4. **RevenueCat iOS public key rotation policy.** Public SDK keys do not generally need rotation, but confirm the key found in step 26 is from the production environment, not a sandbox/test environment.
5. **Android key deferred.** v1 launch is iOS-only per implementation plan. Android setup deferred to a future phase but the env var placeholder is added now to avoid mobile build issues.
6. **Supabase RLS for `credit_transactions` SELECT scope.** Confirm users should see only their own ledger entries (not cross-user). Default assumption: yes, scoped to own user_id. If admin/support tooling needs cross-user visibility, that's a service-role function, not a user-facing RLS rule.

---

## Phase 1 — Backend Cap Correction & Credit Infrastructure

**Status:** SHIPPED — verified via direct RPC tests in Supabase

### Goal
Backend-only changes that (a) fix the Counsel cap from daily to monthly, (b) add credit infrastructure for consumable IAPs, (c) extend the RevenueCat webhook to grant credits on purchase and claw them back on refund, (d) extend the Counsel and Compatibility endpoints to fall through from premium-allowance to credits.

### Scope (in)
- Cap config correction: `FEATURE_CAPS.counsel` in `server/utils/entitlements.ts` (line 30) from `{ cap: 30, period: 'daily' }` to `{ cap: 30, period: 'monthly' }`. Cap value unchanged.
- Three new Postgres RPC functions: `consume_credit`, `grant_credits`, `clawback_credits` — all SECURITY DEFINER, GRANT EXECUTE to service_role only, modeled on existing `increment_feature_usage` pattern
- New helper module `server/utils/credits.ts` (Nitro auto-imported) exposing `getCreditBalance`, `consumeCredit`, `grantCredits`, `clawbackCredits` 
- New helper `requirePremiumOrCreditAccess` added to `server/utils/entitlements.ts` as a NEW EXPORT. The existing `requirePremiumWithUsage` is NOT modified — endpoints that don't need credit fallback (archetype, natal_chart, forecast) keep their current behavior intact.
- Modified `server/api/counsel/message.post.ts` to use the new helper and conditionally consume credit or increment usage based on access source
- Modified `server/api/generate-compatibility.post.ts` to use the new helper, preserving premium-only preview-mode semantics
- Modified `server/api/revenuecat/webhook.post.ts` to handle `NON_RENEWING_PURCHASE` events for consumable products (grant credits) and refund-class events for the same products (clawback credits)
- New `CONSUMABLE_PRODUCTS` constant in the webhook handler mapping product_id strings to credit grant amounts

### Scope (out)
- Any mobile UI changes — Phase 2
- Paywall configuration — Phase 3
- Cleanup of orphaned daily Counsel rows in `feature_usage` — optional, documented as known cosmetic, not blocking
- Other endpoints currently using `requirePremiumWithUsage` (archetype, natal_chart, forecast) — unchanged
- The existing `requirePremiumWithUsage` function — unchanged, not refactored
- Webhook signature mechanism — current timing-safe shared secret comparison preserved
- The `(config as any).revenuecatWebhookSecret` cast in webhook.post.ts line 97 — left as-is, not in scope to fix

### Pre-conditions
- Phase 0 Track C complete: `user_credits` and `credit_transactions` tables exist in Supabase project scvjjbgejmkomyciabex with constraints, indexes, RLS policies per Phase 0 spec
- Phase 0 Track C backfill complete: a `user_credits` row exists for every user in `auth.users` 
- TypeScript clean state on augur server side before changes begin

### Dependencies (external)
- Supabase project scvjjbgejmkomyciabex (live)
- RevenueCat project 3f9c1cd9 webhook delivery to `https://omenora.com/api/revenuecat/webhook` (already wired and validated per audit)
- `NUXT_REVENUECAT_WEBHOOK_SECRET` env var (already set per audit)

### Inline reference: data this phase relies on

**Counsel cap target after this phase:** 30 conversations per calendar month. Period string format: `'YYYY-MM'` (7 characters), matching how archetype/natal_chart/forecast/compatibility are already keyed in `feature_usage`. Period reset on UTC calendar month boundary (consistent with existing `periodKey` function in entitlements.ts).

**Consumable product → credit grant mapping:**

| Product ID | Credit type | Delta |
|---|---|---|
| `omenora_compatibility_single` | `compat` | +1 |
| `omenora_counsel_spark` | `counsel` | +5 |
| `omenora_counsel_insight` | `counsel` | +15 |
| `omenora_counsel_ascend` | `counsel` | +35 |

**Refund clawback policy:** clawback the original delta from current balance, floored at 0 (`GREATEST(0, current - delta)`). Never negative. Append clawback ledger entry with negative delta and `transaction_type='refund'`. Already-consumed credits are not retroactively invalidated — the user keeps consumed value, only unconsumed balance is reduced.

**RPC function signatures (planning reference, not implementation):**

| Function | Inputs | Returns | Behavior |
|---|---|---|---|
| `consume_credit` | `p_user_id uuid`, `p_credit_type text` ('counsel' or 'compat') | `integer` (new balance) | Atomically decrement target column by 1, append ledger row with `transaction_type='consumption'` and `delta=-1`. Raise exception if balance would go negative or row doesn't exist. |
| `grant_credits` | `p_user_id uuid`, `p_credit_type text`, `p_delta integer`, `p_rc_event_id text`, `p_product_id text` | `integer` (new balance) | Insert ledger row first with `transaction_type='purchase'`. On UNIQUE violation on `revenuecat_event_id` → idempotent no-op, return current balance. Otherwise atomically increment target column by p_delta, INSERT…ON CONFLICT to create user_credits row if missing. |
| `clawback_credits` | `p_user_id uuid`, `p_credit_type text`, `p_delta integer`, `p_rc_event_id text`, `p_product_id text` | `integer` (new balance) | Insert ledger row first with `transaction_type='refund'` and `delta=-p_delta`. On UNIQUE violation → idempotent no-op. Otherwise atomically decrement target column by p_delta, floored at 0. |

All three RPCs: `LANGUAGE plpgsql`, `SECURITY DEFINER`, `SET search_path = public`, `REVOKE ALL FROM PUBLIC`, `GRANT EXECUTE TO service_role`.

### Implementation steps

**Step 1 — Cap config correction**

File: `server/utils/entitlements.ts`, line 30. Change the `counsel` entry's `period` field from `'daily'` to `'monthly'`. Cap value (30) unchanged. No other code in this file is touched in this step.

Side effect: new `feature_usage` rows for counsel will be keyed by 7-character `'YYYY-MM'` strings. The existing 10-character `'YYYY-MM-DD'` rows become orphaned but do not affect queries (the new monthly query won't match them). Cleanup is optional and out of scope for Phase 1.

**Step 2 — Create three RPC functions**

Create a single new migration file `supabase/migrations/<timestamp>_credit_rpc_functions.sql` containing the three functions described in the reference table above. Each function follows the established pattern of `increment_feature_usage` (already in the codebase) — same SECURITY DEFINER posture, same `service_role` grant. The ledger-insert-first ordering inside `grant_credits` and `clawback_credits` is what provides idempotency: the UNIQUE constraint on `credit_transactions.revenuecat_event_id` (from Phase 0) causes the second invocation with the same event_id to raise unique_violation, which the function traps and returns current balance.

Important: for `consume_credit`, do not insert into the ledger with a `revenuecat_event_id` — consumptions have NULL for that field. Idempotency for consumption is not enforced by the DB; the application-level check before calling consume_credit is sufficient given the accepted race window (mirrors existing `feature_usage` semantics).

**Step 3 — Create `server/utils/credits.ts` helper module**

New file. Exports four async functions:

- `getCreditBalance(userId, creditType)` — reads the relevant column from `user_credits` via service role. Returns 0 if no row.
- `consumeCredit(userId, creditType)` — calls `consume_credit` RPC. Returns new balance. Lets the RPC's exception bubble (caller decides how to surface).
- `grantCredits(userId, creditType, delta, rcEventId, productId)` — calls `grant_credits` RPC. Returns new balance.
- `clawbackCredits(userId, creditType, delta, rcEventId, productId)` — calls `clawback_credits` RPC. Returns new balance.

The helper module contains no business logic beyond RPC invocation and response unpacking. All atomicity and idempotency live in the SQL functions. Use the same Supabase service-role client pattern that `incrementUsage` already uses in entitlements.ts.

**Step 4 — Add `requirePremiumOrCreditAccess` to entitlements.ts**

In `server/utils/entitlements.ts`, append a new exported function alongside the existing exports. Do not modify `requirePremiumWithUsage` or `incrementUsage`. Do not change `FEATURE_CAPS` shape or `EntitlementContext` interface.

The new function's contract:

- Inputs: `event: H3Event`, `feature: 'counsel' | 'compatibility'`, `creditType: 'counsel' | 'compat'` 
- Returns: `AccessContext` discriminated union:
  - `{ source: 'premium', userId, feature, period, count, cap, resetsAt }` — same shape as today's EntitlementContext plus `source` tag
  - `{ source: 'credit', userId, feature, creditBalance }` — minimal shape, no period/cap concept

Internal logic:

1. Try `requirePremiumWithUsage(event, feature)`. 
2. If it succeeds, return the result with `source: 'premium'` prepended.
3. If it throws with `statusCode === 403` and `statusMessage === 'subscription_required'`: call `getCreditBalance(userId, creditType)`. If balance > 0, return `{ source: 'credit', userId, feature, creditBalance }`. If balance is 0, throw a new 403 with body `{ error: 'access_required', subscription_required: true, credits_required: true, credit_balance: 0, suggested_products: SUGGESTED_PRODUCTS_FREE[feature] }`.
4. If it throws with `statusCode === 429` (either daily_limit_reached or monthly_limit_reached): call `getCreditBalance(userId, creditType)`. If balance > 0, return `{ source: 'credit', userId, feature, creditBalance }`. If balance is 0, throw a new 429 with body preserving the original `cap`, `used`, `resets_at`, plus added `credit_balance: 0` and `suggested_products: SUGGESTED_PRODUCTS_PREMIUM_CAP[feature]`.
5. Any other thrown error: rethrow unchanged.

Note on userId resolution in branches 3 and 4: the userId is captured BEFORE the inner call by also calling `requireAuth(event)` directly at the top of the new function. This avoids re-parsing the JWT twice and avoids the awkward situation where `requirePremiumWithUsage` throws before exposing userId.

Suggested-products constants (declared at top of entitlements.ts alongside `FEATURE_CAPS`):

- `SUGGESTED_PRODUCTS_FREE.counsel`: `['omenora_monthly', 'omenora_annual', 'omenora_counsel_spark', 'omenora_counsel_insight', 'omenora_counsel_ascend']` 
- `SUGGESTED_PRODUCTS_FREE.compatibility`: `['omenora_monthly', 'omenora_annual', 'omenora_compatibility_single']` 
- `SUGGESTED_PRODUCTS_PREMIUM_CAP.counsel`: `['omenora_counsel_spark', 'omenora_counsel_insight', 'omenora_counsel_ascend']` 
- `SUGGESTED_PRODUCTS_PREMIUM_CAP.compatibility`: `['omenora_compatibility_single']` 

**Step 5 — Update Counsel endpoint**

File: `server/api/counsel/message.post.ts`.

Line 41 — replace `const ctx = await requirePremiumWithUsage(event, 'counsel')` with `const ctx = await requirePremiumOrCreditAccess(event, 'counsel', 'counsel')`.

Line 117 — currently `await incrementUsage(ctx.userId, ctx.feature, ctx.period)`. Replace with a branch on `ctx.source`:
- If `ctx.source === 'premium'`: call `incrementUsage(ctx.userId, ctx.feature, ctx.period)` (unchanged behavior)
- If `ctx.source === 'credit'`: call `consumeCredit(ctx.userId, 'counsel')` 

Lines 119–123 — success response. The `usage` block currently returns `{ count, cap, period, resets_at }`. Extend to include source information:
- If `ctx.source === 'premium'`: `{ source: 'premium', count: ctx.count + 1, cap: ctx.cap, period: ctx.period, resets_at: ctx.resetsAt }` 
- If `ctx.source === 'credit'`: `{ source: 'credit', credit_balance_remaining: <new balance returned by consumeCredit> }` 

This lets the mobile client tell whether the call burned a premium slot or a credit, useful for upcoming Phase 2 UI states.

**Step 6 — Update Compatibility endpoint**

File: `server/api/generate-compatibility.post.ts`.

Line 57 — replace `const ctx = await requirePremiumWithUsage(event, 'compatibility')` with `const ctx = await requirePremiumOrCreditAccess(event, 'compatibility', 'compat')`.

Preview-mode branch (lines 228–322): preview mode is a premium-only cost-saving path. If a user with `ctx.source === 'credit'` requests `previewMode: true`, that's a contradiction — they paid for the full single-compatibility reading. At the start of the preview-mode branch, add a guard: if `ctx.source === 'credit'` AND `body.previewMode === true`, override `previewMode` to `false` and proceed into full mode. Log this override at info level.

Line 501 — currently calls `incrementUsage(...)` in the full-mode success path. Replace with the same branch as Step 5:
- If `ctx.source === 'premium'`: `incrementUsage(...)` 
- If `ctx.source === 'credit'`: `consumeCredit(ctx.userId, 'compat')` 

Preview mode for premium users continues to NOT increment usage, consistent with current behavior.

**Step 7 — Extend RevenueCat webhook handler**

File: `server/api/revenuecat/webhook.post.ts`.

Add a new constant near the top of the file (alongside the `RevenueCatEvent` interface, before `defineEventHandler`):

CONSUMABLE_PRODUCTS: Record<string, { creditType: 'counsel' | 'compat', delta: number }>
Populated with the four product-to-credit mappings from the reference table above.

In the handler body, add a new branch between the existing "anonymous user skip" (currently line 137–138) and the existing "no entitlements skip" (currently line 141–143). The new branch:

1. Check if `evt.product_id` is present and is a key in `CONSUMABLE_PRODUCTS`. If not, fall through to the existing flow unchanged.
2. If yes, look up `{ creditType, delta }` from the constant.
3. Branch on `evt.type`:
   - `'NON_RENEWING_PURCHASE'`: call `grantCredits(evt.app_user_id, creditType, delta, evt.id!, evt.product_id)`. Return `{ received: true, granted: { product_id: evt.product_id, credit_type: creditType, delta, new_balance: <returned balance> } }`.
   - `'CANCELLATION'`, `'REFUND'`, `'EXPIRATION'`: call `clawbackCredits(evt.app_user_id, creditType, delta, evt.id!, evt.product_id)`. Return `{ received: true, clawed_back: { product_id: evt.product_id, credit_type: creditType, delta, new_balance: <returned balance> } }`.
   - Any other event type: log a warning ("unexpected event type X for consumable product Y") at warn level. Return `{ received: true, ignored: 'unexpected_consumable_event' }`. Do not throw.
4. Return immediately — do NOT fall through to the existing entitlement-loop code path for consumable events.

For non-consumable products (existing subscriptions, the `omenora_calendar_2026` non-consumable IAP): existing flow unchanged. The new branch's `product_id` check guards everything inside.

The webhook's signature verification (lines 38–48), TEST/SUBSCRIBER_ALIAS skip (lines 130–132), and anonymous-user skip (lines 136–138) all run BEFORE the new consumable branch and are not modified.

**Step 8 — Verify TypeScript clean state**

After all changes, run `tsc --noEmit` from the augur project root. Exit code 0 is required. Address any new type errors at line of introduction — particularly around the new discriminated union `AccessContext` type, which the endpoints will need to narrow with `if (ctx.source === 'premium')` checks.

The existing `(config as any).revenuecatWebhookSecret` cast at line 97 is left untouched.

### Files affected

Modified:
- `server/utils/entitlements.ts` — line 30 (cap fix); appended new export `requirePremiumOrCreditAccess`; appended new constants `SUGGESTED_PRODUCTS_FREE`, `SUGGESTED_PRODUCTS_PREMIUM_CAP` 
- `server/api/counsel/message.post.ts` — line 41 (guard), line 117 (usage tracking), lines 119–123 (response)
- `server/api/generate-compatibility.post.ts` — line 57 (guard), preview-mode branch entry (~line 228), line 501 (usage tracking)
- `server/api/revenuecat/webhook.post.ts` — new `CONSUMABLE_PRODUCTS` constant at top; new consumable branch between line 138 and line 141

Created:
- `server/utils/credits.ts` — new helper module
- `supabase/migrations/<timestamp>_credit_rpc_functions.sql` — three new SECURITY DEFINER functions

### Acceptance criteria

- `tsc --noEmit` exit code 0 from augur project root
- `FEATURE_CAPS.counsel` shows `{ cap: 30, period: 'monthly' }` 
- Three new RPCs exist in the live database with EXECUTE granted only to service_role
- `requirePremiumWithUsage` and `incrementUsage` exports unchanged from their pre-Phase-1 signatures and behavior
- `requirePremiumOrCreditAccess` exported as new symbol from entitlements.ts
- `credits.ts` exports all four helper functions
- Manual: premium user makes 30 successful Counsel calls in same UTC calendar month; 31st returns 429 with body containing `cap: 30`, `used: 30`, `credit_balance: 0`, `suggested_products` array
- Manual: same premium user, after `grant_credits` RPC adds 5 counsel credits → next 5 Counsel calls succeed with response containing `source: 'credit'`; 36th call returns 429
- Manual: free user → first Counsel call returns 403 with `subscription_required: true`, `credit_balance: 0`, `suggested_products` array including subscription AND credit pack products
- Manual: free user, after `grant_credits` adds 5 counsel credits → 5 calls succeed, 6th returns 403
- Manual: send the same `NON_RENEWING_PURCHASE` webhook payload twice (same `evt.id`) → balance increases by `delta` exactly once. Ledger contains exactly one row with that `revenuecat_event_id`.
- Manual: after a Spark pack purchase, send a `CANCELLATION` webhook for the same product (sandbox refund) → balance decreases by 5 (or to 0, whichever is higher). Ledger contains a refund row with negative delta.
- Manual: compatibility preview-mode call by a credit-source user returns full sections (not `[locked]` placeholders) and consumes one compat credit
- `credit_transactions` table contains audit-trail entries for every purchase, consumption, and refund with correct delta signs and `transaction_type` values

### Rollback plan

The changes are layered and individually revertible:

- Cap config: change `'monthly'` back to `'daily'` at line 30 of entitlements.ts. No data migration needed. New rows from rollback onward use daily keys again.
- Endpoint changes: revert the three modified endpoint files to their pre-Phase-1 state via git. The endpoints will go back to 403'ing free users immediately and 429'ing capped premium users without credit fallback.
- Webhook handler: revert the file. Consumable events will once again silently skip at "no entitlements" — no credits granted, no clawback. Customers who purchased credits during the rollback window would need manual remediation.
- New helper file `credits.ts`: deleting it will cause typescript errors at every import site. Either revert all endpoint imports OR leave the file in place (no harm — it's just unreferenced).
- RPC functions: `DROP FUNCTION consume_credit; DROP FUNCTION grant_credits; DROP FUNCTION clawback_credits;` removes them cleanly. `user_credits` and `credit_transactions` tables stay (no dependency on Phase 1 code).

### Risks / open questions

1. **Counsel error code rename.** Before Phase 1, Counsel cap-hit returns `statusMessage: 'daily_limit_reached'`. After Phase 1, it returns `'monthly_limit_reached'`. The mobile app currently has no UI for either (no paywall built yet per implementation plan), so impact is null today. Phase 2 paywall UI must consume the new code. Flag for Phase 2 spec.

2. **Race condition on credit consumption.** The check-then-consume pattern mirrors the existing read-then-increment-RPC pattern in `feature_usage`. Burst-spamming under normal conditions cannot meaningfully exploit this — worst case is one extra free call per race, costing pennies. The CHECK constraint on `user_credits.counsel_credits >= 0` and `compat_credits >= 0` provides a hard backstop: if a concurrent consume_credit would push balance negative, the RPC raises and the endpoint returns 500. Acceptable for v1.

3. **Refund event name uncertainty.** RevenueCat documentation and community sources are inconsistent on whether refunds for non-subscription purchases come as `CANCELLATION`, `REFUND`, or `EXPIRATION`. The webhook branch in Step 7 accepts all three. If a sandbox refund test reveals a fourth event name, add it to the branch. If RC ever sends a refund as an event type not in the accepted list, the `else` arm logs a warning and the customer keeps refunded credits until manual intervention.

4. **Anonymous RC user race during purchase.** If a user somehow purchases a boost pack while RC still has `$RCAnonymousID:...` as the app_user_id (logIn hasn't completed yet), the webhook arrives anonymous, gets skipped at line 137, and credits are not granted. Mitigation: the mobile app must call `Purchases.logIn(supabaseUserId)` before any purchase flow. This is a mobile-side contract — flag it for the Phase 2 spec to verify in the purchase UI flow. Worst case is a manual refund-and-recredit.

5. **LLM failure forfeits credit/usage.** Mirroring existing pattern: if LLM call succeeds and then a downstream step fails (rare), the user got the value but credit/usage may not be recorded. If LLM call fails, no credit/usage consumed. This is the pre-existing tradeoff for `feature_usage` and is preserved here for consistency. v1 acceptable.

6. **previewMode override for credit users.** A credit-source compatibility user passing `previewMode: true` gets the full reading regardless. They paid for the full reading via the $4.99 single-compatibility IAP. Correct behavior, but flag if the client should know about the override — the response already includes `previewMode: false` in the body, so detection is straightforward client-side.

7. **`evt.id` non-null assertion.** Step 7 uses `evt.id!` (TS non-null assertion) in calls to grantCredits/clawbackCredits because the RPC requires a string for the UNIQUE-constrained event_id column. The `RevenueCatEvent` interface marks `id` as optional (`id?: string`). In practice every real RC webhook event has an `id`. If a malformed event arrives without one, the RPC insert would fail at the NOT NULL column constraint. Acceptable — fail loudly rather than silently corrupt the ledger.

8. **No cleanup of orphaned daily `feature_usage` rows.** Existing rows with 10-character `period` values for counsel (e.g. `'2026-05-14'`) become dead data after the cap flip. They don't affect any query (new queries use 7-character monthly keys). Cleanup query is one line if desired: `DELETE FROM feature_usage WHERE feature = 'counsel' AND length(period) = 10;`. Optional, not in scope.

---

## Phase 2 — Mobile Monetization UI

**Status:** SHIPPED — all steps complete. Phase 2 monetization plumbing functionally complete on the component layer; remaining gates are external dashboard config (Phase 0 Tracks A/B/D).

### Goal
Wire the mobile app to the Phase 1 backend so every paid surface enforces gating, every cap-hit surfaces a relevant upgrade path (subscription OR boost pack), every locked feature presents the RevenueCat-hosted paywall, and the API client preserves structured error responses needed for those flows.

### Scope (in)
- `src/api/client.ts` 429 interceptor preserves response body (the current behavior strips it, breaking Phase 1's structured error payload contract)
- Optional `src/api/client.ts` enhancement to also preserve body on 403 (currently passes raw AxiosError; standardize the surface)
- New TypeScript types in `src/api/endpoints.ts` for the structured error response shapes from Phase 1 (`subscription_required`, `cap_exhausted`, `access_required`) including `suggested_products` arrays
- New error-extraction utility in `src/api/errors.ts` (new file) — single helper that takes an unknown caught error and returns a discriminated union over the known backend error codes
- Re-enable both LockedCard placements on TodayScreen (currently commented out at lines 259–276 with `// TODO: 17f-paywall`): "Your Full Daily Reading" (placement: `feature_archetype_today`) and "Today's Life Dimensions" (placement: `feature_dimensions_today`). Both `onUnlockPress={() => presentPaywall()}`.
- ReadingsScreen API error handlers — on 403 `subscription_required` automatically trigger `presentPaywall()` (currently shows text error only); on 429 `monthly_limit_reached` show text error with reset time (current behavior — fine; the screen never offers credits because compatibility readings are the only purchasable extra and they're on a different screen)
- CompatibilityScreen — on 403 `subscription_required` or 429 `monthly_limit_reached` for premium users, show inline upgrade prompt with TWO actions: "Upgrade to Premium" (presents paywall) AND "Buy single reading $4.99" (initiates `omenora_compatibility_single` purchase). For free users hitting 403 with `credits_required: true`, show same dual prompt.
- CounselChatScreen cap-hit handling — when usage.count >= usage.cap OR when receiving 429 from a send, show wait-message (current behavior) PLUS a "Get more conversations" inline CTA that opens a bottom-sheet listing the three boost packs with prices and conversation counts (NOT presenting RC paywall — boost packs aren't on the subscription paywall)
- CounselScreen tab (entry screen) — unchanged for premium users (Open Counsel button); for free users, current behavior keeps `presentPaywall()` on "Start chatting" — preserve unchanged
- New `BoostPackSheet` component (new file) — bottom sheet listing the three Counsel boost packs from RevenueCat offering `counsel_boosts` (configured in Phase 0 Track B). Each row shows price, conversation count, per-conversation cost. Tap triggers `Purchases.purchasePackage(pkg)`. Success refreshes customer info and dismisses sheet. Failure shows error toast.
- New `CompatibilityIAPSheet` component (new file) — bottom sheet listing `omenora_compatibility_single` (single product) and an upsell to `omenora_monthly`/`omenora_annual` (presents full paywall). Pattern parallels BoostPackSheet.
- Extend `PurchasesContextValue` to expose `purchaseBoostPack(packageIdentifier)` and `purchaseCompatibilitySingle()` methods. These wrap `Purchases.purchasePackage()` against the respective RevenueCat offerings.
- Mobile-side credit balance display. Counsel chat usage counter currently reads `{usage.count} / {usage.cap} today` — update string to `{usage.count} / {usage.cap} this month` for premium users with source='premium'. For credit-source responses, display `{credit_balance_remaining} conversations remaining`. Source comes from the new `source` field in the Phase 1 response.
- Update text on CounselChatScreen daily-cap-reached system message from "today" / "tomorrow" wording to "this month" / `resets_at`-driven date string

### Scope (out)
- Building a custom paywall UI — we use `RevenueCatUI.presentPaywall()` (already wired) and let RevenueCat dashboard control the visuals
- Touching the `PaywallShell` template — it's unused and stays unused. Not deleted in this phase (cleanup is post-launch concern)
- Touching `PremiumTeaserScreen` — it's the onboarding teaser, separate concern, no changes
- Building a "Subscription Management" UI for active subscribers — Phase 4
- Building purchase flow for `omenora_calendar_2026` from CalendarScreen — its existing LockedCard with `presentPaywall()` continues to route through the subscription paywall (calendar is included in premium); a direct one-time-purchase path for the calendar IAP for non-subscribers is deferred to Phase 3
- Analytics events — cross-cutting concern, added in Phase 3 when IAP flows are codified
- Refactoring the dual gating-card pattern (LockedCard vs ReadingFeatureCard) — both stay as-is, both serve their current consumers

### Pre-conditions
- Phase 1 shipped: `/api/counsel/message` and `/api/generate-compatibility` returning new structured error responses with `source`, `suggested_products`, `credit_balance`, `subscription_required`, `credits_required` fields
- Phase 0 Track B configured: RevenueCat offerings `default` (subscriptions), `counsel_boosts` (3 packs), `addons` (calendar + compatibility single) exist in dashboard and contain valid packages
- Phase 0 Track A produced products visible in App Store Connect — required for offerings in Phase 0 Track B to resolve to real prices; however Phase 2 mobile code can be written and unit-tested against RevenueCat Test Store before Apple side fully clears (test offerings work without ASC products)
- Mobile app builds against current Expo SDK 53 with `react-native-purchases@^10.1.0` and `react-native-purchases-ui@^10.1.0` (per audit)

### Dependencies (external)
- RevenueCat dashboard offerings populated
- Phase 1 backend deployed to production at omenora.com
- `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS` env var (already wired per audit at PurchasesProvider line 43)

### Inline reference: data this phase relies on

**Phase 1 error response shapes (consumed by mobile):**

Free user, no credits, hitting Counsel or Compatibility:
HTTP 403
{
error: 'access_required',
subscription_required: true,
credits_required: true,
credit_balance: 0,
suggested_products: ['omenora_monthly', 'omenora_annual', 'omenora_counsel_spark', ...]
}

Premium user, cap exhausted, no credits:
HTTP 429
{
error: 'monthly_limit_reached',
cap: 30, used: 30, resets_at: '2026-06-01T00:00:00Z',
credit_balance: 0,
suggested_products: ['omenora_counsel_spark', 'omenora_counsel_insight', 'omenora_counsel_ascend']
}

Successful Counsel response, source='premium':
HTTP 200
{
success: true,
response: "...",
usage: { source: 'premium', count: 12, cap: 30, period: '2026-05', resets_at: '2026-06-01T00:00:00Z' }
}

Successful Counsel response, source='credit':
HTTP 200
{
success: true,
response: "...",
usage: { source: 'credit', credit_balance_remaining: 14 }
}

**RevenueCat offering → mobile sheet mapping:**

| Offering identifier | Consumed by | Display |
|---|---|---|
| `default` | `presentPaywall()` native modal | RevenueCat-rendered paywall, both subscription packages |
| `counsel_boosts` | `BoostPackSheet` custom component | Three rows: Spark / Insight / Ascend |
| `addons` | `CompatibilityIAPSheet` (compatibility single only); calendar package unused this phase | One row: single compatibility reading |

**RevenueCat package identifiers (per Phase 0 Track B spec):**
- `default` offering: package identifiers `$rc_monthly` (default) and `$rc_annual` for the two subscriptions — RC uses built-in identifiers for duration-based packages
- `counsel_boosts` offering: custom identifiers `spark`, `insight`, `ascend`
- `addons` offering: custom identifier for the compatibility single (suggested: `compat_single`); calendar package identifier `calendar` exists but not consumed in Phase 2

### Implementation steps

**Step 1 — Fix the API client 429 interceptor**

File: `src/api/client.ts`, lines 41-ish where 429 is replaced with `new Error('Too many requests…')`. Change the handler to throw or reject with the original AxiosError preserved. The 401 interceptor on the next branch may remain as-is (we don't need 401 body data — auth is handled upstream).

Add a new helper export from this file: `getErrorBody(err: unknown): { status: number; data: any } | null` — extracts `err.response.status` and `err.response.data` from an AxiosError, returns null for non-axios errors. This is a small utility used by Step 2.

**Step 2 — Create `src/api/errors.ts`**

New file. Single export: `parseBackendError(err: unknown): BackendError` where `BackendError` is a discriminated union:

- `{ kind: 'subscription_required', suggested_products: string[], credit_balance: number }`
- `{ kind: 'cap_reached', period: 'monthly' | 'daily', cap: number, used: number, resets_at: string, credit_balance: number, suggested_products: string[] }`
- `{ kind: 'auth_required' }`
- `{ kind: 'network' }`
- `{ kind: 'unknown', message: string }`

The function inspects the AxiosError response body's `error` field plus status code and returns the appropriate variant. Defensively handles missing/malformed fields by falling back to `{ kind: 'unknown', message }`.

All Phase 2 screen-level catch blocks consume this helper instead of doing ad-hoc `err.response.data.error` extraction. Centralizes the error contract so future backend error code additions are one-file changes.

**Step 3 — Update endpoint response types**

File: `src/api/endpoints.ts`.

For `CounselMessageResponse`, change the `usage` field to a discriminated union:
- `{ source: 'premium', count: number, cap: number, period: string, resets_at: string }`
- `{ source: 'credit', credit_balance_remaining: number }`

For `ReportStubResponse`, `GetArchetypeReadingResponse`, `GetNatalChartReadingResponse`, `GetForecastReadingResponse`: the `usage` field stays the same shape (these endpoints don't have credit fallback in Phase 1 scope), but rename to clarify it's the premium-only shape if helpful. Backward compatibility note: existing screens that destructure `.usage.count` and `.usage.cap` continue to work for the premium-source path. Only CounselChatScreen needs to handle both branches.

For `GenerateCompatibilityResponse`: existing shape preserved. The new credit-source path returns the same `usage` field shape for premium and a separate `credit_balance_remaining` for credit-source. Add the union here as well.

**Step 4 — Extend `PurchasesContextValue`**

File: `src/context/PurchasesContext.ts` and the provider at `src/context/PurchasesProvider.tsx`.

Add three new methods to the context value:

- `boostPacksOffering: PurchasesOffering | null` — fetched alongside `currentOffering` during init; refreshed when offerings refresh
- `compatibilityAddonOffering: PurchasesOffering | null` — same pattern
- `purchaseBoostPack(packageIdentifier: 'spark' | 'insight' | 'ascend'): Promise<MakePurchaseResult>` — finds the package in `boostPacksOffering.availablePackages` and calls `Purchases.purchasePackage(pkg)`. Rejects if offering or package is missing.
- `purchaseCompatibilitySingle(): Promise<MakePurchaseResult>` — finds the compat_single package in `compatibilityAddonOffering` and calls `Purchases.purchasePackage(pkg)`.

The provider's existing `getOfferings()` call already returns ALL offerings; just store the additional offering references from `offerings.all[id]` rather than re-fetching.

**Step 5 — Create `BoostPackSheet` component**

New file: `src/components/molecules/BoostPackSheet.tsx`.

Bottom sheet (React Native modal with slide-up animation or use existing modal pattern in the app — confirm during implementation which pattern is conventional). Props:
BoostPackSheetProps {
visible: boolean
onDismiss: () => void
onPurchaseSuccess: () => void  // parent can refresh balance display
}

Pulls `boostPacksOffering` from PurchasesContext. Renders three rows (or a friendly empty state if offering is null):

- Spark — `$X.XX` / +5 conversations
- Insight — `$X.XX` / +15 conversations
- Ascend — `$X.XX` / +35 conversations

Prices come from `package.product.priceString` (RevenueCat-localized). Per-conversation cost label is computed: `priceString / conversationCount`. Visual style: `Card variant="premium"` per row, copper accent on the recommended pack (Insight), `Button variant="premium"` tap target on each row.

On row tap: call `purchaseBoostPack(identifier)`. Show pending state. On success: call `refreshCustomerInfo()`, call `onPurchaseSuccess()`, call `onDismiss()`. On error: show inline toast with the error message; do not dismiss.

**Step 6 — Create `CompatibilityIAPSheet` component**

New file: `src/components/molecules/CompatibilityIAPSheet.tsx`.

Same bottom-sheet pattern as Step 5. Props identical shape. Two rows:

- "Single compatibility reading" — `omenora_compatibility_single` price — tap → `purchaseCompatibilitySingle()`
- "Upgrade to Premium — unlimited" — tap → dismisses sheet and calls `presentPaywall()`

The "unlimited" framing isn't a lie — premium gets 10/month compatibility readings which exceeds any realistic personal use case. Could also phrase as "Premium — 10 readings/month included." Decide during implementation copy review.

**Step 7 — Re-enable TodayScreen LockedCards**

File: `src/screens/tabs/TodayScreen.tsx`, lines 259–276.

Uncomment both LockedCard blocks. Confirm `presentPaywall` is imported from `usePurchases()`. Confirm both onUnlockPress props call `presentPaywall()`. Both cards render only for non-premium users — wrap in `{!isPremium && (...)}` if not already.

**Step 8 — Update ReadingsScreen 403 handler**

File: `src/screens/tabs/ReadingsScreen.tsx`. In every API call catch block currently checking for 403 / `subscription_required`, replace the text-error path with `await presentPaywall()`. The cards themselves (ReadingFeatureCard) already trigger paywall on Unlock press — this step just covers the case where a logged-in user's subscription lapsed between screen open and tap.

429 handling: leave the existing text error message. Premium users hitting their monthly cap on archetype/natal/forecast have no boost-pack option for those features (Phase 1 doesn't introduce credits for those reading types) — only the wait-for-reset path. The text error is the right UX.

**Step 9 — Update CompatibilityScreen**

File: `src/screens/CompatibilityScreen.tsx`. The LockedCard at line 222 already routes to paywall via existing pattern — confirm `onUnlockPress` calls `presentPaywall()`.

The screen presumably has an API call to `/api/generate-compatibility` (verify during implementation; if not, this step is a no-op for that file and the compatibility purchase flow lives wherever the actual call happens). When that call returns:

- 403 `subscription_required` + `credits_required: true` + `credit_balance: 0`: dismiss or replace the in-progress UI with `CompatibilityIAPSheet` opened
- 429 `monthly_limit_reached` (premium user, cap hit): show inline message + open `CompatibilityIAPSheet`
- 200 with `usage.source === 'credit'`: success; display result; in a secondary location optionally surface "You have N compatibility credits remaining"

**Step 10 — Update CounselChatScreen cap-hit and credit display**

File: `src/screens/counsel/CounselChatScreen.tsx`.

Replace the local `usage` state to accept the new discriminated union shape from Step 3.

Usage counter display (line 247-ish):
- If `usage.source === 'premium'`: render `{count} / {cap} this month` (replace existing "today" wording)
- If `usage.source === 'credit'`: render `{credit_balance_remaining} conversations remaining`
- If `usage` is null: render nothing (current behavior)

Cap-reached system message (lines 123–135):
- Compute the wait message from `resets_at` using existing `timeUntil()` helper but updated copy: "Resets {timeUntil(resets_at)}" instead of "today/tomorrow"
- Below the system message, render a CTA row: button "Get more conversations" → opens `BoostPackSheet` modal

429 catch (lines 175–185):
- Replace the `errMsg.includes('Too many requests')` matcher (it was a workaround for the now-fixed interceptor) with `parseBackendError()` from Step 2
- For `kind: 'cap_reached'`: same system message + CTA pattern as the proactive cap check above
- For `kind: 'subscription_required'`: this shouldn't happen on this screen because the entry guard at line 80 forces premium users only — but defensively handle by navigating back to CounselScreen tab

Send-button disable: keep `usage.source === 'premium' && usage.count >= usage.cap` as the disable trigger. For credit-source users, the button is enabled until they hit 0 credits — at which point the next send returns the error response and the cap-hit flow above kicks in.

**Step 11 — Confirm TraditionSwitcherScreen and CalendarScreen LockedCards still route to paywall**

Files: `src/screens/settings/TraditionSwitcherScreen.tsx` (line 111), `src/screens/CalendarScreen.tsx` (line 321).

No behavior change in this phase. Verify both LockedCards' `onUnlockPress` props call `presentPaywall()`. If they don't, fix to call it.

**Step 12 — TypeScript verification**

Run `tsc --noEmit` from `/Volumes/ESSD/Projects/Augur-V1/mobile-app/`. Exit code 0 required.

Particular attention to:
- The new discriminated union on `usage` requires narrowing in every consumer. Some `GetArchetypeReadingResponse`-style consumers may not need the union (they only handle premium source); decide whether to keep the simple non-union shape there or unify everything. Recommended: keep the simple shape on non-credit endpoints since their backend responses don't change.
- `BackendError` discriminated union exhaustiveness checks in every screen consuming `parseBackendError()`

### Files affected

Modified:
- `src/api/client.ts` — 429 interceptor preserves body; new `getErrorBody` export
- `src/api/endpoints.ts` — discriminated union on `CounselMessageResponse.usage` and `GenerateCompatibilityResponse.usage`
- `src/context/PurchasesContext.ts` — new fields and methods on the context value type
- `src/context/PurchasesProvider.tsx` — populate the new offering references; implement the two new purchase methods
- `src/screens/tabs/TodayScreen.tsx` — uncomment LockedCard blocks (lines 259–276)
- `src/screens/tabs/ReadingsScreen.tsx` — 403 handler triggers paywall instead of text error
- `src/screens/CompatibilityScreen.tsx` — 403/429 handlers open CompatibilityIAPSheet
- `src/screens/counsel/CounselChatScreen.tsx` — usage display branches on source; cap-hit shows boost-pack CTA; 429 catch uses parseBackendError
- `src/screens/settings/TraditionSwitcherScreen.tsx` — verify paywall wiring (no change expected)
- `src/screens/CalendarScreen.tsx` — verify paywall wiring (no change expected)

Created:
- `src/api/errors.ts` — `parseBackendError` and `BackendError` types
- `src/components/molecules/BoostPackSheet.tsx`
- `src/components/molecules/CompatibilityIAPSheet.tsx`

No design token changes. No new icons. No new screens.

### Acceptance criteria

- `tsc --noEmit` exit code 0 from mobile-app root
- Manual: free user opens TodayScreen → sees two LockedCards ("Your Full Daily Reading", "Today's Life Dimensions") rendered with Unlock buttons → tapping either opens RC paywall
- Manual: free user opens ReadingsScreen → three ReadingFeatureCards visible → tapping any Unlock opens RC paywall (unchanged from today)
- Manual: free user opens CounselTab → "Start chatting" opens RC paywall (unchanged)
- Manual: premium user enters CounselChat, sends 30 messages this month → usage counter shows "30 / 30 this month" → send button disabled → system message: "Resets in X days" → "Get more conversations" CTA visible → tap opens BoostPackSheet with 3 packs and real prices from RC
- Manual: premium user purchases Spark pack from BoostPackSheet → sheet dismisses → next message send succeeds → response usage shows `{source: 'credit', credit_balance_remaining: 4}` → counter displays "4 conversations remaining"
- Manual: premium user with 0 credits exhausts Spark pack (5 messages) → 6th message returns 429 → system message + CTA pattern as above
- Manual: free user opens CompatibilityScreen LockedCard → paywall opens (unchanged)
- Manual: premium user generates 10 compatibility readings in month → 11th attempt returns 429 → inline message + CompatibilityIAPSheet auto-opens → user can buy single or upgrade
- Manual: webhook idempotency from Phase 1 still works (covered by Phase 1 ACs, not re-verified here)
- Manual: 429 from any endpoint now exposes `response.data.error` to screen-level catch blocks (the prior interceptor stripping is fixed)
- Manual: subscription paywall renders RC dashboard-configured offerings — confirm package count, prices, trial language match Phase 0 Track B configuration

### Rollback plan

This phase is mobile-only and ships as a JS bundle update through Expo OTA or app store rebuild. Rollback options:

- API client interceptor change: trivial revert; previous behavior was a stripped error. Reverting reintroduces the workaround pattern in CounselChatScreen.
- LockedCard re-enablement on TodayScreen: re-comment the two blocks (revert to current state — premium content visible to all). No data impact.
- New components (BoostPackSheet, CompatibilityIAPSheet): unused if not referenced; deleting them requires reverting the screens that import them.
- PurchasesContext extensions: additive. Removing requires reverting consumers first.

If a critical regression ships, the safe rollback is to revert the entire Phase 2 PR and re-deploy the prior bundle. Backend Phase 1 changes can stay live — they're tolerant of any client behavior (the new error shapes are supersets of the old ones, and old clients ignoring new fields work fine).

### Risks / open questions

1. **Credit-source response handling consistency across screens.** Only CounselChatScreen and CompatibilityScreen consume credit-source responses. If Phase 1's response shape evolves (e.g. adding a `credit_balance_after_purchase` hint), every consumer needs the update. Mitigated by `parseBackendError()` centralization, but the success-path response types are NOT centralized. Acceptable for v1; flag as tech debt.

2. **`presentPaywall()` results.** RC's `PAYWALL_RESULT` enum has values like `PURCHASED`, `RESTORED`, `CANCELLED`, `ERROR`. The current code at PremiumTeaserScreen ignores the result; new call sites should at minimum branch on PURCHASED → refresh customer info. Verify the existing `presentPaywall` wrapper in PurchasesProvider does this automatically (audit didn't explicitly confirm).

3. **Bottom-sheet implementation pattern.** Audit didn't surface an existing bottom-sheet component or library convention. Two implementation paths: (a) use React Native's built-in `Modal` with custom animation; (b) add `@gorhom/bottom-sheet` as a dep. Decide during implementation. Prefer (a) for minimal dep footprint unless the visual quality demands (b).

4. **`omenora_calendar_2026` direct purchase deferred.** The current CalendarScreen LockedCard routes to the subscription paywall. A free user wanting just the calendar for $4.99 has no path right now. Phase 3 will add the standalone IAP path. If Miki wants this in Phase 2, scope creep — flag for decision.

5. **Boost-pack purchase by free users.** Phase 1 spec allows free users to purchase boost packs (no premium gate on the IAP itself). Phase 2 mobile UI doesn't expose this path — free users hit Counsel paywall before reaching the chat screen, so they can't see the boost-pack CTA. To enable free users to buy a single Spark pack and start chatting, the CounselScreen tab would need a "or buy a pack" secondary CTA below the "Start chatting" → paywall flow. Deferred to Phase 3 as a free-user IAP entry surface. Flag for awareness.

6. **Trial countdown UI deferred.** The original Phase 3 (now part of Phase 2) included trial countdown for users mid-trial. The RC native paywall handles trial messaging during the purchase flow. A countdown widget for already-subscribed-but-in-trial users (e.g. "Trial ends in 4 days") is a Phase 4 (Subscription Management) concern, not Phase 2. Removed from in-scope here.

7. **Compatibility credit balance display surface.** Step 9 mentions optionally showing "N compatibility credits remaining" somewhere. CompatibilityScreen is the natural home. Implementation decision during execution: small banner below the result header, or footer note. Not blocking.

8. **Mobile-side gating ignores subscription expiry race.** A user whose subscription expired between app launch and a paid action gets the 403/429 from backend, but the local `isPremium` boolean from PurchasesContext may still be `true` until next CustomerInfo refresh. The error handler triggers paywall correctly, but UI may briefly show premium-only content. Acceptable v1 — RC's `addCustomerInfoUpdateListener` will catch the expiry within seconds. Mitigation if needed: `refreshCustomerInfo()` on every paywall present.

---

## Phase 3 — IAP Purchase Flows

**Status:** READY FOR IMPLEMENTATION

### Goal
Consolidate all IAP purchase entry points behind the RevenueCat offering structure (instead of raw `getProducts`), add an explicit "Restore Purchases" entry point for App Store guideline 3.1.1 compliance, and add a free-user boost-pack purchase path so free users can pay-as-you-go for Counsel without subscribing.

### Scope (in)
- Refactor `purchaseCalendar` in PurchasesProvider to read from the `addons` offering (Phase 0 Track B step 24 — package identifier `calendar`) instead of the current direct `Purchases.getProducts(['omenora_calendar_2026'], NON_SUBSCRIPTION)` call. Behavior identical, source-of-truth shifts to the offering.
- Add "Restore Purchases" entry to MoreScreen — new ListItem row in the "Account & Settings" section, above or below the existing "Subscription" row. onPress calls `Purchases.restorePurchases()` then `refreshCustomerInfo()`. Shows Alert.alert with success/error message based on whether any entitlements were restored.
- Add a "Try Counsel without subscribing" CTA below the free-user "Start chatting" button on CounselScreen tab (currently only routes to paywall). Tap opens the `BoostPackSheet` from Phase 2. Free users can buy a Spark pack and access CounselChat without ever subscribing.
- CounselChatScreen entry guard at line 80 (currently `if (!isPremium) navigation.goBack()`): update to allow entry if `isPremium === true` OR if the user has a positive counsel_credits balance (which the mobile app learns about via the next API call's response, since credit balance isn't currently in PurchasesContext). For the entry check specifically: since the local context doesn't track credit balance, we cannot block on credit absence pre-API-call. Instead, allow CounselChat entry for ANY authenticated user. The first API call will return 403 if neither subscription nor credits exist, and the existing error handling from Phase 2 (BoostPackSheet on cap_exhausted, paywall on subscription_required) takes over. Update the back-navigation logic accordingly: replace the `if (!isPremium)` early return with no guard, letting the API response drive the UX.
- Centralized purchase error handling utility — new helper `src/utils/handlePurchaseError.ts` that takes the caught error from any RC purchase call and returns `{ kind: 'cancelled' | 'pending' | 'declined' | 'network' | 'product_unavailable' | 'unknown', userMessage: string }`. Consumed by BoostPackSheet, CompatibilityIAPSheet, the refactored purchaseCalendar caller, and any future purchase site. Replaces the current ad-hoc `err?.userCancelled === true` check + generic Alert in CalendarScreen.
- Post-purchase confirmation pattern — after successful boost-pack or compatibility-single purchase, show Toast (the existing unused Toast molecule from `src/components/molecules/Toast.tsx`). Variant `success`, copy "5 conversations added" / "Compatibility reading ready". This is the first production wiring of the Toast component.

### Scope (out)
- Building a custom boost-pack purchase screen (the bottom sheet from Phase 2 is sufficient)
- Allowing free users to access TodayScreen premium content via consumables — premium content for Today is subscription-only, no consumable equivalent
- Allowing free users to access archetype/natal_chart/forecast readings via consumables — Phase 1 didn't introduce credits for those endpoints; subscription-only
- Subscription management UI — Phase 4
- App Store review prep — Phase 5

### Pre-conditions
- Phase 2 shipped: BoostPackSheet and CompatibilityIAPSheet components exist, API client interceptor fixed
- Phase 0 Track B step 24 complete: `addons` offering exists in RevenueCat with package identifier `calendar` attached to `omenora_calendar_2026` 
- RC dashboard Customer Center configured (Phase 0 follow-up — flagged below)

### Dependencies (external)
- RevenueCat offerings populated (Phase 0 Track B)
- Apple Sandbox environment to test restore purchases flow

### Implementation steps

**Step 1 — Refactor purchaseCalendar**

File: `src/context/PurchasesProvider.tsx` lines 172–185. Replace the body of `purchaseCalendar` to:

1. Read `offerings.all['addons']` from the offerings already fetched at provider init (currently only `offerings.current` is stored — Phase 2 Step 4 expanded this; verify the addons offering reference is now exposed)
2. Find the package with identifier `'calendar'` in `availablePackages` 
3. Call `Purchases.purchasePackage(pkg)` instead of `purchaseStoreProduct` 
4. If package or offering is missing, throw a clear error mentioning the dashboard configuration gap

Same post-purchase behavior: call `refreshCustomerInfo()` and return the result.

**Step 2 — Create purchase error helper**

New file: `src/utils/handlePurchaseError.ts`. Inspects RC error properties (`userCancelled`, `code` from PurchasesErrorCode enum) and returns the discriminated union. The `code` field matches PurchasesErrorCode values like `PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR`, `NETWORK_ERROR`, `PAYMENT_PENDING_ERROR`, `PURCHASE_NOT_ALLOWED_ERROR`. Map each to a user-friendly message. Default to 'unknown' with generic "Couldn't complete the purchase" message for unmapped codes.

**Step 3 — Wire purchase error helper into existing call sites**

- `src/screens/CalendarScreen.tsx` handleBuyCalendar (lines 189–206): replace inline `userCancelled` check + generic Alert with call to handlePurchaseError. For 'cancelled' kind, silently return (current behavior). For all other kinds, show Alert.alert with the helper-provided userMessage.
- `BoostPackSheet` and `CompatibilityIAPSheet` (Phase 2 components): use the same helper in their purchase catch blocks.

**Step 4 — Add Restore Purchases to MoreScreen**

File: `src/screens/tabs/MoreScreen.tsx`, "Account & Settings" section. Add new ListItem between "Subscription" and "Notifications":

- icon: `RefreshCw` from lucide-react-native
- label: "Restore Purchases"  
- onPress: async handler that calls `Purchases.restorePurchases()` and inspects the returned CustomerInfo. If `entitlements.active` is non-empty OR `nonSubscriptionTransactions` is non-empty, show Alert.alert "Purchases restored" with body listing what was restored. If both are empty, show Alert.alert "Nothing to restore" with body "No previous purchases found for this Apple ID." Wrap in try/catch and route errors through handlePurchaseError from Step 2.

**Step 5 — Add free-user boost-pack entry to CounselScreen tab**

File: `src/screens/tabs/CounselScreen.tsx`. The current free-user branch renders sample chips + "Start chatting" button (calls presentPaywall). Below the existing primary CTA, add a `Button variant="tertiary"` or text-link styled action: "Or pay per conversation — from $1.99". onPress opens the BoostPackSheet from Phase 2. State management: `const [boostSheetVisible, setBoostSheetVisible] = useState(false)`. On purchase success the sheet calls `refreshCustomerInfo()` (Phase 2 contract) but credits aren't in CustomerInfo — they're in our backend. Post-purchase the user can tap "Start chatting" again; the entry guard relaxation in Step 6 lets them through.

**Step 6 — Relax CounselChatScreen entry guard**

File: `src/screens/counsel/CounselChatScreen.tsx` line 80. Replace `if (!isPremium) navigation.goBack()` with: if user is unauthenticated, navigation.goBack(); otherwise allow entry. The 403 from the first message send will surface the appropriate error UI (paywall or boost sheet) from Phase 2's parseBackendError handling.

This means: a free user who tapped "Or pay per conversation" → bought a Spark pack → tapped "Start chatting" → enters CounselChat → sends a message → message succeeds with credit-source response. The credit-source success response from Phase 1 drives the "N conversations remaining" UI from Phase 2.

A free user who taps "Start chatting" WITHOUT purchasing → enters CounselChat → first send returns 403 → paywall opens. Slightly worse UX than the current goBack pattern but acceptable for the simpler logic; alternatively keep the goBack and require purchase-before-entry — see open question below.

**Step 7 — Wire Toast for purchase success**

After successful purchase in BoostPackSheet and CompatibilityIAPSheet (Phase 2 components), trigger the existing Toast molecule with variant='success' and contextual message. The Toast component is currently rendered only in ComponentsScreen dev gallery; production wiring is new.

Pattern: a screen-level Toast state (`toastVisible`, `toastMessage`, `toastVariant`) lives in CounselScreen (or wherever the sheet is opened from) and is passed to the sheet via an `onPurchaseSuccess` callback that the sheet invokes before dismissing. Same pattern for CompatibilityScreen + CompatibilityIAPSheet.

**Step 8 — TypeScript verification**

`tsc --noEmit` exit code 0 required.

### Files affected

Modified:
- `src/context/PurchasesProvider.tsx` — purchaseCalendar refactored to use offerings
- `src/screens/tabs/MoreScreen.tsx` — Restore Purchases row added
- `src/screens/tabs/CounselScreen.tsx` — boost-pack entry CTA added for free users
- `src/screens/counsel/CounselChatScreen.tsx` — entry guard relaxed
- `src/screens/CalendarScreen.tsx` — purchase error handling routed through new helper
- Phase 2 sheets (BoostPackSheet, CompatibilityIAPSheet) updated to use Toast on success and error helper on failure

Created:
- `src/utils/handlePurchaseError.ts` 

### Acceptance criteria

- `tsc --noEmit` exit code 0
- Manual: tap "Restore Purchases" with no prior purchases → "Nothing to restore" alert
- Manual: tap "Restore Purchases" with active subscription on the Apple ID → "Purchases restored" alert; isPremium becomes true
- Manual: free user on CounselScreen tab → sees "Start chatting" + secondary "Or pay per conversation — from $1.99" → tap secondary → BoostPackSheet opens
- Manual: free user buys Spark pack → Toast shows "5 conversations added" → CounselScreen tab updates to show "Start chatting" continues to route into CounselChat → first message succeeds with credit-source response
- Manual: free user taps "Start chatting" without buying → enters CounselChat → first message returns 403 → paywall opens (Phase 2 behavior)
- Manual: cancel a purchase mid-flow → no alert shown (silent dismissal preserved)
- Manual: simulate purchase failure (sandbox network drop) → alert shows the specific PurchasesErrorCode-mapped message, not generic "Purchase failed"

### Rollback plan

- handlePurchaseError helper deletion requires reverting consumers
- purchaseCalendar refactor: revert to direct getProducts call; functional equivalence
- Restore Purchases row: remove from MoreScreen; non-destructive
- CounselScreen secondary CTA: remove; free users go back to paywall-only path
- CounselChatScreen guard relaxation: revert the line 80 change; non-destructive

### Risks / open questions

1. **CounselChatScreen guard relaxation tradeoff.** Letting unauthenticated/uncredited users enter the chat screen means the first message is required to discover their access status. Alternative: keep the existing premium check but ALSO check for a positive credit balance via a new `/api/me/credits` endpoint added in Phase 1 — but Phase 1 didn't add that endpoint. If the entry UX matters more than backend simplicity, add the endpoint as a small Phase 3 backend addition. Decision needed.

2. **`addons` offering package identifier.** Phase 0 Track B step 24 uses suggested identifier `calendar` for the calendar package. If Phase 0 implementation actually used a different identifier, Step 1 here needs the actual string. Verify before implementation.

3. **`refreshCustomerInfo` after boost-pack purchase is misleading.** The boost pack purchase grants credits in our backend, not entitlements in RevenueCat. Calling `refreshCustomerInfo()` after a boost-pack purchase does nothing useful from a state-management perspective — it refreshes the RC state, which doesn't include credits. The Toast confirmation is the actual user-visible signal. Document this clearly in the BoostPackSheet code; don't gate the success UI on a CustomerInfo refresh.

4. **Customer Center dashboard config.** `presentCustomerCenter()` is the existing subscription management entry from MoreScreen line 191. If the RC dashboard Customer Center is not configured, that button opens an empty modal. This is a Phase 0 follow-up — flag for Track B verification. Not blocking for Phase 3 but blocking for App Store review.

5. **Toast lifecycle conflicts.** If a user buys two boost packs in rapid succession (unlikely but possible), the Toast from the first purchase may still be visible when the second fires. Toast auto-dismisses after 3 seconds — acceptable race, no fix needed.

---

## Phase 4 — Subscription Management UI

**Status:** READY FOR IMPLEMENTATION

### Goal
Make subscription status visible to subscribers (current plan, trial countdown if applicable, renewal date), ensure the existing Customer Center entry is discoverable, and surface basic billing info beyond the binary "PREMIUM" badge.

### Scope (in)
- Extract subscription state details from CustomerInfo into PurchasesContext: `expirationDate`, `willRenew`, `periodType` ('NORMAL' | 'INTRO' | 'TRIAL'), `productIdentifier` (which subscription plan they're on). Add these as derived fields on PurchasesContextValue.
- New `SubscriptionStatusCard` component (new file): rendered on MoreScreen above the existing "Premium Features" section for premium users. Displays current plan name (e.g. "Annual Plan" / "Monthly Plan"), trial countdown if periodType is 'TRIAL' with copy "Trial ends in N days", or renewal date if periodType is 'NORMAL' with copy "Renews [date]". For users with willRenew=false (cancelled but still in paid period), copy is "Access ends [date]".
- "Manage Subscription" row label change: rename the existing "Subscription" ListItem in MoreScreen's "Account & Settings" section to "Manage Subscription" for clearer Apple-compliance signaling. Keeps existing presentCustomerCenter() onPress.
- Replace the PREMIUM badge on the account header card (lines 110–129 of MoreScreen) with a more informative badge for trial users: "TRIAL" + days-remaining count. NORMAL premium users keep "PREMIUM". Cancelled users (willRenew=false) get "PREMIUM • EXPIRES [date]".
- Trial conversion CTA — if user is in TRIAL period and trial-ends-in is ≤ 2 days, render a Card on TodayScreen (above the existing premium-CTA card at lines 241–256) with copy "Your trial ends in N days. Keep your full Reading experience." with a CTA that opens Customer Center (where Apple shows the actual subscription details). This is informational only; the actual trial conversion is automatic via Apple unless the user cancels.

### Scope (out)
- Custom cancel flow — handled by RC Customer Center
- Custom restore flow — handled by Phase 3 Restore Purchases row
- Plan switching UI — handled by RC Customer Center (auto-handles upgrade/downgrade within subscription group)
- Refund request flow — Apple handles refunds, not the developer
- Billing history — not required, RC Customer Center includes purchase history
- Win-back offers / retention paywall — out of scope for v1

### Pre-conditions
- Phase 2 shipped: PurchasesContext extensions in place
- RC Customer Center configured in RevenueCat dashboard (see Phase 3 open question 4)
- At least one real or sandbox subscription purchase exists to test trial/renewal states

### Implementation steps

**Step 1 — Extend PurchasesContext with subscription details**

File: `src/context/PurchasesProvider.tsx`. Add derived fields:

- `expirationDate: Date | null` — from `customerInfo.entitlements.active['premium']?.expirationDate` 
- `willRenew: boolean | null` — from `customerInfo.entitlements.active['premium']?.willRenew` 
- `periodType: 'NORMAL' | 'INTRO' | 'TRIAL' | null` — from `customerInfo.entitlements.active['premium']?.periodType` 
- `subscriptionProductId: string | null` — from `customerInfo.entitlements.active['premium']?.productIdentifier` 

All four are null for non-premium users. Expose on PurchasesContextValue. Update the TypeScript context type.

**Step 2 — Create SubscriptionStatusCard component**

New file: `src/components/molecules/SubscriptionStatusCard.tsx`. Reads the four new context fields. Three render branches:

- Trial: card with `Card variant="featured"`, copper accent, copy "Trial — N days remaining"; days computed as `Math.ceil((expirationDate - now) / 86400000)`. Tap → presentCustomerCenter()
- Normal active: `Card variant="content"`, copy "Premium • Renews [formatted date]" using toLocaleDateString('en-US'). Tap → presentCustomerCenter()
- Cancelled (willRenew=false, still in paid period): `Card variant="content"` with subdued styling, copy "Access ends [date]". Tap → presentCustomerCenter()

If user is not premium (all four fields null), render nothing.

**Step 3 — Wire SubscriptionStatusCard into MoreScreen**

File: `src/screens/tabs/MoreScreen.tsx`. Render `<SubscriptionStatusCard />` after the account header card and before the "Premium Features" section. For non-premium users it renders nothing.

**Step 4 — Update account header badge**

File: `src/screens/tabs/MoreScreen.tsx` lines 110–129. Replace the plan badge logic:

- isPremium && periodType === 'TRIAL': badge text "TRIAL · Nd" where N is days remaining; copper accent
- isPremium && willRenew === false: badge text "PREMIUM · ENDING"; muted accent
- isPremium (default): badge text "PREMIUM"; copper accent (unchanged)
- !isPremium: badge text "FREE" (unchanged)

**Step 5 — Rename "Subscription" row to "Manage Subscription"**

File: `src/screens/tabs/MoreScreen.tsx` around line 191. Change ListItem label. onPress unchanged.

**Step 6 — Trial-ending TodayScreen banner**

File: `src/screens/tabs/TodayScreen.tsx`. After the existing daily content but before the bottom of the ScrollView, conditionally render a card if `isPremium && periodType === 'TRIAL' && daysRemaining <= 2`. Copy: "Your trial ends in N days." with subtext "Keep your Reading and Counsel access." Tap → presentCustomerCenter().

If daysRemaining is 0 (trial ending today), copy: "Your trial ends today." Same tap behavior.

**Step 7 — TypeScript verification**

`tsc --noEmit` exit code 0 required.

### Files affected

Modified:
- `src/context/PurchasesContext.ts` — new fields on context value type
- `src/context/PurchasesProvider.tsx` — derive and expose four new fields
- `src/screens/tabs/MoreScreen.tsx` — wire SubscriptionStatusCard, update badge logic, rename Subscription row
- `src/screens/tabs/TodayScreen.tsx` — conditional trial-ending banner

Created:
- `src/components/molecules/SubscriptionStatusCard.tsx` 

### Acceptance criteria

- `tsc --noEmit` exit code 0
- Manual (trial user, 5 days remaining): account badge shows "TRIAL · 5d"; SubscriptionStatusCard shows "Trial — 5 days remaining"; no TodayScreen banner (>2 days)
- Manual (trial user, 1 day remaining): account badge shows "TRIAL · 1d"; SubscriptionStatusCard renders; TodayScreen banner shows "Your trial ends in 1 day"
- Manual (normal premium, monthly): badge "PREMIUM"; card "Premium • Renews [date]"
- Manual (cancelled premium, 10 days until expiration): badge "PREMIUM · ENDING"; card "Access ends [date]"
- Manual: tapping any of these surfaces opens RC Customer Center
- Manual (free user): SubscriptionStatusCard renders nothing; no TodayScreen banner; badge "FREE"

### Rollback plan

- Context extensions: additive; non-breaking
- SubscriptionStatusCard: delete the component and its import; MoreScreen reverts to no plan visibility
- Badge change: revert MoreScreen lines 110–129 to current logic
- TodayScreen banner: remove conditional render block; non-destructive

### Risks / open questions

1. **expirationDate type from RC SDK.** RC SDK returns `expirationDate` as ISO string in some versions and Date in others. Implementation must defensively handle both: `typeof exp === 'string' ? new Date(exp) : exp`. Verify against installed version `react-native-purchases@^10.1.0`.

2. **Trial detection across stores.** Apple Sandbox compresses trial timing (a 7-day trial is minutes in sandbox). Trial-ending banner logic must use real `expirationDate` from the SDK; for sandbox testing the banner will fire almost immediately, which is expected.

3. **periodType value naming.** RC enum is `PERIOD_TYPE.TRIAL` etc. Confirm exact string values returned in `customerInfo.entitlements.active['premium'].periodType` against SDK 10.x.

4. **Cancelled-but-active state via willRenew=false.** A cancelled user whose subscription is still in the paid period has willRenew=false but isPremium remains true until expirationDate passes. The badge and card reflect this. After expirationDate, RC's CustomerInfoUpdateListener fires and isPremium flips to false; the SubscriptionStatusCard stops rendering. No additional polling needed.

5. **Daily refresh of trial countdown.** The days-remaining calculation uses current time at render. If a user keeps the app open across a midnight boundary, the count won't auto-update until next render. Acceptable for v1; mitigated by the fact that anyone watching their trial countdown will close/reopen the app frequently.

---

## Phase 5 — App Store Review Preparation

**Status:** READY FOR IMPLEMENTATION

### Goal
Resolve all known App Store review blockers around in-app purchase compliance, fix critical legal copy errors discovered during audit, prepare all metadata and screenshots required for first submission.

### Scope (in)
- Rewrite `src/screens/PrivacyScreen.tsx` to accurately describe Apple In-App Purchase payment processing (currently references Stripe — wrong for mobile)
- Rewrite `src/screens/TermsScreen.tsx` "Payments & Refunds" section to disclose auto-renewing subscriptions and direct refund requests to Apple (currently says "one-time payments" and directs to support@omenora.com — both wrong)
- Add Apple-required auto-renewing subscription disclosure language to: paywall (handled by RC dashboard config), Terms of Service screen, and at the bottom of any custom paywall surface if such a surface exists in v1 (PremiumTeaserScreen)
- Create/replace app icon and adaptive icon assets — current icon.png is 5KB (placeholder per audit)
- Create App Store screenshots for required sizes (6.7" iPhone, 6.5" iPhone, optionally 5.5" iPhone for compatibility): screens to capture include onboarding completion, TodayScreen with content, ReadingsScreen with at least one reading, CounselChat in progress, paywall, MoreScreen with subscription card
- Prepare App Store Connect metadata: app description (mobile-specific, mentions astrology + premium subscription + boost packs), keywords, support URL (omenora.com/support or contact email), marketing URL (omenora.com), copyright string ("© 2026 United Northwest Carriers Inc."), age rating (12+ is likely — references to romantic compatibility, references to spiritual/divination content)
- Privacy nutrition label data: declare data collected per Apple's data type categories. From audit: Sentry collects crash data (scrubbed of PII); Supabase stores email + birth data; RevenueCat collects subscription transaction data. Each must be declared with usage purpose (App Functionality, Analytics where applicable).
- App Tracking Transparency (ATT): the app does not use the IDFA for tracking per audit (Sentry has tracesSampleRate=0, no analytics SDK). Confirm no ATT prompt is needed. If RC dashboard analytics integrations are added later that share IDFA, ATT becomes required.
- Demo account credentials for Apple reviewer: prepare a test account with pre-populated chart data so reviewer can immediately see paid features
- Reviewer notes: explicit instructions covering how to test paywall, how to test boost-pack purchase (sandbox), how to test restore purchases, and which test account to use
- Crisis disclosure language: Counsel feature includes content about emotional/personal topics. Apple may flag this. Confirm the existing CrisisResources screen and CounselChat disclosure satisfy the "Apps that include user-generated content or services that end up being used primarily for pornographic content..." style review concern (it doesn't apply here, but the disclosure-of-limitations pattern protects against being flagged as offering medical/mental-health advice)

### Scope (out)
- Building a custom paywall (existing RC paywall is sufficient)
- Analytics SDK integration (deferred indefinitely; `placement` props on cards remain unused)
- App Store Optimization (ASO) deep work — basic keywords sufficient for v1
- Localized App Store listings — English-only v1 per audit
- Promotional artwork / app preview videos — optional for first submission

### Pre-conditions
- Phase 0 Track A complete: Apple Developer organization status, Paid Apps Agreement signed, banking Clear
- Phases 1–4 shipped to TestFlight
- Real device tested all monetization flows in sandbox
- Privacy policy and Terms of Service screens rewritten per Step 1 and Step 2 below
- Designer / Miki produces final app icon + screenshots (asset work, not coding)

### Implementation steps

**Step 1 — Rewrite PrivacyScreen content**

File: `src/screens/PrivacyScreen.tsx`. Replace the "Payment Information" section. New copy must state:

- Apple In-App Purchase handles payment processing for the mobile app
- Apple receives and stores payment information; OMENORA does not have access to payment card data
- For users who additionally use the web product (omenora.com), Stripe handles web payments separately
- RevenueCat is used to manage subscription state and transaction validation; RevenueCat receives anonymous subscription identifiers, no PII

Write the copy to be plain-English, no legalese. Verify all other sections (Information We Collect, How We Use Your Data, Data Storage & Security, Your Rights, Contact) remain accurate for the mobile context — birth data, email, chart calculation results, language preference, optional analytics toggle. The Contact section should keep support@omenora.com.

**Step 2 — Rewrite TermsScreen "Payments & Refunds"**

File: `src/screens/TermsScreen.tsx`. Replace the existing section. New content must include:

- Auto-renewing subscription disclosure in the Apple-required form: "OMENORA offers monthly ($14.99/month) and annual ($99.99/year) auto-renewing subscriptions with a 7-day free trial. Payment will be charged to your Apple ID account at confirmation of purchase. Subscription automatically renews unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period, at the cost of the chosen package. Subscriptions may be managed by the user and auto-renewal may be turned off by going to the user's Apple ID Account Settings after purchase. No cancellation of the current subscription is allowed during the active subscription period."
- One-time purchase (Calendar, Compatibility, Boost Packs) disclosure: "Lucky Timing Calendar, single Compatibility Reading, and Counsel Boost Packs are one-time purchases. They do not auto-renew. Boost Pack credits do not expire."
- Refund instructions: "Refund requests are handled by Apple. To request a refund, visit reportaproblem.apple.com or contact Apple Support. OMENORA does not directly process refunds for App Store purchases."

**Step 3 — Add legal links to paywall surfaces**

File: `src/screens/onboarding/PremiumTeaserScreen.tsx`. At the bottom of the screen (above the SafeAreaView bottom), add a small `Text variant="micro" color="tertiary"` row with three tap targets:

- "Terms" → navigation.navigate('Terms')
- "Privacy" → navigation.navigate('PrivacySettings') or 'Privacy' directly
- "Restore Purchases" → call Purchases.restorePurchases() — same handler as MoreScreen Step from Phase 3

Apple guideline 3.1.2(a) requires these links to be visible from any subscription paywall surface. The RC native paywall (presentPaywall) should also display them, configurable in the RC dashboard — verify during Phase 0 Track B final review.

**Step 4 — App icon and adaptive icon replacement**

Miki produces final icon assets at the Apple-required sizes (1024×1024 for App Store, all device-specific sizes auto-generated by Expo). Replace `assets/icon.png` and `assets/adaptive-icon.png`. Expo regenerates platform-specific sizes on build. Verify `splash.png` also reflects the current brand if needed.

**Step 5 — App Store screenshots**

Miki captures screenshots from a real device or simulator at 6.7" and 6.5" iPhone sizes (App Store Connect's current required set). Apple requires minimum 1 screenshot, recommends 3–10. Suggested set:

1. Hero / Onboarding archetype reveal
2. TodayScreen with archetype insight and moon phase
3. ReadingsScreen showing a full reading
4. CounselChat with a conversation in progress
5. Subscription paywall (RC paywall screenshot)
6. ReadingsScreen showing Compatibility or Calendar feature

Screenshots stored in a new `assets/store-screenshots/` directory (created during this phase). Apple uploads happen via App Store Connect, not the codebase, so the directory is reference-only.

**Step 6 — App Store Connect metadata preparation**

Outside the codebase. Prepare in App Store Connect:

- Name: "OMENORA"
- Subtitle: 30-char tagline (suggested: "Personal Astrology & Counsel")
- Promotional Text: 170 chars summarizing current features and value
- Description: 4000-char limit; describe all four traditions, subscription value, one-time purchases. Must comply with Apple's no-fake-reviews, no-superlative-claims rules.
- Keywords: 100-char comma-separated; suggestions: "astrology, horoscope, tarot, natal chart, compatibility, vedic, bazi, archetype, divination, daily"
- Support URL: omenora.com or a dedicated support page; if neither exists, use mailto:support@omenora.com
- Marketing URL: omenora.com
- Copyright: "© 2026 United Northwest Carriers Inc."
- Age Rating: complete the questionnaire; expected 12+ based on content profile

**Step 7 — Privacy nutrition label**

Outside the codebase. Complete in App Store Connect under App Privacy:

- Data linked to user: Contact Info (email), Sensitive Info (date and time of birth for chart calculation), User Content (chart data, counsel conversations stored server-side)
- Data not linked to user: Diagnostics (Sentry crash reports, PII-scrubbed per beforeSend hook)
- Data used for tracking: NONE (the app does not use IDFA for tracking)

Each disclosed data type requires selecting purposes (App Functionality, Analytics, Personalization, etc.).

**Step 8 — Reviewer notes and demo account**

Prepare in App Store Connect under App Review Information:

- Demo account email: a real test Apple ID with a permanent OMENORA account already onboarded (chart data populated, no destructive review state). Provide credentials.
- Reviewer notes: instructions covering — "To test subscription paywall: from any tab, tap a locked feature. To test boost-pack purchase: from Counsel tab, tap 'Or pay per conversation'. To test restore purchases: More tab → Restore Purchases. Sandbox products are configured under the demo Apple ID. The Counsel feature provides general life-context guidance only, not medical or mental-health advice; crisis resources link is always available via More tab → Crisis Resources."
- Contact info: support@omenora.com and a real phone number for review-related escalations
- Notes about anonymous users: explain that the app supports anonymous (no-account) usage with reduced feature access; reviewers should test both anonymous and signed-in flows.

**Step 9 — Final build, submission, and post-submission monitoring**

Outside the codebase. Build production binary via EAS, upload to App Store Connect, submit for review. Expected review time: 24–48 hours for first submission, sometimes longer for novel categories. Be available to respond to reviewer follow-up questions within 4 hours during the review window.

### Files affected

Modified:
- `src/screens/PrivacyScreen.tsx` — Payment Information section rewritten
- `src/screens/TermsScreen.tsx` — Payments & Refunds section rewritten with Apple-required disclosure
- `src/screens/onboarding/PremiumTeaserScreen.tsx` — legal/restore footer added
- `assets/icon.png` — replaced
- `assets/adaptive-icon.png` — replaced
- `assets/splash.png` — replaced (if updated)

Created:
- `assets/store-screenshots/` — directory containing reference screenshots

External (App Store Connect):
- All Step 6, 7, 8 metadata

### Acceptance criteria

- Privacy and Terms screens accurately describe Apple IAP and auto-renewing subscription mechanics
- Auto-renewing subscription disclosure language present in Terms and on PremiumTeaserScreen
- Restore Purchases link present on PremiumTeaserScreen footer (in addition to MoreScreen entry from Phase 3)
- App icon visually finalized (no placeholder)
- App Store Connect "App Information" section complete with subtitle, keywords, description, URLs, copyright
- App Store Connect "App Privacy" nutrition label complete and accurate against actual data flows
- App Store Connect "App Review Information" complete with demo account, reviewer notes, contact info
- App submitted for review

### Rollback plan

App Store review is a one-shot per binary. If review fails:
- Apple provides reasons in Resolution Center
- Fix the specific issue, increment build number, resubmit
- Common rejection reasons applicable here: 3.1.1 (paid restore missing), 3.1.2(a) (auto-renew language unclear), 5.1.1 (data collection disclosure mismatch), 4.3 (content too similar to other astrology apps — unlikely with the archetype framing)

No code rollback per se — every Phase 5 change is content/metadata that improves compliance.

### Risks / open questions

1. **Apple may reject Counsel as "providing professional advice."** The Counsel feature uses Claude to generate context-aware responses to user questions. Apple has occasionally flagged AI-assisted advice apps. Mitigation: clear disclaimer language at the top of CounselChat (currently exists per audit at line 80-ish), CrisisResources link visible, system prompt explicitly avoids medical/legal/professional-advice framing. If rejected, the response is to strengthen the disclaimer wording.

2. **Astrology category review rigor.** Apple historically reviews astrology apps with normal scrutiny; the category is well-established. No special concerns expected, but the "compatibility" feature (using two people's birth data) may attract attention. Privacy nutrition label must clearly state that compatibility data is processed but not retained beyond user account.

3. **Boost packs as "consumable IAPs in a non-game app."** Apple has historically allowed this but occasionally flags consumable purchases as feeling subscription-like. Mitigation: clear product naming (Spark / Insight / Ascend imply discrete value, not time-based access), no expiration on credits, and the existence of subscription alternative ($14.99/mo includes the same value much cheaper for heavy users) shows it's a genuine pay-per-use option.

4. **D-U-N-S timing.** Phase 5 cannot fully complete until Phase 0 Track A completes (banking Clear). The codebase changes in Steps 1–3 can proceed anytime. Steps 6–8 wait for App Store Connect access under the organization account.

5. **Privacy nutrition label drift.** If Phase 3 adds an `/api/me/credits` endpoint or Phase 4 surfaces subscription details that involve new data flows, the privacy nutrition label must be updated. Treat the nutrition label as a living document, not a one-time submission artifact.

---

## Phase 6 — Calendar Year Rollover

**Status:** DEFERRED — full specification waits for Q4 2026

### Goal
Transition the annual Lucky Timing Calendar product from `omenora_calendar_2026` to `omenora_calendar_2027`, regenerate calendar content for the new year, retire the 2026 product, and avoid disrupting existing 2026 purchasers.

### Known scope (in)
- New App Store Connect product `omenora_calendar_2027` ($4.99, non-consumable)
- New RevenueCat entitlement `calendar_2027` attached to the new product
- New `addons` offering package configuration for the 2027 calendar
- Backend prompt regeneration logic for 2027 lucky timing windows
- Mobile-side hardcoded year reference updates: search the codebase for "2026" string literals; replace with dynamic year derivation where appropriate, or with "2027" where year-specific
- Marketing transition: customers who purchased 2026 retain access to 2026 content; pitch 2027 as a new purchase for the new year
- Product ID lifecycle: 2026 product remains in App Store Connect (cannot be deleted while having any historical purchases) but is marked "Removed from Sale" or similar status to prevent new purchases

### Known scope (out)
- Auto-rolling subscription for the calendar (not the chosen model; calendar is intentionally a yearly one-time purchase)
- Migration of 2026 purchasers to 2027 for free (not in current business model; could be revisited as a retention play)

### Pre-conditions for specification
- Phase 0 Track A flow re-validated (no new D-U-N-S issues, banking still Clear)
- Sales data from 2026 calendar reviewed to inform 2027 pricing and positioning
- Q3 2026 retrospective on whether the calendar product justified the annual rollover overhead vs simpler alternatives (e.g., calendar included free in premium)

### Specification timing

Spec this phase in October 2026. By then:
- Real 2026 sales data informs pricing
- 2026 user feedback informs content strategy for 2027
- Apple/RevenueCat tooling may have evolved (e.g., RC may have added native support for "annual rollover" patterns)
- The 2026 product has been in production for 6+ months, surfacing any unknown-unknowns about the annual model

### Risks / open questions

1. Whether to maintain the annual rollover model or pivot to a different calendar offering (free-with-premium, perpetual access, monthly mini-calendars). Decision deferred.

2. Migration UX for existing 2026 purchasers when 2027 launches. Recommendation: a one-tap "Get the 2027 Calendar" upsell in the existing Calendar screen for prior purchasers, with the 2026 content remaining accessible.

3. Timing of the 2027 launch relative to calendar usefulness. Optimal launch is mid-November 2026 (allows December buyers to start using for 2027 immediately) — but this means Phase 6 specification needs to happen no later than late September 2026.

---

## Cross-cutting concerns

These are not phases but surface in multiple phases. Will be specified inline where they apply:

- **Analytics events** — what to track on every paywall view, purchase attempt, purchase success, cap hit, boost pack purchase. Standard parameter names across all events.
- **Error states** — network failures, RevenueCat sync failures, expired entitlements, refund-triggered downgrades.
- **Localization** — paywall copy, subscription disclosure language. v1 ships English only; spec the i18n hooks for future without implementing translations.
- **Accessibility** — paywall screen must meet WCAG AA for the launch markets. Specifying contrast and tap-target requirements at paywall design phase.

---

## Implementation order (subject to refinement during per-phase specification)

The order below is provisional. Each phase's pre-conditions during specification may force reordering. Do not start any phase until its pre-conditions are met AND its status is READY FOR IMPLEMENTATION.

1. Phase 0 — Account & Infrastructure Prerequisites
2. Phase 1 — Backend Cap Correction & Credit Infrastructure
3. Phase 2 — Mobile Monetization UI
4. Phase 3 — IAP Purchase Flows
5. Phase 4 — Subscription Management UI
6. Phase 5 — App Store Review Preparation
7. Phase 6 — Calendar Year Rollover (deferred to late 2026)

---

## Change log

Append-only record of plan updates. Every time a phase moves from PENDING SPECIFICATION to READY FOR IMPLEMENTATION, append an entry here with date and one-line summary.

| Date | Phase | Change |
|---|---|---|
| 2026-05-14 | All | Initial skeleton created |
| 2026-05-14 | 0 | Specified and marked READY FOR IMPLEMENTATION |
| 2026-05-14 | (spec) | MONETIZATION_SPEC_V4.md Section 6 corrected: consumables removed from entitlements per RevenueCat best practice |
| 2026-05-14 | 1 | Specified and marked READY FOR IMPLEMENTATION |
| 2026-05-14 | structure | Merged old Phase 2 (gating) and old Phase 3 (paywall) into new single Phase 2 (mobile monetization UI); renumbered Phases 4–7 down to 3–6 |
| 2026-05-14 | 2 | Specified and marked READY FOR IMPLEMENTATION |
| 2026-05-14 | 3 | Specified and marked READY FOR IMPLEMENTATION |
| 2026-05-14 | 4 | Specified and marked READY FOR IMPLEMENTATION |
| 2026-05-14 | 5 | Specified and marked READY FOR IMPLEMENTATION |
| 2026-05-14 | 6 | Skeleton specified; full spec deferred to Q4 2026 |
| 2026-05-14 | 0 Track C | Supabase migrations executed; user_credits, credit_transactions, three RPC functions live in scvjjbgejmkomyciabex |
| 2026-05-14 | 1 | All 7 steps shipped; tsc clean; RPCs verified via 6 manual tests |
| 2026-05-14 | 2 (partial) | Steps 2.1–2.9 shipped; Steps 2.10–2.11 pending |
| 2026-05-14 | 2 | Steps 2.10–2.11 shipped; Phase 2 complete on component layer |
