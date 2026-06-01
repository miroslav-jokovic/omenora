import React, { useState } from 'react'
import { View, StyleSheet, ViewStyle, LayoutChangeEvent } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Decor, { DecorTone } from '../atmosphere/Decor'
import { cardTokens, radius, layout } from '../../design/tokens'

export interface CardProps {
  /**
   * Visual tier of the card surface:
   * - content     — solid charcoal #2F2F33, hairline border, content list cards
   * - elevated    — solid charcoal #3A3A3F, stronger border, featured content
   * - premium     — bronze-lit charcoal gradient, faint bronze border
   * - featured    — warm copper gradient #A87D4E→#5A3A22, ad-hoc featured moments only
   * - accent-rust — vertical gradient warm rust #C25A2E→#9A4520, conversion moments
   * - locked      — solid charcoal #2F2F33, no border
   *
   * Deprecated aliases (render as nearest variant):
   * - default → content
   * - raised  → elevated
   * - glass   → content
   * - accent  → accent-rust
   * - accent-navy → premium  (navy/purple removed per design system §8)
   */
  variant?: 'content' | 'elevated' | 'premium' | 'featured' | 'accent-rust' | 'locked'
    | 'default' | 'raised' | 'glass' | 'accent' | 'accent-navy'
  padding?: 'compact' | 'default' | 'premium'
  children: React.ReactNode
  style?: ViewStyle
}

// Resolve deprecated variant aliases to canonical names
function resolveVariant(v: NonNullable<CardProps['variant']>): 'content' | 'elevated' | 'premium' | 'featured' | 'accent-rust' | 'locked' {
  switch (v) {
    case 'default':     return 'content'
    case 'raised':      return 'elevated'
    case 'glass':       return 'content'
    case 'accent':      return 'accent-rust'
    case 'accent-navy': return 'premium'   // navy/purple replaced by bronze-charcoal premium
    default:            return v
  }
}

// ── Solid variant configs ─────────────────────────────────────────────────────
type SolidConfig = {
  kind:            'solid'
  backgroundColor: string
  borderWidth:     number
  borderColor:     string
  borderRadius:    number
}

const solidConfig: Record<'content' | 'elevated' | 'locked', SolidConfig> = {
  content: {
    kind:            'solid',
    backgroundColor: cardTokens.background.content,
    borderWidth:     1,
    borderColor:     cardTokens.border.content,
    borderRadius:    radius.lg,
  },
  elevated: {
    kind:            'solid',
    backgroundColor: cardTokens.background.elevated,
    borderWidth:     1,
    borderColor:     cardTokens.border.elevated,
    borderRadius:    radius.lg,
  },
  locked: {
    kind:            'solid',
    backgroundColor: cardTokens.background.locked,
    borderWidth:     0,
    borderColor:     cardTokens.border.locked,
    borderRadius:    radius.lg,
  },
}

// ── Gradient variant configs ──────────────────────────────────────────────────
type GradientConfig = {
  kind:         'gradient'
  colors:       [string, string]
  borderRadius: number
}

type GradientConfigFull = GradientConfig & {
  start: { x: number; y: number }
  end:   { x: number; y: number }
}

const gradientConfig: Record<'premium' | 'featured' | 'accent-rust', GradientConfigFull> = {
  premium: {
    kind:         'gradient',
    colors:       cardTokens.background.premiumGradient,
    borderRadius: radius.lg,
    start:        { x: 0.5, y: -0.15 },
    end:          { x: 0.5, y: 1 },
  },
  featured: {
    kind:         'gradient',
    colors:       cardTokens.background.featuredGradient,
    borderRadius: radius.lg,
    start:        { x: 0.5, y: -0.15 },
    end:          { x: 0.5, y: 1 },
  },
  'accent-rust': {
    kind:         'gradient',
    colors:       cardTokens.background.accentRustGradient,
    borderRadius: radius.lg,
    start:        { x: 0, y: 0 },
    end:          { x: 0, y: 1 },
  },
}

// Guilloché rosette tone per gradient variant.
// Bronze sings on the premium charcoal surface; warm copper & rust use light tone.
// Solid variants carry no decor — restraint reads as premium.
const decorTone: Record<'premium' | 'featured' | 'accent-rust', DecorTone> = {
  premium:       'gold',
  featured:      'light',
  'accent-rust': 'light',
}

const paddingMap = {
  compact: layout.cardPaddingCompact,
  default: layout.cardPaddingDefault,
  premium: layout.cardPaddingPremium,
} as const

export const Card: React.FC<CardProps> = ({
  variant = 'content',
  padding = 'default',
  children,
  style,
}) => {
  const canonical = resolveVariant(variant)
  const pad = paddingMap[padding]
  const [cardW, setCardW] = useState(0)
  const [cardH, setCardH] = useState(0)
  const onLayout = (e: LayoutChangeEvent) => {
    setCardW(e.nativeEvent.layout.width)
    setCardH(e.nativeEvent.layout.height)
  }

  if (canonical === 'premium' || canonical === 'featured' || canonical === 'accent-rust') {
    const cfg = gradientConfig[canonical]
    const cardBorder = canonical === 'premium'
      ? { borderWidth: 1, borderColor: cardTokens.border.premium }
      : {}
    return (
      <View style={[{ borderRadius: cfg.borderRadius, overflow: 'hidden' }, cardBorder, style]} onLayout={onLayout}>
        <LinearGradient
          colors={cfg.colors}
          start={cfg.start}
          end={cfg.end}
          style={styles.shell}
        >
          {cardW > 0 && (
            <Decor
              pattern="rosette"
              tone={decorTone[canonical]}
              intensity="subtle"
              width={cardW}
              height={cardH}
            />
          )}
          <View style={{ padding: pad }}>
            {children}
          </View>
        </LinearGradient>
      </View>
    )
  }

  const cfg = solidConfig[canonical]
  return (
    <View
      onLayout={onLayout}
      style={[
        styles.shell,
        {
          backgroundColor: cfg.backgroundColor,
          borderRadius:    cfg.borderRadius,
          borderWidth:     cfg.borderWidth,
          borderColor:     cfg.borderColor,
        },
        style,
      ]}
    >
      <View style={{ padding: pad }}>
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',  // clips border-radius on child content
  },
})
