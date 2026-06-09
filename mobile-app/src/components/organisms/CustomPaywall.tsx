import React, { useState } from 'react'
import { Modal, View, Pressable, StyleSheet } from 'react-native'
import * as Sentry from '@sentry/react-native'
import type { PurchasesPackage } from 'react-native-purchases'
import { Text, Button, EditorialBenefit } from '../atoms'
import { PaywallShell } from '../templates'
import { usePurchases } from '../../context/usePurchases'
import { track } from '../../lib/analytics'
import { useProfileStore } from '../../stores/profileStore'
import { navigationRef } from '../../navigation/RootNavigator'
import { tokens, space, radius } from '../../design/tokens'

// Fallback prices — shown ONLY until the live RC offering loads (e.g. before App
// Store Connect metadata is approved). Live product.priceString always wins.
// ⚠️ FOUNDER: confirm the weekly value before release. Monthly/annual are from the spec.
const FALLBACK_PRICE: Record<PlanKey, string> = {
  weekly:  '$6.99',
  monthly: '$14.99',
  annual:  '$99.99',
}

type PlanKey = 'weekly' | 'monthly' | 'annual'

const PLAN_META: { key: PlanKey; label: string; cadence: string; badge?: string }[] = [
  { key: 'annual',  label: 'Annual',  cadence: 'per year',  badge: 'BEST VALUE' },
  { key: 'monthly', label: 'Monthly', cadence: 'per month' },
  { key: 'weekly',  label: 'Weekly',  cadence: 'per week' },
]

export interface CustomPaywallProps {
  visible: boolean
  onClose: () => void
  onPurchased?: () => void
  source?: string
}

export const CustomPaywall: React.FC<CustomPaywallProps> = ({ visible, onClose, onPurchased, source }) => {
  const { currentOffering, purchaseSubscription, restorePurchases } = usePurchases()
  const archetype = useProfileStore((s) => s.archetype)

  const [selected, setSelected] = useState<PlanKey>('annual')
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const archetypeName =
    archetype != null && archetype.length > 0
      ? `The ${archetype.charAt(0).toUpperCase()}${archetype.slice(1)}` 
      : 'your full chart'

  const packageFor = (key: PlanKey): PurchasesPackage | null => {
    if (!currentOffering) return null
    if (key === 'annual') return currentOffering.annual
    if (key === 'monthly') return currentOffering.monthly
    return currentOffering.weekly
  }

  const priceFor = (key: PlanKey): string =>
    packageFor(key)?.product.priceString ?? FALLBACK_PRICE[key]

  const isDisabled = isPurchasing || isRestoring

  const openLegal = (route: 'Terms' | 'Privacy') => {
    onClose()
    if (navigationRef.isReady()) navigationRef.navigate(route)
  }

  const handleContinue = async () => {
    const pkg = packageFor(selected)
    if (!pkg) {
      setError("This plan isn't available right now. Please try again in a moment.")
      return
    }
    setIsPurchasing(true)
    setError(null)
    try {
      await purchaseSubscription(pkg)
      track('subscription_purchase_succeeded', { plan: selected, source: source ?? 'unknown' })
      onPurchased?.()
      onClose()
    } catch (err) {
      const e = err as { userCancelled?: boolean; message?: string }
      if (!e.userCancelled) {
        Sentry.captureException(err, { tags: { flow: 'purchase_subscription', plan: selected } })
        setError(e.message ?? "Couldn't complete the purchase. Try again or contact support@omenora.com.")
      }
    } finally {
      setIsPurchasing(false)
    }
  }

  const handleRestore = async () => {
    setIsRestoring(true)
    setError(null)
    try {
      const restored = await restorePurchases()
      const nowPremium = restored.entitlements?.active?.['premium'] !== undefined
      if (nowPremium) {
        onPurchased?.()
        onClose()
      } else {
        setError('No previous purchases were found to restore.')
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { flow: 'restore_purchases' } })
      setError("Couldn't restore purchases. Try again or contact support@omenora.com.")
    } finally {
      setIsRestoring(false)
    }
  }

  if (!visible) return null

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <PaywallShell
        hero={
          <>
            <Text variant="micro" color="secondary" style={styles.eyebrow}>Unlock</Text>
            <Text
              variant="hero"
              color="primary"
              style={styles.archetype}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {archetypeName}
            </Text>
          </>
        }
        features={
          <View style={styles.features}>
            <EditorialBenefit>You&apos;ve seen your Big Three. The rest of your chart is still sealed.</EditorialBenefit>
            <EditorialBenefit>
              Inside: your full archetype portrait, every planet in your natal chart, your
              90-day forecast, daily guidance written for your chart — and Counsel, your AI
              astrologer, on call.
            </EditorialBenefit>
          </View>
        }
        planSelector={
          <View style={styles.plans}>
            {PLAN_META.map((p) => {
              const isSel = selected === p.key
              return (
                <Pressable
                  key={p.key}
                  onPress={() => setSelected(p.key)}
                  disabled={isDisabled}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isSel, disabled: isDisabled }}
                  accessibilityLabel={`${p.label}, ${priceFor(p.key)} ${p.cadence}${p.badge ? ', best value' : ''}`}
                  style={[styles.planRow, isSel && styles.planRowSelected]}
                >
                  <View style={styles.planLeft}>
                    <Text variant="label" color="primary">{p.label}</Text>
                    <Text variant="caption" color="tertiary">{p.cadence}</Text>
                  </View>
                  {p.badge != null && (
                    <View style={styles.badge}>
                      <Text variant="micro" color="accent">{p.badge}</Text>
                    </View>
                  )}
                  <Text variant="heading2" color="primary">{priceFor(p.key)}</Text>
                </Pressable>
              )
            })}
          </View>
        }
        primaryCta={
          <Button
            label="Unlock Premium"
            variant="premium"
            fullWidth
            loading={isPurchasing}
            disabled={isDisabled}
            onPress={handleContinue}
          />
        }
        secondaryAction={
          <View style={styles.secondary}>
            {error != null && (
              <Text variant="caption" style={[styles.error, { color: tokens.state.danger }]}>{error}</Text>
            )}
            <Pressable
              onPress={handleRestore}
              disabled={isDisabled}
              accessibilityRole="button"
              accessibilityLabel="Restore previous purchases"
              hitSlop={8}
            >
              <Text variant="caption" color="tertiary" style={styles.restore}>
                {isRestoring ? 'Restoring…' : 'Restore Purchases'}
              </Text>
            </Pressable>
            <Pressable onPress={onClose} disabled={isDisabled} accessibilityRole="button" hitSlop={8}>
              <Text variant="label" color="tertiary">Maybe later</Text>
            </Pressable>
          </View>
        }
        legalFooter={
          <View style={styles.legal}>
            <Text variant="micro" color="tertiary" style={styles.legalText}>
              Subscriptions auto-renew at the price shown until cancelled. Manage or cancel
              anytime in your App Store account settings.
            </Text>
            <View style={styles.legalLinks}>
              <Pressable onPress={() => openLegal('Terms')} hitSlop={8}>
                <Text variant="micro" style={styles.link}>Terms</Text>
              </Pressable>
              <Text variant="micro" color="tertiary">  ·  </Text>
              <Pressable onPress={() => openLegal('Privacy')} hitSlop={8}>
                <Text variant="micro" style={styles.link}>Privacy</Text>
              </Pressable>
            </View>
          </View>
        }
      />
    </Modal>
  )
}

const styles = StyleSheet.create({
  eyebrow: { textTransform: 'uppercase', letterSpacing: 2, marginBottom: space['2'], textAlign: 'center' },
  archetype: { textAlign: 'center' },
  features: { gap: space['5'] },
  plans: { gap: space['3'] },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['3'],
    paddingVertical: space['4'],
    paddingHorizontal: space['4'],
    borderWidth: 1,
    borderColor: tokens.border.subtle,
    borderRadius: radius.lg,
  },
  planRowSelected: { borderColor: tokens.border.accent },
  planLeft: { flex: 1, gap: space['0.5'] },
  badge: {
    borderWidth: 1,
    borderColor: tokens.border.accent,
    borderRadius: radius.xs,
    paddingVertical: space['0.5'],
    paddingHorizontal: space['2'],
  },
  secondary: { alignItems: 'center', gap: space['3'] },
  error: { textAlign: 'center' },
  restore: { textDecorationLine: 'underline' },
  legal: { gap: space['2'], alignItems: 'center' },
  legalText: { textAlign: 'center' },
  legalLinks: { flexDirection: 'row', alignItems: 'center' },
  link: { color: tokens.text.tertiary, textDecorationLine: 'underline' },
})
