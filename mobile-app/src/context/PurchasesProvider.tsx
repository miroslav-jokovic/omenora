import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'
import * as Sentry from '@sentry/react-native'
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type MakePurchaseResult,
  type PurchasesError,
  type PurchasesOffering,
  type PurchasesPackage,
  type PurchasesStoreProduct,
} from 'react-native-purchases'
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui'
import { useAuth } from './useAuth'
import { PurchasesContext } from './PurchasesContext'
import { CustomPaywall } from '../components/organisms/CustomPaywall'
import { deriveEntitlements } from '../lib/entitlements'
import { track } from '../lib/analytics'
import { Toast } from '../components/molecules'

interface Props {
  children: React.ReactNode
}

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
  const [paywallVisible, setPaywallVisible] = useState(false)
  const [paywallSource, setPaywallSource] = useState<string | undefined>(undefined)
  const [premiumToastVisible, setPremiumToastVisible] = useState(false)
  const paywallResolver = useRef<((result: PAYWALL_RESULT) => void) | null>(null)

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
        Sentry.captureException(err, { tags: { flow: 'purchases_init' } })
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
        Sentry.captureException(err, { tags: { flow: 'purchases_login' } })
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

  const presentPaywall = useCallback((source?: string): Promise<PAYWALL_RESULT> => {
    return new Promise<PAYWALL_RESULT>((resolve) => {
      paywallResolver.current = resolve
      setPaywallSource(source)
      setPaywallVisible(true)
      track('paywall_viewed', { source: source ?? 'unknown' })
    })
  }, [])

  const handlePaywallPurchased = useCallback(() => {
    setPaywallVisible(false)
    setPremiumToastVisible(true)
    paywallResolver.current?.(PAYWALL_RESULT.PURCHASED)
    paywallResolver.current = null
  }, [])

  const handlePaywallClose = useCallback(() => {
    setPaywallVisible(false)
    track('paywall_dismissed', { source: paywallSource ?? 'unknown' })
    paywallResolver.current?.(PAYWALL_RESULT.CANCELLED)
    paywallResolver.current = null
  }, [paywallSource])

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

  const purchaseSubscription = useCallback(async (pkg: PurchasesPackage): Promise<MakePurchaseResult> => {
    const result = await Purchases.purchasePackage(pkg)
    await refreshCustomerInfo()
    return result
  }, [refreshCustomerInfo])

  const presentCustomerCenter = useCallback(async (): Promise<void> => {
    await RevenueCatUI.presentCustomerCenter()
  }, [])

  const presentPaywallIfNeeded = useCallback((_entitlement = 'premium'): Promise<PAYWALL_RESULT> => {
    const alreadyPremium = customerInfo?.entitlements?.active?.['premium'] !== undefined
    if (alreadyPremium) return Promise.resolve(PAYWALL_RESULT.NOT_PRESENTED)
    return presentPaywall()
  }, [customerInfo, presentPaywall])

  const { isPremium, hasCalendar } = deriveEntitlements(customerInfo)

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
        purchaseSubscription,
        purchaseBoostPack,
        purchaseCompatibilitySingle,
        presentCustomerCenter,
      }}
    >
      {children}
      <CustomPaywall
        visible={paywallVisible}
        source={paywallSource}
        onClose={handlePaywallClose}
        onPurchased={handlePaywallPurchased}
      />
      <Toast
        variant="success"
        message="Welcome to Premium"
        visible={premiumToastVisible}
        onDismiss={() => setPremiumToastVisible(false)}
      />
    </PurchasesContext.Provider>
  )
}
