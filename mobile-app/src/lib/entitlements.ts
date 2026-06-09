import type { CustomerInfo } from 'react-native-purchases'

export const PREMIUM_ENTITLEMENT_ID = 'premium'
export const CALENDAR_PRODUCT_ID = 'omenora_calendar_2026'

export interface DerivedEntitlements {
  isPremium: boolean
  hasCalendar: boolean
}

/**
 * Pure derivation of OMENORA entitlements from a RevenueCat CustomerInfo.
 * - isPremium: the 'premium' entitlement is active.
 * - hasCalendar: premium (calendar is included) OR a non-subscription purchase of
 *   the 2026 calendar product.
 */
export function deriveEntitlements(customerInfo: CustomerInfo | null): DerivedEntitlements {
  const isPremium =
    customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID] !== undefined
  const hasCalendar =
    isPremium ||
    (customerInfo?.nonSubscriptionTransactions?.some(
      (t) => t.productIdentifier === CALENDAR_PRODUCT_ID,
    ) ?? false)
  return { isPremium, hasCalendar }
}
