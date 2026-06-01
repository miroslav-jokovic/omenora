import React, { useState } from 'react'
import { View, StyleSheet, ViewStyle, LayoutChangeEvent } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Decor, { DecorTone } from '../atmosphere/Decor'
import { cardTokens, cardShadow, cardHighlight, radius, layout } from '../../design/tokens'

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

// ── Gradient configs for content + elevated (micro-gradient) ────────────────
type GradientTierConfig = {
  gradient:     [string, string]
  borderColor:  string
  shadowTier:   'content' | 'elevated'
  highlightTier: 'content' | 'elevated'
}

const gradientTierConfig: Record<'content' | 'elevated', GradientTierConfig> = {
  content: {
    gradient:      cardTokens.background.contentGradient,
    borderColor:   cardTokens.border.content,
    shadowTier:    'content',
    highlightTier: 'content',
  },
  elevated: {
    gradient:      cardTokens.background.elevatedGradient,
    borderColor:   cardTokens.border.elevated,
    shadowTier:    'elevated',
    highlightTier: 'elevated',
  },
}

// ── Locked: intentionally flat (communicates inaccessible/inert state) ───────
const lockedConfig = {
  backgroundColor: cardTokens.background.locked,
  borderRadius:    radius.lg,
}

// ── Premium/featured/accent-rust gradient configs ────────────────────────────
type SpecialGradientConfig = {
  colors:       [string, string]
  borderColor:  string
  start:        { x: number; y: number }
  end:          { x: number; y: number }
  shadowTier:   'content' | 'elevated' | 'premium'
  highlightTier: 'content' | 'elevated' | 'premium'
}

const specialGradientConfig: Record<'premium' | 'featured' | 'accent-rust', SpecialGradientConfig> = {
  premium: {
    colors:        cardTokens.background.premiumGradient,
    borderColor:   cardTokens.border.premium,
    start:         { x: 0.5, y: -0.15 },
    end:           { x: 0.5, y: 1 },
    shadowTier:    'premium',
    highlightTier: 'premium',
  },
  featured: {
    colors:        cardTokens.background.featuredGradient,
    borderColor:   cardTokens.border.featured,
    start:         { x: 0.5, y: -0.15 },
    end:           { x: 0.5, y: 1 },
    shadowTier:    'elevated',
    highlightTier: 'elevated',
  },
  'accent-rust': {
    colors:        cardTokens.background.accentRustGradient,
    borderColor:   cardTokens.border.accentRust,
    start:         { x: 0, y: 0 },
    end:           { x: 0, y: 1 },
    shadowTier:    'elevated',
    highlightTier: 'content',
  },
}

// Guilloché rosette tone per gradient variant — only special gradient variants carry decor
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

  // ── Locked: flat, no shadow, no highlight (communicates inert state) ─────
  if (canonical === 'locked') {
    return (
      <View
        onLayout={onLayout}
        style={[
          outerBase,
          styles.shell,  // overflow:hidden fine here — no shadow on locked
          { backgroundColor: lockedConfig.backgroundColor, borderRadius: lockedConfig.borderRadius },
          style,
        ]}
      >
        <View style={{ padding: pad }}>{children}</View>
      </View>
    )
  }

  // ── Special gradient variants: premium / featured / accent-rust ───────────
  if (canonical === 'premium' || canonical === 'featured' || canonical === 'accent-rust') {
    const cfg = specialGradientConfig[canonical]
    const shadow = cardShadow[cfg.shadowTier]
    const highlight = cardHighlight[cfg.highlightTier]
    return (
      <View
        onLayout={onLayout}
        style={[
          outerBase,
          {
            borderRadius: radius.lg,
            borderWidth:  cfg.borderColor !== 'transparent' ? 1 : 0,
            borderColor:  cfg.borderColor,
          },
          shadow,
          style,
        ]}
      >
        <LinearGradient
          colors={cfg.colors}
          start={cfg.start}
          end={cfg.end}
          style={[styles.shell, { borderRadius: radius.lg }]}
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
          {/* Top-edge highlight — 1px ambient light catch */}
          <View style={[styles.topHighlight, { backgroundColor: highlight }]} />
          <View style={{ padding: pad }}>{children}</View>
        </LinearGradient>
      </View>
    )
  }

  // ── Content + elevated: micro-gradient fill ───────────────────────────────
  const cfg = gradientTierConfig[canonical as 'content' | 'elevated']
  const shadow = cardShadow[cfg.shadowTier]
  const highlight = cardHighlight[cfg.highlightTier]
  return (
    <View
      onLayout={onLayout}
      style={[
        outerBase,
        {
          borderRadius: radius.lg,
          borderWidth:  1,
          borderColor:  cfg.borderColor,
        },
        shadow,
        style,
      ]}
    >
      <LinearGradient
        colors={cfg.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[styles.shell, { borderRadius: radius.lg }]}
      >
        {/* Top-edge highlight — 1px ambient light catch */}
        <View style={[styles.topHighlight, { backgroundColor: highlight }]} />
        <View style={{ padding: pad }}>{children}</View>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',  // clips border-radius on child content — INNER only
  },
  topHighlight: {
    position:   'absolute',
    top:        0,
    left:       0,
    right:      0,
    height:     1,
    zIndex:     1,
  },
})

// Outer wrapper style — NO overflow:hidden (shadows are clipped otherwise on iOS)
const outerBase: ViewStyle = { flex: 0 }
