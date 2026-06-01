// ── Font families — Onest + Geist Mono only ──────────────────────────────────
// Aligned to web design system (OMENORA_DESIGN_SYSTEM.md §2).
// Onest: geometric humanist sans, weights 300–600. Used for all display, heading,
// body, and UI roles.
// Geist Mono: technical voice — eyebrows, labels, prices, mono caps.
export const fontFamily = {
  light:     'Onest_300Light',
  regular:   'Onest_400Regular',
  medium:    'Onest_500Medium',
  semiBold:  'Onest_600SemiBold',
  mono:      'GeistMono_400Regular',
  monoMedium:'GeistMono_500Medium',
  // Semantic aliases — consumed by typeScale below
  display:   'Onest_300Light',
  displayMedium: 'Onest_500Medium',
  ui:        'Onest_400Regular',
  uiMedium:  'Onest_500Medium',
  uiSemiBold:'Onest_600SemiBold',
} as const

// ── Semantic tracking scale ────────────────────────────────────────────────
// Letter spacing values in points (React Native equivalent of em-based web values).
// Aligned to web design system tracking tokens (§2 — letter spacing).
export const tracking = {
  tight:  -1.4,  // display: text-5xl+ (hero, large display)
  snug:   -1.0,  // display: text-3xl to text-4xl
  normal: -0.5,  // subhead: text-xl to text-2xl
  body:   -0.2,  // body copy: text-base to text-lg
  mono:    0.3,  // Geist Mono body
  caps:    2.0,  // Geist Mono caps eyebrows/labels
} as const

// ── Type scale — aligned to web design system (§2 type scale) ────────────────
// Mobile hero scales down per web spec: --text-6xl (76px web) → 48px mobile.
// Body sizes unchanged: 15–17px (closer reading distance on mobile).
export const typeScale = {
  // ── Display — Onest 300 Light ──────────────────────────────────────────
  hero:     { fontFamily: fontFamily.display,       fontSize: 48, lineHeight: 56, letterSpacing: tracking.tight  },  // web text-6xl → 48px mobile
  display1: { fontFamily: fontFamily.display,       fontSize: 38, lineHeight: 46, letterSpacing: tracking.snug   },  // web text-3xl
  display2: { fontFamily: fontFamily.display,       fontSize: 30, lineHeight: 38, letterSpacing: tracking.snug   },  // web text-2xl

  // ── Headings — Onest 500 Medium ────────────────────────────────────────
  heading1: { fontFamily: fontFamily.displayMedium, fontSize: 24, lineHeight: 32, letterSpacing: tracking.normal },  // web text-xl
  heading2: { fontFamily: fontFamily.displayMedium, fontSize: 20, lineHeight: 28, letterSpacing: tracking.normal },  // sub-heading

  // ── Lede / subhead — Onest 400 Regular ────────────────────────────────
  lede:     { fontFamily: fontFamily.ui,            fontSize: 19, lineHeight: 30, letterSpacing: tracking.body   },  // web text-lg lede paragraphs
  bodyLarge:{ fontFamily: fontFamily.ui,            fontSize: 17, lineHeight: 26, letterSpacing: tracking.body   },  // web text-md
  body:     { fontFamily: fontFamily.ui,            fontSize: 15, lineHeight: 24, letterSpacing: tracking.body   },  // web text-base

  // ── UI emphasis — Onest 500 Medium ────────────────────────────────────
  labelLarge:{ fontFamily: fontFamily.uiMedium,     fontSize: 17, lineHeight: 24, letterSpacing: tracking.body   },  // CTA labels
  label:     { fontFamily: fontFamily.uiMedium,     fontSize: 13, lineHeight: 18, letterSpacing: tracking.body   },  // UI labels

  // ── Small — Onest 400 Regular ─────────────────────────────────────────
  caption:   { fontFamily: fontFamily.ui,           fontSize: 12, lineHeight: 16, letterSpacing: tracking.body   },

  // ── Mono — Geist Mono — eyebrows, labels, prices ──────────────────────
  eyebrow:  { fontFamily: fontFamily.mono,          fontSize: 11, lineHeight: 14, letterSpacing: tracking.caps,  textTransform: 'uppercase' as const },
  micro:    { fontFamily: fontFamily.uiSemiBold,    fontSize: 11, lineHeight: 14, letterSpacing: tracking.caps,  textTransform: 'uppercase' as const },
  subMicro: { fontFamily: fontFamily.uiSemiBold,    fontSize: 10, lineHeight: 14, letterSpacing: tracking.caps,  textTransform: 'uppercase' as const },
  monoBody: { fontFamily: fontFamily.mono,          fontSize: 13, lineHeight: 18, letterSpacing: tracking.mono   },  // prices, metadata, timestamps

  // ── Reading body — Onest 400 (replaces CormorantGaramond) ─────────────
  readingBody: { fontFamily: fontFamily.ui,         fontSize: 17, lineHeight: 28, letterSpacing: tracking.body   },
} as const
