// ── Tier 2: Semantic surface tokens ──────────────────────────────────────────
// Maps raw primitive color values to semantic roles.
// Aligned to web design system: cool charcoal canvas, tonal lift hierarchy.
// Borders use surface-matched solid values (not opacity-white).

export const surfaceCanvas = '#121214'         // screen background — matches surface.deep

// ── Card semantic surfaces — solid reference values ────────────────────────
// Used for locked variant only (no gradient). All other variants use gradient pairs below.
export const surfaceCardContent  = '#2F2F33'   // one step above canvas (web: --omn-bg-elevated)
export const surfaceCardElevated = '#3A3A3F'   // two steps above canvas (web: --omn-bg-interactive)
export const surfaceCardLocked   = '#2F2F33'   // mirrors content — no visual emphasis

// ── Card micro-gradient pairs (top→bottom) ────────────────────────────────────
// A 2-stop vertical gradient where top is ~2-3 luminance units lighter than bottom.
// Imperceptible in isolation, but creates convincing "lit top face" quality.
// Direction: light→dark top-to-bottom (convex, raised appearance).

// Content tier: canvas-lifted, subtle
export const surfaceCardContentTop    = '#353539'   // +6 lum above bottom stop
export const surfaceCardContentBottom = '#272729'   // below content solid level

// Elevated tier: stronger lift, more presence
export const surfaceCardElevatedTop    = '#404046'   // +7 lum above bottom stop
export const surfaceCardElevatedBottom = '#2E2E32'   // grounded base

// ── Card gradient — premium tier ─────────────────────────────────────────────
// Charcoal lift — cool, no warm tones
export const surfaceCardPremiumGlowTop = '#3A3A3F'   // cool charcoal elevated top
export const surfaceCardPremiumBase    = '#252528'   // cool charcoal base

// Accent rust: warm burnt-orange gradient — intentional CTA/conversion moments only
export const surfaceCardAccentRustTop    = '#C25A2E'
export const surfaceCardAccentRustBottom = '#9A4520'

// Featured: cool elevated charcoal — no orange/copper, subtle tonal lift only
export const surfaceCardFeaturedTop    = '#3A3A3F'   // matches elevated surface
export const surfaceCardFeaturedBottom = '#252528'   // matches base surface

// ── Tier 3: Component tokens ──────────────────────────────────────────────────
// Consumed directly by Card.tsx variantConfig.
// Solid variants: backgroundColor string.
// Gradient variants: colors tuple [top, bottom] for LinearGradient.

export const cardTokens = {
  background: {
    content:          surfaceCardContent,   // solid fallback (locked only)
    elevated:         surfaceCardElevated,  // solid fallback (locked only)
    locked:           surfaceCardLocked,
    // Micro-gradients — light top → dark bottom, creates lit-top-face depth
    contentGradient:      [surfaceCardContentTop,        surfaceCardContentBottom]      as [string, string],
    elevatedGradient:     [surfaceCardElevatedTop,       surfaceCardElevatedBottom]     as [string, string],
    // Premium: charcoal lift
    premiumGradient:      [surfaceCardPremiumGlowTop,    surfaceCardPremiumBase]        as [string, string],
    // Accent rust/conversion cards
    accentRustGradient:   [surfaceCardAccentRustTop,     surfaceCardAccentRustBottom]   as [string, string],
    // Featured: tonal charcoal lift
    featuredGradient:     [surfaceCardFeaturedTop,       surfaceCardFeaturedBottom]     as [string, string],
  },
  border: {
    content:  'rgba(255,255,255,0.07)',  // white hairline — light catching edge, not a drawn box
    elevated: 'rgba(255,255,255,0.10)',  // slightly stronger — matches elevated tier presence
    locked:   'transparent',
    premium:  'rgba(255,255,255,0.09)',  // near-invisible cream edge on premium gradient
    accentRust: 'transparent',
    featured:   'rgba(255,255,255,0.08)',
  },
  text: {
    onDark:          '#F2EDE5',              // warm cream — primary text on gradient cards
    onDarkSecondary: 'rgba(242,237,229,0.78)',
  },
} as const

export type CardTokens = typeof cardTokens
