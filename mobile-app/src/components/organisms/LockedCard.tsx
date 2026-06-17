import React from 'react'
import { StyleSheet, ViewStyle } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Text, Button } from '../atoms'
import { Card } from './Card'
import { space, tokens } from '../../design/tokens'

export interface LockedCardProps {
  /** Hero headline — lead with what the user gets */
  title: string
  /** Value-prop body copy — specificity sells */
  description: string
  /** CTA button label. Defaults to "Unlock". */
  ctaLabel?: string
  onUnlockPress: () => void
  /** Analytics placement identifier */
  placement: string
  style?: ViewStyle
}

export const LockedCard: React.FC<LockedCardProps> = ({
  title,
  description,
  ctaLabel = 'Unlock',
  onUnlockPress,
  placement: _placement,
  style,
}) => {
  const handleUnlockPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onUnlockPress()
  }

  return (
    <Card variant="premium" padding="premium" style={style}>
      <Text variant="micro" style={[styles.eyebrow, styles.eyebrowColor]}>
        PREMIUM
      </Text>
      <Text variant="display2" color="primary" style={styles.title}>
        {title}
      </Text>
      <Text variant="body" color="secondary" style={styles.description}>
        {description}
      </Text>
      <Button
        label={ctaLabel}
        variant="premium"
        fullWidth
        onPress={handleUnlockPress}
        style={styles.cta}
      />
    </Card>
  )
}

const styles = StyleSheet.create({
  eyebrow: {
    letterSpacing: 1.5,
  },
  eyebrowColor: {
    color: tokens.accent.emphasis,
  },
  title: {
    marginTop: space['3'],
  },
  description: {
    marginTop: space['2'],
  },
  cta: {
    marginTop: space['10'],
  },
})
