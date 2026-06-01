import React, { useCallback, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type MakePurchaseResult,
  type PurchasesError,
  type PurchasesOffering,
  type PurchasesStoreProduct,
} from 'react-native-purchases'
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui'
import { useAuth } from './useAuth'
import { PurchasesContext } from './PurchasesContext'

interface Props {
  children: React.ReactNode
}

const PREMIUM_ENTITLEMENT_ID = 'premium'

/**
 * RevenueCat provider.
 *
 * Initializes the SDK once on mount. Wires RC user identity to Supabase
 * auth: when the user signs in (anonymous → permanent), calls
 * Purchases.logIn(supabaseUserId). On sign out, calls Purchases.logOut.
 *
 * Exposes isPremium derived from the 'premium' entitlement on
 * customerInfo. Listens for customer info updates from RC.
 *
 * Test Store mode: the API key starts with `test_` — the SDK simulates
 * purchases via a modal instead of hitting the real App Store.
 */
export function PurchasesProvider({ children }: Props) {
  const { user, isAnonymous } = useAuth()
  const [isReady, setIsReady] = useState(false)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [currentOffering,           setCurrentOffering]           = useState<PurchasesOffering | null>(null)
  const [boostPacksOffering,         setBoostPacksOffering]         = useState<PurchasesOffering | null>(null)
  const [compatibilityAddonOffering, setCompatibilityAddonOffering] = useState<PurchasesOffering | null>(null)
  const [calendarProduct,            setCalendarProduct]            = useState<PurchasesStoreProduct | null>(null)

  // Initialize SDK once
  useEffect(() => {
    const initialize = async () => {
      try {
        const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS

        if (!apiKey) {
          console.warn('[Purchases] EXPO_PUBLIC_REVENUECAT_API_KEY_IOS not set — SDK disabled')
          setIsReady(true)
          return
        }

        if (Platform.OS !== 'ios') {
          console.warn('[Purchases] non-iOS platform — SDK disabled')
          setIsReady(true)
          return
        }

        // Verbose logging in dev only
        if (__DEV__) {
          await Purchases.setLogLevel(LOG_LEVEL.VERBOSE)
        }

        // Configure with no app user ID initially. logIn fires later on auth state.
        Purchases.configure({ apiKey })

        // Initial customer info fetch
        const info = await Purchases.getCustomerInfo()
        setCustomerInfo(info)

        // Fetch current offering
        try {
          const offerings = await Purchases.getOfferings()
          setCurrentOffering(offerings.current)
          setBoostPacksOffering(offerings.all['counsel_boosts'] ?? null)
          setCompatibilityAddonOffering(offerings.all['addons'] ?? null)
        } catch (offeringsErr) {
          console.warn('[Purchases] failed to fetch offerings:', offeringsErr)
        }

        // Subscribe to live updates
        Purchases.addCustomerInfoUpdateListener((updatedInfo) => {
          setCustomerInfo(updatedInfo)
        })

        setIsReady(true)
        console.log('[Purchases] SDK initialized')
      } catch (err: any) {
        const purchasesErr = err as PurchasesError
        console.error('[Purchases] init failed:', purchasesErr?.message ?? err)
        setIsReady(true) // Fail open — app should still work without purchases
      }
    }

    initialize()
  }, [])

  // Fetch calendar IAP product once SDK is ready (display-only — for localized priceString)
  useEffect(() => {
    if (!isReady) return
    let cancelled = false

    const fetchCalendarProduct = async () => {
      try {
        const products = await Purchases.getProducts(
          ['omenora_calendar_2026'],
          Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION,
        )
        if (!cancelled) {
          setCalendarProduct(products[0] ?? null)
          console.log('[Purchases] calendar product loaded:', products[0]?.priceString ?? 'not found')
        }
      } catch (err: any) {
        console.warn('[Purchases] failed to fetch calendar product:', err?.message ?? err)
      }
    }

    fetchCalendarProduct()
    return () => { cancelled = true }
  }, [isReady])

  // Sync RC user ID with Supabase auth state
  useEffect(() => {
    if (!isReady || !user) return

    const syncUserIdentity = async () => {
      try {
        if (isAnonymous) {
          // Anonymous Supabase user — let RC use its own anonymous ID
          // (don't call logIn for anonymous Supabase users)
          return
        }

        // Permanent user — log in with Supabase user ID
        const { customerInfo: updatedInfo } = await Purchases.logIn(user.id)
        setCustomerInfo(updatedInfo)
        console.log('[Purchases] logged in as:', user.id)

        // Refresh offerings after login (entitlements may differ per user)
        try {
          const offerings = await Purchases.getOfferings()
          setCurrentOffering(offerings.current)
          setBoostPacksOffering(offerings.all['counsel_boosts'] ?? null)
          setCompatibilityAddonOffering(offerings.all['addons'] ?? null)
        } catch (offeringsErr) {
          console.warn('[Purchases] failed to fetch offerings after logIn:', offeringsErr)
        }
      } catch (err: any) {
        console.error('[Purchases] logIn failed:', err?.message ?? err)
      }
    }

    syncUserIdentity()
  }, [isReady, user?.id, isAnonymous])

  const refreshCustomerInfo = useCallback(async () => {
    try {
      const info = await Purchases.getCustomerInfo()
      setCustomerInfo(info)
    } catch (err: any) {
      console.error('[Purchases] refresh failed:', err?.message ?? err)
    }
  }, [])

  const presentPaywall = useCallback(async (): Promise<PAYWALL_RESULT> => {
    try {
      const result = await RevenueCatUI.presentPaywall()
      console.log('[Purchases] paywall result:', result)
      return result
    } catch (e) {
      console.error('[Purchases] paywall error:', e)
      return PAYWALL_RESULT.ERROR
    }
  }, [])

  const purchaseBoostPack = useCallback(async (packageIdentifier: 'spark' | 'insight' | 'ascend'): Promise<MakePurchaseResult> => {
    if (!boostPacksOffering) {
      throw new Error('Counsel boost packs are not available. Please try again in a moment, or contact support@omenora.com if this persists.')
    }
    const pkg = boostPacksOffering.availablePackages.find(p => p.identifier === packageIdentifier)
    if (!pkg) {
      throw new Error(`Boost pack "${packageIdentifier}" not found in the current offering. Please contact support@omenora.com.`)
    }
    const result = await Purchases.purchasePackage(pkg)
    await refreshCustomerInfo()
    return result
  }, [boostPacksOffering, refreshCustomerInfo])

  const purchaseCompatibilitySingle = useCallback(async (): Promise<MakePurchaseResult> => {
    if (!compatibilityAddonOffering) {
      throw new Error('Single compatibility reading is not available. Please try again in a moment, or contact support@omenora.com if this persists.')
    }
    const pkg = compatibilityAddonOffering.availablePackages.find(
      p => p.product.identifier === 'omenora_compatibility_single'
    )
    if (!pkg) {
      throw new Error('Single compatibility reading product not found in the addons offering. Please contact support@omenora.com.')
    }
    const result = await Purchases.purchasePackage(pkg)
    await refreshCustomerInfo()
    return result
  }, [compatibilityAddonOffering, refreshCustomerInfo])

  const purchaseCalendar = useCallback(async (): Promise<MakePurchaseResult> => {
    const products = await Purchases.getProducts(
      ['omenora_calendar_2026'],
      Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    )
    if (products.length === 0) {
      throw new Error(
        'omenora_calendar_2026 not available — verify product is configured in App Store Connect / Play Console and linked to the RevenueCat project.',
      )
    }
    const result = await Purchases.purchaseStoreProduct(products[0])
    await refreshCustomerInfo()
    return result
  }, [refreshCustomerInfo])

  const restorePurchases = useCallback(async (): Promise<CustomerInfo> => {
    const restored = await Purchases.restorePurchases()
    await refreshCustomerInfo()
    return restored
  }, [refreshCustomerInfo])

  const presentCustomerCenter = useCallback(async (): Promise<void> => {
    await RevenueCatUI.presentCustomerCenter()
  }, [])

  const presentPaywallIfNeeded = useCallback(async (entitlement = 'premium'): Promise<PAYWALL_RESULT> => {
    try {
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: entitlement,
      })
      console.log('[Purchases] paywallIfNeeded result:', result)
      return result
    } catch (e) {
      console.error('[Purchases] paywallIfNeeded error:', e)
      return PAYWALL_RESULT.ERROR
    }
  }, [])

  const isPremium =
    customerInfo?.entitlements?.active?.[PREMIUM_ENTITLEMENT_ID] !== undefined

  const hasCalendar = isPremium || (
    customerInfo?.nonSubscriptionTransactions?.some(
      t => t.productIdentifier === 'omenora_calendar_2026'
    ) ?? false
  )

  return (
    <PurchasesContext.Provider
      value={{
        isReady,
        isPremium,
        hasCalendar,
        customerInfo,
        currentOffering,
        calendarProduct,
        boostPacksOffering,
        compatibilityAddonOffering,
        refreshCustomerInfo,
        presentPaywall,
        presentPaywallIfNeeded,
        purchaseCalendar,
        restorePurchases,
        purchaseBoostPack,
        purchaseCompatibilitySingle,
        presentCustomerCenter,
      }}
    >
      {children}
    </PurchasesContext.Provider>
  )
}
