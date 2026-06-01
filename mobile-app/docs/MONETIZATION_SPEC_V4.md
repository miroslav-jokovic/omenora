# OMENORA Monetization Spec v4 (LOCKED)

**Last updated:** 2026-05-15  
**Status:** Locked. Source of truth for all RevenueCat product creation, backend gating logic, and pricing UI.

---

## 1. Subscriptions

| Product ID | Price | Billing |
|---|---|---|
| `omenora_monthly` | $14.99 | Monthly |
| `omenora_annual` | $99.99 | Annual |

**Trial:** 7-day free trial on both plans.

### Included in Premium

| Feature | Cap |
|---|---|
| Full Archetype Reading | 1 / month |
| Complete Natal Chart Reading | 1 / month |
| 90-Day Forecast Reading | 4 / month |
| Compatibility Reading | 10 / month |
| Counsel Chat conversations | 30 / month |
| Daily horoscope (zodiac) | Unlimited |
| Daily archetype insight | Unlimited |
| 2026 Lucky Timing Calendar | Included (refreshes annually) |
| Tradition switching (Western / Vedic / BaZi / Tarot) | Unlimited |
| Today / Readings / Counsel full screen access | Yes |

---

## 2. One-Time Purchases (IAPs)

| Product ID | Price | Description | Audience |
|---|---|---|---|
| `omenora_calendar_2026` | $4.99 | 2026 Lucky Timing Calendar | Free users only |
| `omenora_compatibility_single` | $4.99 | Single compatibility reading | Free users only |

**Notes:**
- `omenora_calendar_2026` requires annual content refresh — swap to `omenora_calendar_2027` in early 2027.
- Premium subscribers receive the calendar automatically as part of their subscription. The $4.99 IAP is a standalone path for free users only.
- No standalone Birth Chart, Destiny Report, or Bundle products on mobile. These are duplicated by Premium subscription scope.
- Tradition switching included unlimited in Premium — no separate IAP.

---

## 3. Counsel Boost Packs (Credits)

| Product ID | Price | Conversations Added | Per-Conv Retail |
|---|---|---|---|
| `omenora_counsel_spark` | $1.99 | +5 | $0.400 |
| `omenora_counsel_insight` | $4.99 | +15 | $0.333 |
| `omenora_counsel_ascend` | $9.99 | +35 | $0.286 |

### Boost Pack Rules

| Rule | Value |
|---|---|
| Eligibility | Both Free and Premium users |
| Credit expiration | None (perpetual) |
| Usage order for Premium users | Base monthly allowance burns first, boost credits second |
| Conversation definition | Up to 20 messages per conversation |

---

## 4. Backend Cap Reference

| Endpoint | Cap | Period |
|---|---|---|
| `/api/reports/archetype` | 1 | per calendar month |
| `/api/reports/natal-chart` | 1 | per calendar month |
| `/api/reports/forecast` | 4 | per calendar month |
| `/api/generate-compatibility` | 10 | per calendar month |
| `/api/counsel/message` | 30 | per calendar month |

**Reset day:** First day of billing cycle for subscribers, first day of calendar month for free users.

---

## 5. Implementation Gates

| Gate | Status |
|---|---|
| Backend Counsel cap correction (currently 30/day → must be 30/month) | Pending |
| RevenueCat dashboard products (2 subscriptions + 2 IAPs + 3 boost packs) | Pending |
| Paywall UI | Pending |
| Boost pack purchase + credit tracking infrastructure | Pending |
| Free-user counsel access via boost packs (zero base allowance) | Pending |

---

## 6. RevenueCat Product Mapping

| Product ID | Type | Entitlement Key Granted | Credit Grant Mechanism |
|---|---|---|---|
| `omenora_monthly` | Auto-renewable subscription | `premium` | Entitlement-based (active while subscribed) |
| `omenora_annual` | Auto-renewable subscription | `premium` | Entitlement-based (active while subscribed) |
| `omenora_calendar_2026` | Non-consumable IAP | `calendar_2026` | Entitlement-based (permanent unlock) |
| `omenora_compatibility_single` | Consumable IAP | NONE | Backend ledger: +1 to `compat_credits` on `NON_RENEWING_PURCHASE` webhook |
| `omenora_counsel_spark` | Consumable IAP | NONE | Backend ledger: +5 to `counsel_credits` on `NON_RENEWING_PURCHASE` webhook |
| `omenora_counsel_insight` | Consumable IAP | NONE | Backend ledger: +15 to `counsel_credits` on `NON_RENEWING_PURCHASE` webhook |
| `omenora_counsel_ascend` | Consumable IAP | NONE | Backend ledger: +35 to `counsel_credits` on `NON_RENEWING_PURCHASE` webhook |

> **Note:** Premium subscribers gain calendar access via the `premium` entitlement (no separate purchase required). The `calendar_2026` entitlement key is granted only via direct IAP purchase by free users.

### Why consumables have no entitlement

Per RevenueCat documentation: attaching a consumable to an entitlement causes the entitlement to be reported as unlocked permanently after the first purchase. Consumable credit balances must be tracked in our own backend, with RevenueCat acting only as the purchase event source via `NON_RENEWING_PURCHASE` webhooks. Refunds are handled via `CANCELLATION` webhooks which trigger credit clawback in the same backend ledger.
