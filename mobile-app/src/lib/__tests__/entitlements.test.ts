import type { CustomerInfo } from 'react-native-purchases'
import { deriveEntitlements } from '../entitlements'

const make = (over: Partial<CustomerInfo>): CustomerInfo => over as CustomerInfo

describe('deriveEntitlements', () => {
  it('free user with no entitlement and no calendar txn', () => {
    const info = make({ entitlements: { active: {} } as CustomerInfo['entitlements'], nonSubscriptionTransactions: [] })
    expect(deriveEntitlements(info)).toEqual({ isPremium: false, hasCalendar: false })
  })
  it('premium user is premium and has calendar', () => {
    const info = make({ entitlements: { active: { premium: {} } } as unknown as CustomerInfo['entitlements'], nonSubscriptionTransactions: [] })
    expect(deriveEntitlements(info)).toEqual({ isPremium: true, hasCalendar: true })
  })
  it('free user with the calendar IAP has calendar but not premium', () => {
    const info = make({
      entitlements: { active: {} } as CustomerInfo['entitlements'],
      nonSubscriptionTransactions: [{ productIdentifier: 'omenora_calendar_2026' }] as unknown as CustomerInfo['nonSubscriptionTransactions'],
    })
    expect(deriveEntitlements(info)).toEqual({ isPremium: false, hasCalendar: true })
  })
  it('null customerInfo yields all false', () => {
    expect(deriveEntitlements(null)).toEqual({ isPremium: false, hasCalendar: false })
  })
})
