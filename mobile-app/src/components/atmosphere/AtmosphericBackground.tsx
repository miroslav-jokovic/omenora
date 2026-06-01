// Screen-level atmospheric background. Renders 5 static layers (base gradient +
// primary glow + optional counter glow + optional grain + optional vignette) below
// children. Variant controls glow intensity. Token-only; never animate.

import React from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Defs, Rect, RadialGradient, Stop } from 'react-native-svg'
import Decor from './Decor'

import { accent, surface, decor } from '../../design/tokens'

export interface AtmosphericBackgroundProps {
  /**
   * - standard — universal app background: top-center + bottom-center glows,
   *              grain on, graphic SVG on. Use this on ALL tab screens and
   *              any screen that should match the app's consistent atmosphere.
   * - hero     — stronger glow intensity for dramatic onboarding moments.
   * - default  — manual control; use glowPosition + counterGlow props.
   * - muted    — quieter glow for information-dense screens.
   */
  variant?:        'standard' | 'hero' | 'default' | 'muted'
  glowPosition?:   'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center'
  counterGlow?:    boolean
  ctaLightPool?:   boolean   // dedicated warm light pool sized to sit behind a CTA in the lower third
  buttonHalo?:     boolean   // tight warm halo positioned at lower-third center — sit a CTA in this for "lit object" effect
  grain?:          boolean
  graphicOverlay?: boolean   // renders the generative guilloché wave lattice (<Decor>) as a blended decorative layer
  vignette?:       'none' | 'bottom' | 'top'
  children?:       React.ReactNode
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('screen')

// Deterministic film-grain noise — static, low-density tiny dots layered over
// the radial gradient atmosphere to suggest paper-stock texture.
const NOISE = (() => {
  let seed = 0xdeadbeef
  const out: Array<{ cx: number; cy: number; r: number; opacity: number }> = []
  for (let i = 0; i < 320; i++) {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff
    const cx = seed % SCREEN_W
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff
    const cy = seed % SCREEN_H
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff
    out.push({ cx, cy, r: 0.7, opacity: decor.grain.min + ((seed % 10) / 10) * (decor.grain.max - decor.grain.min) })
  }
  return out
})()

// Opacity stops per variant: [center, 0.35, 0.70, edge]
// 'standard' maps to 'default' intensity — two glows together provide sufficient presence
const GLOW_STOPS: Record<'hero' | 'default' | 'muted', [string, string, string, string]> = {
  hero:    ['0.55', '0.22', '0.06', '0'],
  default: ['0.25', '0.10', '0.03', '0'],
  muted:   ['0.12', '0.05', '0.02', '0'],
}

// Primary glow radius per variant (as fraction of SCREEN_W)
const GLOW_RADIUS: Record<'hero' | 'default' | 'muted', number> = {
  hero:    0.95,
  default: 0.75,
  muted:   0.55,
}

// Glow center coordinates as fraction of screen dimensions
const GLOW_COORDS: Record<
  'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center',
  { cx: number; cy: number }
> = {
  'top-left':      { cx: SCREEN_W * 0.28, cy: SCREEN_H * 0.32 },
  'top-right':     { cx: SCREEN_W * 0.72, cy: SCREEN_H * 0.32 },
  'top-center':    { cx: SCREEN_W * 0.50, cy: SCREEN_H * -0.05 },
  'bottom-left':   { cx: SCREEN_W * 0.28, cy: SCREEN_H * 0.75 },
  'bottom-right':  { cx: SCREEN_W * 0.72, cy: SCREEN_H * 0.75 },
  'bottom-center': { cx: SCREEN_W * 0.50, cy: SCREEN_H * 1.05 }, // mirror of top-center
}

// Opposite corner mapping for counter glow
const OPPOSITE_CORNER: Record<
  'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center',
  'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center'
> = {
  'top-left':      'bottom-right',
  'top-right':     'bottom-left',
  'top-center':    'bottom-center',  // now maps to symmetric bottom-center
  'bottom-left':   'top-right',
  'bottom-right':  'top-left',
  'bottom-center': 'top-center',
}

export default function AtmosphericBackground({
  variant         = 'standard',
  glowPosition    = 'top-center',
  counterGlow     = false,
  ctaLightPool    = false,
  buttonHalo      = false,
  grain           = true,
  graphicOverlay  = false,
  vignette        = 'none',
  children,
}: AtmosphericBackgroundProps) {
  // 'standard' preset: top-center + bottom-center glows, grain, graphic SVG
  const isStandard    = variant === 'standard'
  const resolvedVariant: 'hero' | 'default' | 'muted' = isStandard ? 'default' : variant
  const resolvedPosition  = isStandard ? 'top-center'    : glowPosition
  const resolvedCounter   = isStandard ? true            : counterGlow
  const resolvedGrain     = isStandard ? true            : grain
  const resolvedGraphic   = isStandard ? true            : graphicOverlay

  const stops       = GLOW_STOPS[resolvedVariant]
  const glowRadius  = SCREEN_W * GLOW_RADIUS[resolvedVariant]
  const primary     = GLOW_COORDS[resolvedPosition]
  const counterPos  = GLOW_COORDS[OPPOSITE_CORNER[resolvedPosition]]
  const counterR    = SCREEN_W * 0.75  // bottom-center counter glow needs wider radius to fill screen base

  return (
    <>
      {/* Absolute layers — renders below children */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Layer 1 — Base linear gradient: surface.deep → base → deep, vertical */}
        <LinearGradient
          colors={[surface.deep, surface.base, surface.deep]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Layer 1b — Generative guilloché wave lattice (standard: always on; manual: opt-in) */}
        {resolvedGraphic && (
          <Decor
            pattern="wave"
            tone="gold"
            intensity="watermark"
            width={SCREEN_W}
            height={SCREEN_H}
          />
        )}

        {/* Layers 2–4 — Radial glows + optional grain via SVG */}
        <Svg
          style={StyleSheet.absoluteFill}
          viewBox={`0 0 ${SCREEN_W} ${SCREEN_H}`}
          preserveAspectRatio="xMidYMid slice"
        >
          <Defs>
            <RadialGradient
              id="atmGlowPrimary"
              cx={primary.cx}
              cy={primary.cy}
              rx={glowRadius}
              ry={glowRadius}
              fx={primary.cx}
              fy={primary.cy}
              gradientUnits="userSpaceOnUse"
            >
              <Stop offset="0"    stopColor={accent.primary} stopOpacity={stops[0]} />
              <Stop offset="0.35" stopColor={accent.primary} stopOpacity={stops[1]} />
              <Stop offset="0.7"  stopColor={accent.primary} stopOpacity={stops[2]} />
              <Stop offset="1"    stopColor={accent.primary} stopOpacity={stops[3]} />
            </RadialGradient>
            {resolvedCounter && (
              <RadialGradient
                id="atmGlowCounter"
                cx={counterPos.cx}
                cy={counterPos.cy}
                rx={counterR}
                ry={counterR}
                fx={counterPos.cx}
                fy={counterPos.cy}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0"   stopColor={accent.primary} stopOpacity="0.20" />
                <Stop offset="0.5" stopColor={accent.primary} stopOpacity="0.07" />
                <Stop offset="1"   stopColor={accent.primary} stopOpacity="0"    />
              </RadialGradient>
            )}
            {buttonHalo && (
              <RadialGradient
                id="glowButtonHalo"
                cx={SCREEN_W * 0.5}
                cy={SCREEN_H * 0.82}
                rx={SCREEN_W * 0.45}
                ry={SCREEN_H * 0.06}
                fx={SCREEN_W * 0.5}
                fy={SCREEN_H * 0.82}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0"   stopColor={accent.primary} stopOpacity="0.55" />
                <Stop offset="0.5" stopColor={accent.primary} stopOpacity="0.18" />
                <Stop offset="1"   stopColor={accent.primary} stopOpacity="0"    />
              </RadialGradient>
            )}
            {ctaLightPool && (
              <RadialGradient
                id="glowCTAPool"
                cx={SCREEN_W * 0.5}
                cy={SCREEN_H * 0.82}
                rx={SCREEN_W * 0.7}
                ry={SCREEN_H * 0.20}
                fx={SCREEN_W * 0.5}
                fy={SCREEN_H * 0.82}
                gradientUnits="userSpaceOnUse"
              >
                <Stop offset="0"   stopColor={accent.primary} stopOpacity="0.32" />
                <Stop offset="0.5" stopColor={accent.primary} stopOpacity="0.10" />
                <Stop offset="1"   stopColor={accent.primary} stopOpacity="0"    />
              </RadialGradient>
            )}
          </Defs>

          {/* Layer 2 — Primary glow */}
          <Rect x="0" y="0" width={SCREEN_W} height={SCREEN_H} fill="url(#atmGlowPrimary)" />

          {/* Layer 3 — Counter glow (standard: bottom-center; manual: opposite corner) */}
          {resolvedCounter && (
            <Rect x="0" y="0" width={SCREEN_W} height={SCREEN_H} fill="url(#atmGlowCounter)" />
          )}

          {/* Layer 3b — CTA light pool (optional): wide elliptical warm pool at 82% screen height */}
          {ctaLightPool && (
            <Rect x="0" y="0" width={SCREEN_W} height={SCREEN_H} fill="url(#glowCTAPool)" />
          )}

          {/* Layer 3c — Button halo (optional): tight bright ellipse hugging the CTA button */}
          {buttonHalo && (
            <Rect x="0" y="0" width={SCREEN_W} height={SCREEN_H} fill="url(#glowButtonHalo)" />
          )}

          {/* Layer 4 — Film grain (standard: always on; manual: opt-in) */}
          {resolvedGrain && NOISE.map((n, i) => (
            <Circle
              key={i}
              cx={n.cx}
              cy={n.cy}
              r={n.r}
              fill={`rgba(255,255,255,${n.opacity.toFixed(3)})`}
            />
          ))}
        </Svg>

        {/* Layer 5 — Vignette (optional) */}
        {vignette === 'bottom' && (
          <LinearGradient
            colors={['transparent', surface.deep]}
            locations={[0, 1]}
            style={[styles.vignette, styles.vignetteBottom]}
            pointerEvents="none"
          />
        )}
        {vignette === 'top' && (
          <LinearGradient
            colors={[surface.deep, 'transparent']}
            locations={[0, 1]}
            style={[styles.vignette, styles.vignetteTop]}
            pointerEvents="none"
          />
        )}
      </View>

      {/* Layer 6 — Children rendered on top of all atmosphere layers */}
      {children != null && (
        <View style={StyleSheet.absoluteFill}>
          {children}
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create({
  vignette: {
    position: 'absolute',
    left:     0,
    right:    0,
    height:   SCREEN_H * 0.42,
  },
  vignetteBottom: {
    bottom: 0,
  },
  vignetteTop: {
    top: 0,
  },
})
