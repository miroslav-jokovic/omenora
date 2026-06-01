import React, { useState, useCallback } from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Text, Button } from '../atoms'
import { Card } from '../organisms'
import { usePurchases } from '../../context/usePurchases'
import { tokens, space, layout, radius, duration as motionDuration } from '../../design/tokens'

export type BoostPackIdentifier = 'spark' | 'insight' | 'ascend'

export interface BoostPackSheetProps {
  visible: boolean
  onDismiss: () => void
  onPurchaseSuccess: (packIdentifier: BoostPackIdentifier) => void
}

type PackMeta = {
  id: BoostPackIdentifier
  title: string
  eyebrow: string
  fallbackPrice: string
  recommended: boolean
}

const PACK_META: PackMeta[] = [
  { id: 'spark',   title: '5 Spark Conversations',   eyebrow: 'TRY A FEW MORE COUNSEL SESSIONS', fallbackPrice: '$1.99', recommended: false },
  { id: 'insight', title: '15 Insight Conversations', eyebrow: 'MOST POPULAR',                   fallbackPrice: '$4.99', recommended: true  },
  { id: 'ascend',  title: '35 Ascend Conversations',  eyebrow: 'BEST VALUE — SAVE 28%',           fallbackPrice: '$9.99', recommended: false },
]

export const BoostPackSheet: React.FC<BoostPackSheetProps> = ({
  visible,
  onDismiss,
  onPurchaseSuccess,
}) => {
  const { boostPacksOffering, purchaseBoostPack } = usePurchases()
  const [isPurchasing, setIsPurchasing] = useState<BoostPackIdentifier | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const getPriceString = (id: BoostPackIdentifier, fallback: string): string => {
    const pkg = boostPacksOffering?.availablePackages.find(p => p.identifier === id)
    return pkg?.product.priceString ?? fallback
  }

  const handleBuy = useCallback(async (packId: BoostPackIdentifier) => {
    setIsPurchasing(packId)
    setErrorMessage(null)
    try {
      await purchaseBoostPack(packId)
      onPurchaseSuccess(packId)
      onDismiss()
    } catch (err) {
      const e = err as { userCancelled?: boolean; message?: string }
      if (!e.userCancelled) {
        setErrorMessage(e.message ?? "Couldn't complete the purchase. Try again or contact support@omenora.com.")
      }
    } finally {
      setIsPurchasing(null)
    }
  }, [purchaseBoostPack, onPurchaseSuccess, onDismiss])

  if (!visible) return null

  const anyPurchasing = isPurchasing !== null

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
        accessibilityLabel="Dismiss boost pack options"
        accessibilityRole="button"
      >
        {/* Inner Pressable stops backdrop tap from propagating through the sheet */}
        <Pressable onPress={() => {}} style={styles.sheetWrapper}>
          <Animated.View
            entering={FadeInDown.duration(motionDuration.transition)}
            style={styles.sheet}
            accessibilityLabel="Counsel boost pack options"
          >
            <Card variant="elevated" padding="default">
              {boostPacksOffering === null ? (
                <Text variant="body" color="tertiary" style={styles.loadingText}>
                  Loading purchase options…
                </Text>
              ) : (
                <>
                  {PACK_META.map((pack, idx) => {
                    const priceString    = getPriceString(pack.id, pack.fallbackPrice)
                    const isThisPurchasing = isPurchasing === pack.id
                    const isLast         = idx === PACK_META.length - 1

                    return (
                      <React.Fragment key={pack.id}>
                        <View style={styles.option}>
                          {/* Eyebrow — doubles as "RECOMMENDED" badge for insight */}
                          <Text
                            variant="micro"
                            style={[
                              styles.eyebrow,
                              { color: pack.recommended ? tokens.accent.emphasis : tokens.accent.primary },
                            ]}
                          >
                            {pack.eyebrow}
                          </Text>

                          <Text variant="heading2" color="primary" style={styles.optionTitle}>
                            {pack.title}
                          </Text>

                          <Text variant="caption" color="secondary" style={styles.optionPrice}>
                            {priceString}
                          </Text>

                          <Button
                            variant="primary"
                            label={isThisPurchasing ? 'Processing…' : `Buy for ${priceString}`}
                            onPress={() => { void handleBuy(pack.id) }}
                            disabled={anyPurchasing}
                            loading={isThisPurchasing}
                            fullWidth
                            style={styles.ctaButton}
                          />
                        </View>

                        {!isLast && <View style={styles.divider} />}
                      </React.Fragment>
                    )
                  })}

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
    textAlign:       'center',
    paddingVertical: space['4'],
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
  optionPrice: {
    marginTop: space['0.5'],
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
