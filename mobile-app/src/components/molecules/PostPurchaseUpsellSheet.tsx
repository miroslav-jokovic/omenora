import React from 'react'
import { Modal, Pressable, StyleSheet, View } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Text, Button } from '../atoms'
import { Card } from '../organisms'
import { tokens, space, layout, radius, duration as motionDuration } from '../../design/tokens'
import type { BoostPackIdentifier } from './BoostPackSheet'

export interface PostPurchaseUpsellSheetProps {
  visible: boolean
  packId: BoostPackIdentifier
  onUpgrade: () => void
  onDismiss: () => void
}

const PACK_CONVERSATIONS: Record<BoostPackIdentifier, number> = {
  spark:   5,
  insight: 15,
  ascend:  35,
}

export const PostPurchaseUpsellSheet: React.FC<PostPurchaseUpsellSheetProps> = ({
  visible,
  packId,
  onUpgrade,
  onDismiss,
}) => {
  if (!visible) return null

  const n = PACK_CONVERSATIONS[packId]

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
        accessibilityLabel="Dismiss premium upgrade offer"
        accessibilityRole="button"
      >
        <Pressable onPress={() => {}} style={styles.sheetWrapper}>
          <Animated.View
            entering={FadeInDown.duration(motionDuration.transition)}
            style={styles.sheet}
            accessibilityLabel="Premium upgrade offer"
          >
            <Card variant="elevated" padding="default">
              <Text variant="heading2" color="primary" style={styles.headline}>
                Make it unlimited
              </Text>

              <Text variant="body" color="secondary" style={styles.body}>
                You just added {n} conversations. With Premium you get 30 every
                month — and the {n} you just bought stack on top. Nothing you
                paid for goes away.
              </Text>

              <View style={styles.actions}>
                <Button
                  label="Upgrade to Premium"
                  variant="premium"
                  fullWidth
                  onPress={onUpgrade}
                  style={styles.primaryButton}
                />
                <Button
                  label="Keep chatting"
                  variant="tertiary"
                  fullWidth
                  onPress={onDismiss}
                />
              </View>
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
  headline: {
    marginBottom: space['3'],
  },
  body: {
    marginBottom: space['2'],
  },
  actions: {
    marginTop: space['4'],
    gap:       space['3'],
  },
  primaryButton: {},
})
