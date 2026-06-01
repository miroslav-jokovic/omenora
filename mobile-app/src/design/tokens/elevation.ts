import { ViewStyle } from 'react-native'

// Shadow tokens. Each value is a complete ViewStyle fragment.
// iOS reads shadowColor/Offset/Opacity/Radius. Android reads elevation.

type ElevationLevel = Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>

// Floating elements — bottom sheets, modals
export const elevation: Record<string, ElevationLevel> = {
  floating: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius:  36,
    elevation:     16,
  },
} as const

// Bronze glow — for primary CTA buttons and premium surfaces.
// Uses accent.primary (#A87D4E) as shadow color to suggest warm "lit" surface.
export const warmGlow: ElevationLevel = {
  shadowColor:   '#A87D4E',  // accent.primary — aged bronze
  shadowOffset:  { width: 0, height: 0 },
  shadowOpacity: 0.45,
  shadowRadius:  24,
  elevation:     0,
}

// ── Card shadow tiers ─────────────────────────────────────────────────────────
// Pure black shadows on a deep charcoal canvas create "floating" separation.
// Three tiers: content (default), elevated (featured), premium (flagship).
export const cardShadow: Record<'content' | 'elevated' | 'premium', ElevationLevel> = {
  content: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.40,
    shadowRadius:  10,
    elevation:     4,
  },
  elevated: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.55,
    shadowRadius:  18,
    elevation:     8,
  },
  premium: {
    shadowColor:   '#000000',
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.65,
    shadowRadius:  24,
    elevation:     12,
  },
}

// ── Card top-highlight opacities ──────────────────────────────────────────────
// 1px rgba(255,255,255,N) inner line at top of card.
// Simulates ambient light catching the raised top edge — the single most
// effective depth cue on dark surfaces (used by Linear, Raycast, Vercel).
export const cardHighlight = {
  content:  'rgba(255,255,255,0.09)',
  elevated: 'rgba(255,255,255,0.13)',
  premium:  'rgba(255,255,255,0.11)',
} as const
