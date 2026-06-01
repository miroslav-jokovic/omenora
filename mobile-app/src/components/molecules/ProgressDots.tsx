import React, { useEffect } from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated'
import { tokens, space, radius, duration } from '../../design/tokens'
import { useReduceMotion } from '../../hooks/useReduceMotion'

export interface ProgressDotsProps {
  total: number
  current: number
  style?: ViewStyle
}

interface DotProps {
  active: boolean
  reduceMotion: boolean
}

const Dot: React.FC<DotProps> = ({ active, reduceMotion }) => {
  const progress = useSharedValue(active ? 1 : 0)

  useEffect(() => {
    const target = active ? 1 : 0
    if (reduceMotion) {
      progress.value = target
    } else {
      progress.value = withTiming(target, { duration: duration.transition })
    }
  }, [active, reduceMotion])

  const animatedStyle = useAnimatedStyle(() => {
    const size = interpolate(progress.value, [0, 1], [6, 8])
    const bg = interpolateColor(
      progress.value,
      [0, 1],
      [tokens.border.default, tokens.accent.primary],
    )
    return {
      width:           size,
      height:          size,
      backgroundColor: bg,
      borderRadius:    radius.pill,
    }
  })

  return <Animated.View style={animatedStyle} />
}

export const ProgressDots: React.FC<ProgressDotsProps> = ({
  total,
  current,
  style,
}) => {
  const reduceMotion = useReduceMotion()

  if (total === 0) return <View style={[styles.container, style]} />

  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: total }, (_, i) => (
        <Dot
          key={i}
          active={i === current}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    gap:            space['2'],
    justifyContent: 'center',
    alignItems:     'center',
  },
})
