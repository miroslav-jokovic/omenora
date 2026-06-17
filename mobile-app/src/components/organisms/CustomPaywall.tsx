import React, { useState } from 'react'
import { Modal, View, Pressable, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import * as Sentry from '@sentry/react-native'
import type { PurchasesPackage } from 'react-native-purchases'
import { Text, Button, EditorialBenefit } from '../atoms'
import { PlanComparisonTable } from '../molecules/PlanComparisonTable'
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

  // Live-only derived math — never computed from FALLBACK_PRICE
  const perMonthFor = (key: 'annual'): string | null => {
    const pkg = packageFor(key)
    if (pkg == null) return null
    const monthly = pkg.product.price / 12
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: pkg.product.currencyCode }).format(monthly) + '/mo'
  }

  const savingsVsWeekly = (): number | null => {
    const annualPkg  = packageFor('annual')
    const weeklyPkg  = packageFor('weekly')
    if (annualPkg == null || weeklyPkg == null) return null
    const pct = Math.round((1 - annualPkg.product.price / (weeklyPkg.product.price * 52)) * 100)
    if (pct < 1 || pct > 99) return null
    return pct
  }

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

  const selectedMeta = PLAN_META.find((p) => p.key === selected)!

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
            <Text variant="caption" color="secondary" style={styles.trustLine}>
              Every word calculated from your exact birth moment — not a sun-sign guess.
            </Text>
            <PlanComparisonTable />
          </View>
        }
        planSelector={
          <View style={styles.plans}>
            {PLAN_META.map((p) => {
              const isSel = selected === p.key
              const pPerMonth = p.key === 'annual' ? perMonthFor('annual') : null
              const pSavings  = p.key === 'annual' ? savingsVsWeekly()    : null
              const a11yExtras = [
                pPerMonth != null ? `about ${pPerMonth} per month` : null,
                pSavings  != null ? `save ${pSavings} percent`     : null,
                p.badge   != null ? 'best value'                   : null,
              ].filter(Boolean).join(', ')
              return (
                <View key={p.key} style={p.badge != null ? styles.planRowWithBadge : undefined}>
                  {p.badge != null && (
                    <View style={styles.badgePill}>
                      <Text variant="micro" style={styles.badgePillText}>{p.badge}</Text>
                    </View>
                  )}
                  <Pressable
                    onPress={() => { Haptics.selectionAsync(); setSelected(p.key) }}
                    disabled={isDisabled}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSel, disabled: isDisabled }}
                    accessibilityLabel={`${p.label}, ${priceFor(p.key)} ${p.cadence}${a11yExtras.length > 0 ? ', ' + a11yExtras : ''}`}
                    style={[styles.planRow, isSel ? styles.planRowSelected : styles.planRowUnselected]}
                  >
                    <View style={styles.radioCol}>
                      <View style={[styles.radioOuter, isSel && styles.radioOuterSelected]}>
                        {isSel && <View style={styles.radioDot} />}
                      </View>
                    </View>
                    <View style={styles.planLeft}>
                      <Text variant="label" color="primary">{p.label}</Text>
                      <Text variant="caption" color="tertiary">{p.cadence}</Text>
                      {pSavings != null && (
                        <View style={styles.savingsChip}>
                          <Text variant="subMicro" style={styles.savingsChipText}>SAVE {pSavings}%</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.priceCol}>
                      <Text
                        variant={isSel ? 'heading1' : 'heading2'}
                        color="primary"
                      >
                        {priceFor(p.key)}
                      </Text>
                      {pPerMonth != null && (
                        <Text variant="caption" style={styles.perMonth}>{pPerMonth}</Text>
                      )}
                    </View>
                  </Pressable>
                </View>
              )
            })}
          </View>
        }
        primaryCta={
          <Button
            label="Unlock Premium"
            variant="cta"
            fullWidth
            loading={isPurchasing}
            disabled={isDisabled}
            onPress={handleContinue}
          />
        }
        ctaSubline={
          <Text variant="caption" color="tertiary" style={styles.ctaSubline}>
            {priceFor(selected)} {selectedMeta.cadence} · cancel anytime in the App Store
          </Text>
        }
        footerAction={
          <Pressable onPress={onClose} disabled={isDisabled} accessibilityRole="button" hitSlop={8}>
            <Text variant="label" color="tertiary">Maybe later</Text>
          </Pressable>
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
  trustLine: { textAlign: 'center', marginTop: space['5'] },
  features: { gap: space['5'] },
  // Plans container — overflow visible so the badge chip can overlap the card top edge
  plans: { gap: space['3'], overflow: 'visible' },
  // Wrapper that gives the annual card extra marginTop to make room for the badge
  planRowWithBadge: { marginTop: space['2'] },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['3'],
    paddingVertical: space['4'],
    paddingHorizontal: space['4'],
    borderWidth: 2,
    borderRadius: radius.lg,
  },
  // Unselected: muted border, slightly transparent; borderWidth stays 2 to prevent layout jump
  planRowUnselected: {
    borderColor: tokens.border.subtle,
    opacity: 0.85,
  },
  // Selected: accent border + subtle accent fill
  planRowSelected: {
    borderColor: tokens.accent.emphasis,
    backgroundColor: tokens.accent.subtle,
    opacity: 1,
  },
  // Leading radio glyph
  radioCol: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: tokens.border.strong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderWidth: 0,
    backgroundColor: tokens.accent.emphasis,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.text.inverse,
  },
  planLeft: { flex: 1, gap: space['0.5'] },
  priceCol: { alignItems: 'flex-end', gap: space['0.5'] },
  perMonth: { color: tokens.accent.emphasis },
  // Savings chip — left side under cadence line
  savingsChip: {
    alignSelf: 'flex-start',
    backgroundColor: tokens.accent.primary,
    borderRadius: radius.xs,
    paddingHorizontal: space['2'],
    paddingVertical: space['0.5'],
    marginTop: space['1'],
  },
  savingsChipText: { color: tokens.text.inverse },
  // Filled "BEST VALUE" badge overlapping card top edge
  badgePill: {
    position: 'absolute',
    top: -10,
    left: space['4'],
    zIndex: 1,
    backgroundColor: tokens.accent.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  badgePillText: { color: tokens.text.inverse },
  ctaSubline: { textAlign: 'center' },
  secondary: { alignItems: 'center', gap: space['3'] },
  error: { textAlign: 'center' },
  restore: { textDecorationLine: 'underline' },
  legal: { gap: space['2'], alignItems: 'center' },
  legalText: { textAlign: 'center' },
  legalLinks: { flexDirection: 'row', alignItems: 'center' },
  link: { color: tokens.text.tertiary, textDecorationLine: 'underline' },
})
