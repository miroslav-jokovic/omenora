import React, { useState } from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Text, Button } from '../atoms'
import { Card } from '../organisms'
import { usePurchases } from '../../context/usePurchases'
import { tokens, space, layout, radius, duration as motionDuration } from '../../design/tokens'

export interface CalendarIAPSheetProps {
  visible: boolean
  onDismiss: () => void
  onPurchaseSuccess: () => void
}

export const CalendarIAPSheet: React.FC<CalendarIAPSheetProps> = ({
  visible,
  onDismiss,
  onPurchaseSuccess,
}) => {
  const { calendarProduct, purchaseCalendar, restorePurchases, presentPaywall } = usePurchases()
  const [isPurchasing,  setIsPurchasing]  = useState(false)
  const [isRestoring,   setIsRestoring]   = useState(false)
  const [errorMessage,  setErrorMessage]  = useState<string | null>(null)

  const priceString = calendarProduct?.priceString ?? '$4.99'

  const handleBuyCalendar = async () => {
    setIsPurchasing(true)
    setErrorMessage(null)
    try {
      await purchaseCalendar()
      onPurchaseSuccess()
      onDismiss()
    } catch (err) {
      const e = err as { userCancelled?: boolean; message?: string }
      if (!e.userCancelled) {
        setErrorMessage(e.message ?? "Couldn't complete the purchase. Try again or contact support@omenora.com.")
      }
    } finally {
      setIsPurchasing(false)
    }
  }

  const handleRestore = async () => {
    setIsRestoring(true)
    setErrorMessage(null)
    try {
      await restorePurchases()
      onDismiss()
    } catch (err) {
      const e = err as { message?: string }
      setErrorMessage(e.message ?? "Couldn't restore purchases. Try again or contact support@omenora.com.")
    } finally {
      setIsRestoring(false)
    }
  }

  const handleSeePremium = async () => {
    onDismiss()
    try {
      await presentPaywall()
    } catch {
      // presentPaywall errors are non-fatal
    }
  }

  if (!visible) return null

  const isDisabled = isPurchasing || isRestoring

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        accessibilityLabel="Dismiss purchase options"
        accessibilityRole="button"
      >
        {/* Inner Pressable stops backdrop tap from propagating through the sheet */}
        <Pressable onPress={() => {}} style={styles.sheetWrapper}>
          <Animated.View
            entering={FadeInDown.duration(motionDuration.transition)}
            style={styles.sheet}
            accessibilityLabel="Calendar purchase options"
          >
            <Card variant="elevated" padding="default">
              {calendarProduct === null ? (
                <Text variant="body" color="tertiary" style={styles.loadingText}>
                  Loading purchase options…
                </Text>
              ) : (
                <>
                  {/* ── Option A: Calendar IAP ────────────────────── */}
                  <View style={styles.option}>
                    <Text variant="micro" color="accent" style={styles.eyebrow}>ONE-TIME</Text>
                    <Text variant="heading2" color="primary" style={styles.optionTitle}>
                      2026 Lucky Timing Calendar
                    </Text>
                    <Text variant="caption" color="secondary" style={styles.optionSubtitle}>
                      {priceString}
                    </Text>
                    <Text variant="body" color="secondary" style={styles.optionDescription}>
                      Auspicious dates for love, work, money, and major decisions — all 12 months of 2026.
                    </Text>
                    <Button
                      variant="primary"
                      label={`Buy for ${priceString}`}
                      onPress={handleBuyCalendar}
                      disabled={isDisabled}
                      loading={isPurchasing}
                      fullWidth
                      style={styles.ctaButton}
                    />
                  </View>

                  <View style={styles.divider} />

                  {/* ── Option B: Upgrade to Premium ──────────────── */}
                  <View style={styles.option}>
                    <Text variant="micro" color="accent" style={styles.eyebrow}>UNLIMITED</Text>
                    <Text variant="heading2" color="primary" style={styles.optionTitle}>
                      OMENORA Premium
                    </Text>
                    <Text variant="body" color="secondary" style={styles.optionDescription}>
                      Includes the 2026 calendar + monthly readings, tradition switching, and Counsel chat.
                    </Text>
                    <Button
                      variant="tertiary"
                      label="See subscription plans"
                      onPress={handleSeePremium}
                      disabled={isDisabled}
                      fullWidth
                      style={styles.ctaButton}
                    />
                  </View>

                  {/* ── Inline error ──────────────────────────────── */}
                  {errorMessage !== null && (
                    <Text
                      variant="micro"
                      style={[styles.errorText, { color: tokens.state.danger }]}
                    >
                      {errorMessage}
                    </Text>
                  )}
                </>
              )}
            </Card>

            {/* ── Restore Purchases ─────────────────────────────── */}
            <View style={[styles.restoreContainer, { opacity: isDisabled ? 0.5 : 1 }]}>
              <Pressable
                onPress={handleRestore}
                disabled={isDisabled}
                accessibilityRole="button"
                accessibilityLabel="Restore previous purchases"
              >
                <Text variant="caption" style={[styles.restoreText, { color: tokens.text.tertiary }]}>
                  {isRestoring ? 'Restoring…' : 'Restore Purchases'}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex:            1,
    justifyContent:  'flex-end',
    backgroundColor: tokens.surface.overlay,
  },
  sheetWrapper: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom:     space['8'],
  },
  sheet: {
    borderRadius: radius.xl,
    overflow:     'hidden',
  },
  loadingText: {
    textAlign:        'center',
    paddingVertical:  space['4'],
  },
  option: {
    gap: space['2'],
  },
  eyebrow: {
    letterSpacing: 1.5,
  },
  optionTitle: {
    marginTop: space['1'],
  },
  optionSubtitle: {
    marginTop: space['0.5'],
  },
  optionDescription: {
    marginTop: space['1'],
  },
  ctaButton: {
    marginTop: space['3'],
  },
  divider: {
    height:          1,
    backgroundColor: tokens.border.subtle,
    marginVertical:  space['4'],
  },
  errorText: {
    marginTop: space['3'],
    textAlign: 'center',
  },
  restoreContainer: {
    alignItems:      'center',
    paddingVertical: space['2'],
    marginTop:       space['3'],
  },
  restoreText: {
    textDecorationLine: 'underline',
  },
})
