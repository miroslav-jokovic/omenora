import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { tokens, space, radius } from '../../design/tokens'
import { Text } from './Text'

type ProBadgeProps = {
  variant: 'pro'
  label?: string
  style?: ViewStyle
}

type NewBadgeProps = {
  variant: 'new'
  label?: string
  style?: ViewStyle
}

type CountBadgeProps = {
  variant: 'count'
  count: number
  style?: ViewStyle
}

export type BadgeProps = ProBadgeProps | NewBadgeProps | CountBadgeProps

export const Badge: React.FC<BadgeProps> = (props) => {
  if (props.variant === 'count') {
    const display = props.count > 99 ? '99+' : String(props.count)
    return (
      <View style={[styles.base, styles.countBadge, props.style]}>
        <Text variant="caption" style={styles.countText}>
          {display}
        </Text>
      </View>
    )
  }

  const isPro = props.variant === 'pro'
  const label = props.label ?? (isPro ? 'PRO' : 'NEW')

  return (
    <View
      style={[
        styles.base,
        isPro ? styles.proBadge : styles.newBadge,
        props.style,
      ]}
    >
      <Text variant="micro" style={isPro ? styles.proText : styles.newText}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius:  radius.pill,
    alignSelf:     'flex-start',
  },
  proBadge: {
    paddingVertical:   2,
    paddingHorizontal: space['2'],
    backgroundColor:   tokens.accent.subtle,
    borderWidth:       0.5,
    borderColor:       tokens.border.accent,
  },
  newBadge: {
    paddingVertical:   2,
    paddingHorizontal: space['2'],
    backgroundColor:   tokens.specialty.chatCounsel,
  },
  countBadge: {
    paddingVertical:   4,
    paddingHorizontal: 6,
    backgroundColor:   tokens.state.danger,
  },
  proText: {
    color: tokens.text.accent,
  },
  newText: {
    color: tokens.text.accent,
  },
  countText: {
    color: tokens.specialty.white,
  },
})
