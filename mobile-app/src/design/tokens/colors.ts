export const surface = {
  deep:    '#121214',  // page foundation — deepest tone (web: --omn-bg-page)
  base:    '#252528',  // dominant atmosphere, most surfaces (web: --omn-bg-primary)
  raised:  '#2F2F33',  // cards, modals (web: --omn-bg-elevated)
  overlay: '#3A3A3F',  // hover, selected, dropdowns (web: --omn-bg-interactive)
  floating:'#4A4A50',  // focused inputs, selected states (web: --omn-border-emphasis)
  inverse: '#F2EDE5',  // warm cream — matches text.primary for inverse surfaces
} as const

export const text = {
  primary:   '#F2EDE5',  // warm cream (web: --omn-text-primary)
  secondary: '#A8A19A',  // warm taupe (web: --omn-text-secondary)
  tertiary:  '#8A8278',  // warm taupe — WCAG AA 4.94:1 on #121214 (was #6B655E, 3.25:1)
  disabled:  '#4A4A50',  // matches surface.floating — softest readable state
  inverse:   '#121214',  // page-color for text on light/CTA surfaces
  accent:    '#A87D4E',  // bronze — matches accent.primary for inline accent text
} as const

export const accent = {
  primary:   '#A87D4E',  // aged bronze (web: --omn-accent)
  quiet:     '#6E5536',  // hover state, subtle bronze borders (web: --omn-accent-quiet)
  subtle:    'rgba(168,125,78,0.10)',
  muted:     'rgba(168,125,78,0.04)',
  emphasis:  '#C49A5E',  // lighter bronze — recommended/highlighted accent states
} as const

// ── CTA — primary purchase actions only ──────────────────────────────────────
// Reserved exclusively for primary purchase CTAs (web: --omn-cta family).
// Never use for secondary actions, nav links, or decorative elements.
export const cta = {
  primary:  '#E8763A',  // warm burnt orange (web: --omn-cta)
  active:   '#FF8856',  // brightened ~10% for pressed/active state (web: --omn-cta-hover)
  text:     '#121214',  // page-color for maximum contrast on CTA button
} as const

export const border = {
  subtle:   '#2F2F33',  // table rows, secondary dividers — matches surface.raised (web: --omn-border-subtle)
  default:  '#3A3A3F',  // cards, buttons, primary dividers (web: --omn-border-primary)
  strong:   '#4A4A50',  // focused inputs, selected states (web: --omn-border-emphasis)
  accent:   'rgba(168,125,78,0.40)',  // bronze accent border
  hairline: 'rgba(242,237,229,0.06)', // near-invisible structural line on dark surfaces
  gold:     'rgba(168,125,78,0.22)',  // decorative gold rule (dinkus, dividers)
} as const

export const state = {
  success: '#7B9472',  // muted sage (web: --omn-success)
  warning: '#D9A24A',  // amber — unchanged
  danger:  '#D14B3D',  // validation red (web: --omn-error)
  info:    '#7AA0E0',  // informational blue — unchanged
} as const

export const specialty = {
  lockScrim:            'rgba(18,18,20,0.65)',
  chatUser:             '#1E1E21',
  chatCounsel:          'rgba(168,125,78,0.10)',
  glassTint:            'rgba(255,255,255,0.05)',
  white:                '#FFFFFF',
  overlayScrim:         'rgba(0,0,0,0.60)',
  forecastStaleSurface: 'rgba(168,125,78,0.12)',
  heroScrim:            'rgba(18,18,20,1.0)',
  heroScrimTransparent: 'rgba(18,18,20,0)',
  premiumBtnGradient:   ['#2C3D62', '#1A2444'] as const,
  premiumBtnOverlay:    'rgba(80,110,180,0.15)',
} as const

export const gradient = {
  cardBase: ['#1E1E21', '#121214'] as const,
} as const

// ── Decor — generative guilloché line-work ────────────────────────────────────
// Drives the procedural <Decor> engine (engine-turned rosettes, wave lattices,
// concentric rings). Token-only: opacity tiers, stroke fineness, brand tones,
// and film-grain range.
export const decor = {
  // Whole-layer opacity for decorative line-work. Kept deliberately faint —
  // atmosphere, not ornament. Never exceed `presence`.
  opacity: {
    watermark: 0.05,  // full-screen backgrounds & quiet card watermarks
    subtle:    0.08,  // focal content cards
    presence:  0.12,  // premium hero moments only
  },
  // Stroke tones. `bronze` is the brand signature; `light` lifts decor off
  // surfaces where bronze would disappear.
  tone: {
    gold:  accent.primary,  // #A87D4E — bronze, kept as 'gold' key for Decor engine compatibility
    light: '#FFFFFF',
  },
  // Hairline stroke widths (px) — currency-engraving fineness.
  stroke: {
    hairline: 0.75,
    fine:     1,
  },
  // Film-grain noise opacity range — paper-stock texture over the atmosphere.
  grain: {
    min: 0.018,
    max: 0.05,
  },
} as const

// ── Atmosphere glow opacities — all radial glow stopOpacity values ────────────
// Tuned for cool charcoal canvas (surface.deep #121214).
// Every value here replaces a hardcoded string literal in AtmosphericBackground.
// Grouped by glow layer role so they can be adjusted as a system.
export const atmosphere = {
  // Glow color — neutral white, NOT bronze/accent.
  // Premium dark apps use white radial glows at very low opacity for ambient
  // light. Bronze (#A87D4E) is a type/border accent, not a light source color.
  glowColor: '#FFFFFF',

  // Primary radial glow opacity stops — white at these opacities on #121214
  hero:    { center: 0.10, mid: 0.04, outer: 0.01 },  // WelcomeScreen + hero moments
  default: { center: 0.07, mid: 0.03, outer: 0.00 },  // Standard tab screens
  muted:   { center: 0.03, mid: 0.01, outer: 0.00 },  // Info-dense screens

  // Counter glow — neutral white, bottom-center
  counter: { center: 0.05, mid: 0.02 },

  // CTA light pool
  ctaPool: { center: 0.07, mid: 0.02 },

  // Button halo
  halo: { center: 0.12, mid: 0.04 },
} as const

export const tokens = { surface, text, accent, cta, border, state, specialty, gradient, decor, atmosphere } as const
export type DesignTokens = typeof tokens
