# OMENORA — Product Map

> Catalog of every product, SKU, funnel surface, and price OMENORA has, with current status against the locked strategy.
> Single source of truth for what we sell, where, and at what price.
> When this document and code conflict, code must be brought into alignment with this document.
> Strategic decisions trace back to STRATEGY.md. This document is the operational instantiation of strategy.

---

## Status legend

- **LIVE** — Built, deployed, accepting users / payments today.
- **PRE-LAUNCH** — Infrastructure built or partially built, not yet exposed to users. Will go live in a future phase.
- **DEPRECATED** — Exists in codebase but no longer aligned with locked strategy. Candidate for cleanup in DEPRECATED.md.

---

## 1. Mobile — Subscriptions

Platform: iOS mobile app (Android disabled in current build). RevenueCat-managed. Entitlement gate: `premium`.

| Product ID | Price | Billing | Trial | Status |
|---|---|---|---|---|
| `omenora_weekly` | $5.99 | Weekly | None (hard paywall) | **PRE-LAUNCH** |
| `omenora_monthly` | $14.99 | Monthly | None (hard paywall) | **PRE-LAUNCH** |
| `omenora_annual` | $99.99 | Annual | None (hard paywall) | **PRE-LAUNCH** |

### Premium-included features (per subscription)

| Feature | Cap |
|---|---|
| Full Archetype Reading | 1 / month |
| Complete Natal Chart Reading | 1 / month |
| 90-Day Forecast Reading | 4 / month |
| Compatibility Reading | 10 / month |
| Counsel Chat conversations | 30 / month |
| Daily horoscope (zodiac) | Unlimited |
| Daily archetype insight | Unlimited |
| Tradition switching (Western / Vedic / BaZi / Tarot) | Unlimited |
| Today / Readings / Counsel full screen access | Yes |

### Implementation status

- RevenueCat SDK initialized via `PurchasesProvider` (mobile-app)
- `isPremium` derived from `customerInfo.entitlements.active['premium']`
- `purchasePackage()` call is **not yet implemented** — paywall UI exists, purchase invocation does not
- Products configured in RevenueCat dashboard, not hardcoded in source
- **No free trial on any plan.** Hard paywall configuration per Adapty SOIS 2026 Lifestyle benchmarks (trial users in this category generate 21.2% lower LTV than direct buyers — the only category in the report where trials reduce LTV)

---

## 2. Mobile — One-Time Purchases (IAPs)

| Product ID | Price | Description | Audience | Status |
|---|---|---|---|---|
| `omenora_calendar_2026` | $4.99 | Annual Lucky Timing Calendar | Free + Premium | **PRE-LAUNCH** |
| `omenora_compatibility_single` | $4.99 | Single Compatibility Reading | Free users only | **PRE-LAUNCH** |

### Notes

- `omenora_calendar_2026` requires annual content refresh — swap to `omenora_calendar_2027` in early 2027
- `omenora_compatibility_single` is the mobile-side instantiation of the same $4.99 compatibility one-time sold on web today (see Section 4)
- IAPs serve as immediate post-paywall upsells in the Nebula playbook

---

## 3. Mobile — Counsel Boost Packs (Credits)

| Product ID | Price | Conversations Added | Per-Conv Retail | Status |
|---|---|---|---|---|
| `omenora_counsel_spark` | $1.99 | +5 | $0.400 | **PRE-LAUNCH** |
| `omenora_counsel_insight` | $4.99 | +15 | $0.333 | **PRE-LAUNCH** |
| `omenora_counsel_ascend` | $9.99 | +35 | $0.286 | **PRE-LAUNCH** |

### Boost Pack rules

| Rule | Value |
|---|---|
| Eligibility | Both Free and Premium users |
| Credit expiration | None (perpetual) |
| Usage order for Premium users | Base monthly allowance burns first, boost credits second |
| Conversation definition | Up to 20 messages per conversation |

### Implementation status

- Stripe webhook credit-grant logic exists at `augur/server/api/stripe/webhook.post.ts` (lines ~77–82 and 748)
- Branches handle `counsel_boost_spark`, `counsel_boost_insight`, `counsel_boost_ascend` → `grantCredits()` 
- **No purchase endpoints exist** for Counsel Boost Packs on web — and none should be created. Counsel is mobile-only per STRATEGY.md §7 and §8.
- Mobile purchase invocation pending RevenueCat integration
- **Counsel is mobile-only.** The webhook credit-grant branches exist for future mobile→backend sync only. Web must not surface Counsel UI, paywall, purchase, or marketing copy.

---

## 4. Web — Active Products and Funnels

Platform: omenora.com (Nuxt 3). Stripe-managed.

### 4.1 Founding Member Deposit — primary pre-launch conversion target

| Field | Value |
|---|---|
| Status | **LIVE** |
| Price | $20 one-time |
| Stripe Product ID | `prod_UY0Gy2qVuKJA4S` |
| Stripe Price ID | `price_1TYuFlDebD8pElyX90pX4jbc` |
| Env var | `NUXT_STRIPE_FOUNDING_PRICE_ID` |
| Endpoint | `POST /api/founding/create-checkout` |
| Webhook branch | `metadata.type === 'founding_member'` |
| Surface page | `/founding` |
| Reward | 50% off Premium subscription for life — applies to any plan (Weekly $2.99/wk, Monthly $7.50/mo, or Annual $49.99/yr). Founder selects plan at launch and may switch between plans while founding status persists. |
| Lifecycle | Closes when Premium launches to App Store at scale |

### 4.2 Single Compatibility Reading — web tripwire

| Field | Value |
|---|---|
| Status | **LIVE** |
| Price | $4.99 one-time |
| Stripe handling | Inline `price_data` (no Stripe Price object) |
| Endpoint | `POST /api/create-compatibility-payment` |
| Webhook branches | `metadata.type === 'compatibility'` (fulfillment), `metadata.type === 'compat_credit'` (credit grant) |
| Surface page | `/compatibility` (preview/paywall mode) |
| Funnel | Entered via `/compatibility-quiz` |
| Role per locked strategy | Primary paywall product on compatibility funnel; Founding Member link replaces the Premium upsell slot |

### 4.3 Web acquisition funnels (no SKU — funnel-only surfaces)

| Page | Status | Role | Quiz length | Drives to |
|---|---|---|---|---|
| `/compatibility-quiz` | **LIVE** | Compatibility / love-path hook funnel | Current implementation collects user + partner birth data + relationship goal + email | `/compatibility` paywall ($4.99) + Founding upsell |
| `/discover` | **PRE-LAUNCH** | Archetype / identity hook funnel | Planned 25-question Nebula-pattern sequence | Subscription paywall (post-launch) or Founding (pre-launch) |
| `/analysis` | **LIVE** (legacy archetype funnel) | Free archetype preview funnel | Collects name, DOB, city, archetype, tradition, time-of-birth | `/preview` paywall |
| `/preview` | **LIVE** | Paywall after `/analysis` quiz | — | Primary CTA: `/founding` ($20). Secondary: `/subscribe` |

### 4.4 Free trust surface (no funnel, no paywall, no email capture)

| Page | Status | Content | Role |
|---|---|---|---|
| `/daily` | **LIVE** | Daily zodiac horoscope (12 signs, Love/Work/Health). Generated daily at 6am UTC via Railway cron. Cached in `daily_zodiac_cache`. | Brand trust + SEO + organic traffic surface. No paywall, no email capture, no subscription CTA. |

---

## 5. Backend Caps (margin protection)

Backend-enforced caps on Premium subscription scope. These exist to protect unit economics against power-user abuse.

| Endpoint | Cap | Period |
|---|---|---|
| `/api/reports/archetype` | 1 | per calendar month |
| `/api/reports/natal-chart` | 1 | per calendar month |
| `/api/reports/forecast` | 4 | per calendar month |
| `/api/generate-compatibility` | 10 | per calendar month |
| `/api/counsel/message` | 30 | per calendar month |

**Reset day:** First day of billing cycle for subscribers, first day of calendar month for free users.

### Critical correction pending

The Counsel cap is enforced as **30/month** in `augur/server/utils/entitlements.ts` 
(`counsel: { cap: 30, period: 'monthly' }`, verified 2026-06-09) — matching the locked
spec. No fix is outstanding. (Earlier drafts of this doc described a 30/day bug; that is
resolved.)

---

## 6. Deprecated — Web SKUs and surfaces to retire

All items listed below conflict with locked strategy (STRATEGY.md section 8). They exist in code today but must be retired during cleanup. Tracked in detail in DEPRECATED.md.

### 6.1 One-time products

| Product | Price | Status | Endpoint | Webhook branch |
|---|---|---|---|---|
| Destiny Report — Basic | $4.99 | **DEPRECATED** — eliminated per strategy | `POST /api/create-payment` | `metadata.type === 'report'` |
| Most Popular Bundle (Report + Calendar) | $9.99 | **DEPRECATED** — bundles eliminated per strategy | `POST /api/create-bundle-payment` | `metadata.type === 'bundle'` (via `isBundlePurchase` flag) |
| Full Oracle Bundle (Report + Cal + Birth Chart + traditions) | $24.99 | **DEPRECATED** — bundles eliminated per strategy | `POST /api/create-oracle-payment` | `metadata.type === 'oracle'` (via `isOraclePurchase` flag) |
| Standalone Birth Chart | $4.99 | **DEPRECATED** — folded into Premium | `POST /api/create-birth-chart-payment` | Default report path |
| Standalone Calendar (web) | $4.99 | **DEPRECATED on web** — moved to mobile IAP only | `POST /api/create-calendar-payment` | `metadata.type === 'calendar_2026'` |
| Tradition Switch | $2.99 | **DEPRECATED** — folded into Premium unlimited | `POST /api/create-tradition-payment` | No dedicated webhook branch (orphan endpoint) |

### 6.2 Subscriptions

| Product | Stripe Price ID | Env var | Status | Reason |
|---|---|---|---|---|
| Daily Horoscope Subscription | `price_1TKON6Du5bXWvSPjjieU5bEj` | `NUXT_STRIPE_DAILY_PRICE_ID` | **DEPRECATED** | Superseded by `omenora_monthly` $14.99. Code comment in `nuxt.config.ts:53`. |
| Compatibility Plus Subscription | `price_1TQRxoDebD8pElyXxRkkK7E1` | `NUXT_STRIPE_COMPAT_PLUS_PRICE_ID` | **DEPRECATED** | Removed in Phase 2 per `.env.example:17–18`. Plan type `compatibility_plus` referenced in `save-subscriber.post.ts:16` and `send-weekly-transits.post.ts:41` — to remove. |
| Compatibility Single (Stripe Price object) | `price_1TQRzVDebD8pElyXeIeVem6b` | `NUXT_STRIPE_COMPAT_SINGLE_PRICE_ID` | **SUPERSEDED** | Active compatibility flow uses inline `price_data`. Env var unused. |

### 6.3 Misaligned UI strings

| Item | Location | Issue |
|---|---|---|
| `$6.99/mo` subscription display | `app/pages/daily.vue:344`, `app/pages/report.vue:515` | Off-strategy. Locked price is $14.99/mo. |
| `$6.99` subscription pixel-track | `app/pages/subscription.vue:114` | Same issue. |
| `$12.99` "Also included in Full Oracle" label | (removed) | RESOLVED 2026-06-09 — the orphaned label no longer exists in `mobile-app/src` (grep for "12.99" / "Full Oracle" returns nothing). |

---

## 7. Configuration gaps (not deprecation — pre-launch wiring required)

These are **not deprecated**. They are pre-launch infrastructure that requires configuration before subscription can go live.

| Item | Issue | Required action |
|---|---|---|
| `NUXT_STRIPE_PREMIUM_WEEKLY_PRICE_ID` | Missing from `.env` | Create Stripe Price object for `omenora_weekly` $5.99/wk, populate env var in Railway production |
| `NUXT_STRIPE_PREMIUM_MONTHLY_PRICE_ID` | Missing from `.env` | Create Stripe Price object for `omenora_monthly` $14.99/mo, populate env var in Railway production |
| `NUXT_STRIPE_PREMIUM_YEARLY_PRICE_ID` | Missing from `.env` | Create Stripe Price object for `omenora_annual` $99.99/yr, populate env var in Railway production |
| `POST /api/create-subscription` | Returns 503 without price IDs configured | Will be functional once above env vars are set |
| Mobile `purchasePackage()` invocation | Not yet implemented in `src/` | Required before any mobile subscription can be purchased |

---

## 8. Product surface summary table

A single-glance reference. Every product or surface OMENORA has, at one level of detail per row.

| Platform | Product / Surface | Price | Status | Strategic role |
|---|---|---|---|---|
| Mobile | Premium Weekly (`omenora_weekly`) | $5.99/wk | PRE-LAUNCH | Entry-tier post-launch revenue |
| Mobile | Premium Monthly (`omenora_monthly`) | $14.99/mo | PRE-LAUNCH | Mid-tier post-launch revenue |
| Mobile | Premium Annual (`omenora_annual`) | $99.99/yr | PRE-LAUNCH | Anchor-tier post-launch revenue |
| Mobile | Calendar 2026 IAP | $4.99 | PRE-LAUNCH | Recurring-annual one-time |
| Mobile | Compatibility Single IAP | $4.99 | PRE-LAUNCH | Free-user tripwire |
| Mobile | Counsel Boost — Spark | $1.99 | PRE-LAUNCH | Expansion credit |
| Mobile | Counsel Boost — Insight | $4.99 | PRE-LAUNCH | Expansion credit |
| Mobile | Counsel Boost — Ascend | $9.99 | PRE-LAUNCH | Expansion credit |
| Web | Founding Member Deposit | $20 | LIVE | Pre-launch capital + traction signal |
| Web | Compatibility Single | $4.99 | LIVE | Compatibility funnel tripwire |
| Web | `/discover` funnel | — | PRE-LAUNCH | Archetype acquisition funnel |
| Web | `/compatibility-quiz` funnel | — | LIVE | Compatibility/love-path acquisition funnel |
| Web | `/daily` free zodiac | — | LIVE | Trust + SEO surface |
| Web | Destiny Report | $4.99 | DEPRECATED | Eliminated per strategy |
| Web | Most Popular Bundle | $9.99 | DEPRECATED | Bundles eliminated |
| Web | Full Oracle Bundle | $24.99 | DEPRECATED | Bundles eliminated |
| Web | Standalone Birth Chart | $4.99 | DEPRECATED | Folded into Premium |
| Web | Standalone Calendar | $4.99 | DEPRECATED on web | Moved to mobile IAP |
| Web | Tradition Switch | $2.99 | DEPRECATED | Folded into Premium |
| Web | Daily Horoscope Subscription | (legacy) | DEPRECATED | Superseded by $14.99 mobile sub |
| Web | Compatibility Plus Subscription | (legacy) | DEPRECATED | Removed Phase 2 |

---

*This document is the operational product catalog. It updates only when a strategic decision in STRATEGY.md changes, or when a SKU's implementation status materially changes (LIVE ↔ PRE-LAUNCH ↔ DEPRECATED).*

*Last decision update: 2026-05-26 — subscription locked to 3-plan structure (weekly $5.99 / monthly $14.99 / annual $99.99), all hard paywall no trial. Source: Adapty State of In-App Subscriptions 2026, RevenueCat State of Subscription Apps 2026.*
