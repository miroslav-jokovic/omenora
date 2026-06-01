import React, { useState } from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Text, Button } from '../atoms'
import { Card } from '../organisms'
import { usePurchases } from '../../context/usePurchases'
import { tokens, space, layout, radius, duration as motionDuration } from '../../design/tokens'

export interface CompatibilityIAPSheetProps {
  visible: boolean
  onDismiss: () => void
  onPurchaseSuccess: () => void
}

export const CompatibilityIAPSheet: React.FC<CompatibilityIAPSheetProps> = ({
  visible,
  onDismiss,
  onPurchaseSuccess,
}) => {
  const { compatibilityAddonOffering, purchaseCompatibilitySingle, presentPaywall } = usePurchases()
  const [isPurchasing,  setIsPurchasing]  = useState(false)
  const [errorMessage,  setErrorMessage]  = useState<string | null>(null)

  const singlePkg = compatibilityAddonOffering?.availablePackages.find(
    p => p.product.identifier === 'omenora_compatibility_single'
  )
  const priceString = singlePkg?.product.priceString ?? '$4.99'

  const handleBuySingle = async () => {
    setIsPurchasing(true)
    setErrorMessage(null)
    try {
      await purchaseCompatibilitySingle()
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

  const handleSeePremium = async () => {
    onDismiss()
    try {
      await presentPaywall()
    } catch {
      // presentPaywall errors are non-fatal
    }
  }

  if (!visible) return null

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
            accessibilityLabel="Compatibility purchase options"
          >
            <Card variant="elevated" padding="default">
              {compatibilityAddonOffering === null ? (
                <Text variant="body" color="tertiary" style={styles.loadingText}>
                  Loading purchase options…
                </Text>
              ) : (
                <>
                  {/* ── Option A: Single reading ──────────────────── */}
                  <View style={styles.option}>
                    <Text variant="micro" color="accent" style={styles.eyebrow}>ONE-TIME</Text>
                    <Text variant="heading2" color="primary" style={styles.optionTitle}>
                      Single Compatibility Reading
                    </Text>
                    <Text variant="caption" color="secondary" style={styles.optionSubtitle}>
                      {priceString}
                    </Text>
                    <Text variant="body" color="secondary" style={styles.optionDescription}>
                      Full chart compatibility analysis for two people.
                    </Text>
                    <Button
                      variant="primary"
                      label={`Buy for ${priceString}`}
                      onPress={handleBuySingle}
                      disabled={isPurchasing}
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
                      Includes 10 compatibility readings/month + full Reading &amp; Counsel access.
                    </Text>
                    <Button
                      variant="tertiary"
                      label="See subscription plans"
                      onPress={handleSeePremium}
                      disabled={isPurchasing}
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
})
