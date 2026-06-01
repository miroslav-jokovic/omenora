// <Decor> — procedural guilloché line-work layer.
//
// The single source of decorative graphics for the app. Replaces the legacy
// Background-Graph.svg (193 KB) and Card-Graph.svg (216 KB) Illustrator exports
// with token-driven, themeable, vector-perfect geometry generated in code.
//
// Consumed by AtmosphericBackground (full-screen `wave`) and Card (focal
// `rosette`). Pure presentation — renders nothing until it has real dimensions,
// so it is safe to mount before onLayout resolves. Never animate (atmosphere is
// static per the brand brief; motion lives in foreground elements).

import React, { useMemo } from 'react'
import { StyleSheet, View, ViewStyle } from 'react-native'
import Svg, { G, Path } from 'react-native-svg'

import { decor } from '../../design/tokens'
import { rosettePaths, wavePaths, ringPaths } from './guilloche'

export type DecorPattern   = 'rosette' | 'wave' | 'rings'
export type DecorTone      = keyof typeof decor.tone        // 'gold' | 'light'
export type DecorIntensity = keyof typeof decor.opacity     // 'watermark' | 'subtle' | 'presence'

export interface DecorProps {
  /** Geometry family. `wave` for screens, `rosette` for focal cards. */
  pattern?:   DecorPattern
  width:      number
  height:     number
  /** Stroke colour role. `gold` = brand signature; `light` for colored cards. */
  tone?:      DecorTone
  /** Whole-layer opacity tier. */
  intensity?: DecorIntensity
  /** Deterministic variation so adjacent surfaces don't render identically. */
  seed?:      number
  style?:     ViewStyle
}

export const Decor: React.FC<DecorProps> = ({
  pattern   = 'wave',
  width,
  height,
  tone      = 'gold',
  intensity = 'watermark',
  seed      = 0,
  style,
}) => {
  const paths = useMemo<string[]>(() => {
    if (width <= 0 || height <= 0) return []
    switch (pattern) {
      case 'rosette': return rosettePaths({ width, height, seed })
      case 'rings':   return ringPaths({ width, height, seed })
      case 'wave':
      default:        return wavePaths({ width, height, seed })
    }
  }, [pattern, width, height, seed])

  if (paths.length === 0) return null

  return (
    <View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { opacity: decor.opacity[intensity] }, style]}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <G
          fill="none"
          stroke={decor.tone[tone]}
          strokeWidth={decor.stroke.hairline}
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          {paths.map((d, i) => (
            <Path key={i} d={d} />
          ))}
        </G>
      </Svg>
    </View>
  )
}

export default Decor
