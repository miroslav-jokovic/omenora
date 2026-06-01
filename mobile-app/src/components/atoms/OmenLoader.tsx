// OmenLoader — the app's loading mark.
//
// Replaces the legacy PhoenixLoader (bird imagery is retired per the brand
// brief). Draws a guilloché rosette — the same engine-turned geometry used for
// premium card decor — that traces itself in, holds, and fades while slowly
// rotating. Slow and considered (no overshoot, no bounce), matching the motion
// philosophy: one calm, breathing moment rather than busy micro-interaction.

import React, { useEffect, useMemo, useRef } from 'react'
import { Animated, Easing, ViewStyle } from 'react-native'
import Svg, { G, Path } from 'react-native-svg'
import { tokens } from '../../design/tokens'
import { rosettePaths } from '../atmosphere/guilloche'

// react-native-svg 15 supports pathLength at runtime but its type defs omit it
const ExtendedPath = Path as React.ComponentType<
  React.ComponentProps<typeof Path> & { pathLength?: number }
>
const AnimatedPath = Animated.createAnimatedComponent(ExtendedPath)
const AnimatedG = Animated.createAnimatedComponent(G)

const VIEWBOX = 100

interface OmenLoaderProps {
  size?:     number
  color?:    string
  duration?: number
  style?:    ViewStyle
}

export const OmenLoader: React.FC<OmenLoaderProps> = ({
  size     = 80,
  color    = tokens.accent.primary,
  duration = 3600,
  style,
}) => {
  const paths = useMemo(
    () => rosettePaths({ width: VIEWBOX, height: VIEWBOX, rings: 4, petals: 8 }),
    [],
  )

  const dashoffset = useRef(new Animated.Value(1)).current
  const spin       = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const draw = Math.round(duration * 0.55)
    const hold = Math.round(duration * 0.25)
    const fade = Math.round(duration * 0.20)

    const trace = Animated.loop(
      Animated.sequence([
        Animated.timing(dashoffset, {
          toValue:         0,
          duration:        draw,
          easing:          Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.delay(hold),
        Animated.timing(dashoffset, {
          toValue:         1,
          duration:        fade,
          easing:          Easing.in(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    )

    // Continuous, very slow rotation — life without distraction.
    const rotate = Animated.loop(
      Animated.timing(spin, {
        toValue:         1,
        duration:        duration * 3,
        easing:          Easing.linear,
        useNativeDriver: false,
      }),
    )

    trace.start()
    rotate.start()
    return () => {
      trace.stop()
      rotate.stop()
    }
  }, [duration])

  const rotation = spin.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <Animated.View style={[{ width: size, height: size }, style]}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        accessibilityLabel="Loading"
        accessibilityRole="image"
      >
        <AnimatedG
          originX={VIEWBOX / 2}
          originY={VIEWBOX / 2}
          rotation={rotation as unknown as number}
        >
          {paths.map((d, i) => (
            <AnimatedPath
              key={i}
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={0.6}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeOpacity={0.85 - i * 0.12}
              strokeDasharray={[1]}
              strokeDashoffset={dashoffset as unknown as number}
              pathLength={1}
            />
          ))}
        </AnimatedG>
      </Svg>
    </Animated.View>
  )
}

export default OmenLoader
