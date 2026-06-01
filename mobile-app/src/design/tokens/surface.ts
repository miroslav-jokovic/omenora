// ── Tier 2: Semantic surface tokens ──────────────────────────────────────────
// Maps raw primitive color values to semantic roles.
// Aligned to web design system: cool charcoal canvas, tonal lift hierarchy.
// Borders use surface-matched solid values (not opacity-white).

export const surfaceCanvas = '#252528'         // screen background — matches surface.base (web: --omn-bg-primary)

// ── Card semantic surfaces — solid, charcoal family ────────────────────────
// Hierarchy is controlled by luminance step within the charcoal family.
// Canvas (#252528) bleeds through transparent cards uniformly.
export const surfaceCardContent  = '#2F2F33'   // one step above canvas (web: --omn-bg-elevated)
export const surfaceCardElevated = '#3A3A3F'   // two steps above canvas (web: --omn-bg-interactive)
export const surfaceCardLocked   = '#2F2F33'   // mirrors content — no visual emphasis

// ── Card semantic surfaces — gradient (two stops, top→bottom) ────────────────
// Premium: bronze-lit top, charcoal base — warm editorial register
export const surfaceCardPremiumGlowTop = '#3D3530'   // bronze-warmed charcoal top highlight
export const surfaceCardPremiumBase    = '#2F2F33'   // matches surfaceCardContent at base

// Accent rust: warm burnt-orange gradient — stat/conversion moments
export const surfaceCardAccentRustTop    = '#C25A2E'
export const surfaceCardAccentRustBottom = '#9A4520'

// Featured: warm copper — ad-hoc featured moments only (e.g. "Annual Forecast")
export const surfaceCardFeaturedTop    = '#A87D4E'   // uses exact accent.primary value
export const surfaceCardFeaturedBottom = '#5A3A22'

// ── Tier 3: Component tokens ──────────────────────────────────────────────────
// Consumed directly by Card.tsx variantConfig.
// Solid variants: backgroundColor string.
// Gradient variants: colors tuple [top, bottom] for LinearGradient.

export const cardTokens = {
  background: {
    content:          surfaceCardContent,
    elevated:         surfaceCardElevated,
    locked:           surfaceCardLocked,
    // Premium: bronze-lit top → charcoal base
    premiumGradient:      [surfaceCardPremiumGlowTop,   surfaceCardPremiumBase]        as [string, string],
    // Accent rust/conversion cards
    accentRustGradient:   [surfaceCardAccentRustTop,    surfaceCardAccentRustBottom]   as [string, string],
    // Featured: warm copper — for ad-hoc featured moments only
    featuredGradient:     [surfaceCardFeaturedTop,      surfaceCardFeaturedBottom]     as [string, string],
  },
  border: {
    content:  '#3A3A3F',  // surface-matched solid — matches surface.overlay
    elevated: '#4A4A50',  // one step stronger — matches surface.floating
    locked:   'transparent',
    premium:  'rgba(168,125,78,0.18)',  // faint bronze edge on premium gradient cards
    accentRust: 'transparent',
    featured:   'transparent',
  },
  text: {
    onDark:          '#F2EDE5',              // warm cream — primary text on gradient cards
    onDarkSecondary: 'rgba(242,237,229,0.78)',
  },
} as const

export type CardTokens = typeof cardTokens
