import React from 'react'
import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  View,
} from 'react-native'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import type { LucideIcon } from 'lucide-react-native'
import {
  tokens,
  cta as ctaTokens,
  space,
  layout,
  radius,
  typeScale,
} from '../../design/tokens'
import { Text } from './Text'

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'premium' | 'cta'

export interface ButtonProps {
  label: string
  onPress: () => void
  variant?: ButtonVariant
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  icon?: LucideIcon
  style?: ViewStyle
}

const variantStyles = {
  primary: {
    container: { backgroundColor: tokens.accent.primary, borderWidth: 0 },
    label:     { color: tokens.text.inverse },
    indicator:  tokens.text.inverse,
  },
  secondary: {
    container: { backgroundColor: 'transparent', borderWidth: 1, borderColor: tokens.border.default },
    label:     { color: tokens.text.primary },
    indicator:  tokens.text.primary,
  },
  tertiary: {
    container: { backgroundColor: 'transparent', borderWidth: 0 },
    label:     { color: tokens.accent.primary },
    indicator:  tokens.accent.primary,
  },
  danger: {
    container: { backgroundColor: tokens.state.danger, borderWidth: 0 },
    label:     { color: tokens.specialty.white },
    indicator:  tokens.specialty.white,
  },
  cta: {
    container: { backgroundColor: ctaTokens.primary, borderWidth: 0 },
    label:     { color: ctaTokens.text },
    indicator:  ctaTokens.text,
  },
} as const

// Internal component — not exported. 2-layer warm-tinted shadow stack wraps a
// Pressable with a 3-stop LinearGradient fill for maximum OLED luminance range.
const PremiumButtonShell: React.FC<{
  onPress:   () => void
  disabled:  boolean
  loading:   boolean
  fullWidth: boolean
  icon?:     LucideIcon
  label:     string
}> = ({ onPress, disabled, loading, fullWidth, icon, label }) => {
  const IconComponent = icon
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.premiumOuter,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        pressed && { opacity: 0.65, transform: [{ scale: 0.98 }] },
      ]}
    >
      <BlurView
        intensity={18}
        tint="light"
        style={styles.premiumBlur}
      >
        {/* Soft white tint over blur — makes it read as frosted glass */}
        <View style={styles.premiumTint} />
        {loading ? (
          <ActivityIndicator size="small" color={tokens.text.primary} />
        ) : (
          <View style={styles.premiumInner}>
            {IconComponent != null && (
              <IconComponent size={16} color={tokens.text.primary} />
            )}
            <Text style={styles.premiumLabel}>{label}</Text>
          </View>
        )}
      </BlurView>
    </Pressable>
  )
}

export const Button: React.FC<ButtonProps> = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
}) => {
  const handlePress = () => {
    if (disabled || loading) return
    if (variant === 'primary' || variant === 'secondary' || variant === 'premium' || variant === 'cta') {
      Haptics.selectionAsync()
    }
    onPress()
  }

  // Premium variant branches to its own multi-layer render path
  if (variant === 'premium') {
    return (
      <PremiumButtonShell
        onPress={handlePress}
        disabled={disabled}
        loading={loading}
        fullWidth={fullWidth}
        icon={icon}
        label={label}
      />
    )
  }

  const vs = variantStyles[variant]
  const IconComponent = icon

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        vs.container,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vs.indicator} />
      ) : (
        <View style={styles.inner}>
          {IconComponent != null && (
            <IconComponent size={16} color={vs.label.color} />
          )}
          <Text
            variant="label"
            style={vs.label}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  premiumOuter: {
    borderRadius: radius.xl,
    overflow:     'hidden',
  },
  premiumBlur: {
    paddingVertical:   space['4'],
    paddingHorizontal: space['6'],
    minHeight:         56,
    alignItems:        'center',
    justifyContent:    'center',
  },
  premiumTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tokens.specialty.glassTint,
  },
  premiumInner: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           space['2'],
    zIndex:        1,
  },
  premiumLabel: {
    ...typeScale.labelLarge,
    letterSpacing: 0.2,
    color:         tokens.text.primary,
  },
  base: {
    paddingVertical:   space['3'],
    paddingHorizontal: space['5'],
    minHeight:         layout.tapTarget,
    borderRadius:      radius.md,
    alignItems:        'center',
    justifyContent:    'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  inner: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           space['2'],
  },
})
