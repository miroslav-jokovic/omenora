import { createContext } from 'react'
import type { CustomerInfo, MakePurchaseResult, PurchasesOffering, PurchasesStoreProduct } from 'react-native-purchases'
import { PAYWALL_RESULT } from 'react-native-purchases-ui'

export interface PurchasesContextValue {
  isReady: boolean
  isPremium: boolean
  hasCalendar: boolean   // isPremium OR has omenora_calendar_2026 non-sub transaction
  customerInfo: CustomerInfo | null
  currentOffering: PurchasesOffering | null
  calendarProduct: PurchasesStoreProduct | null
  boostPacksOffering: PurchasesOffering | null
  compatibilityAddonOffering: PurchasesOffering | null
  refreshCustomerInfo: () => Promise<void>
  presentPaywall: () => Promise<PAYWALL_RESULT>
  presentPaywallIfNeeded: (entitlement?: string) => Promise<PAYWALL_RESULT>
  purchaseCalendar: () => Promise<MakePurchaseResult>
  restorePurchases: () => Promise<CustomerInfo>
  purchaseBoostPack: (packageIdentifier: 'spark' | 'insight' | 'ascend') => Promise<MakePurchaseResult>
  purchaseCompatibilitySingle: () => Promise<MakePurchaseResult>
  presentCustomerCenter: () => Promise<void>
}

export const PurchasesContext = createContext<PurchasesContextValue>({
  isReady: false,
  isPremium: false,
  hasCalendar: false,
  customerInfo: null,
  currentOffering: null,
  calendarProduct: null,
  boostPacksOffering: null,
  compatibilityAddonOffering: null,
  refreshCustomerInfo: async () => {},
  presentPaywall: async () => PAYWALL_RESULT.ERROR,
  presentPaywallIfNeeded: async () => PAYWALL_RESULT.ERROR,
  purchaseCalendar: () => Promise.reject(new Error('PurchasesProvider not mounted')),
  restorePurchases: () => Promise.reject(new Error('PurchasesProvider not mounted')),
  purchaseBoostPack: () => Promise.reject(new Error('PurchasesProvider not mounted')),
  purchaseCompatibilitySingle: () => Promise.reject(new Error('PurchasesProvider not mounted')),
  presentCustomerCenter: async () => {},
})
