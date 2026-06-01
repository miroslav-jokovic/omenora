import React, { useEffect } from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { LinearGradient } from 'expo-linear-gradient'
import { tokens, radius as radiusTokens, duration } from '../../design/tokens'
import { useReduceMotion } from '../../hooks/useReduceMotion'

type RadiusKey = keyof typeof radiusTokens

export interface SkeletonProps {
  width: number | string
  height?: number
  radius?: RadiusKey
  style?: ViewStyle
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height = 12,
  radius: radiusKey = 'sm',
  style,
}) => {
  const reduceMotion = useReduceMotion()
  const shimmer = useSharedValue(-1)

  useEffect(() => {
    if (reduceMotion) {
      shimmer.value = 0
      return
    }
    shimmer.value = withRepeat(
      withTiming(1, {
        duration: duration.hero * 3,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false,
    )
  }, [reduceMotion])

  const resolvedRadius = radiusTokens[radiusKey]
  const numericWidth = typeof width === 'number' ? width : undefined

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = numericWidth != null
      ? shimmer.value * numericWidth
      : shimmer.value * 200
    return { transform: [{ translateX }] }
  })

  return (
    <View
      style={[
        styles.base,
        { width: width as ViewStyle['width'], height, borderRadius: resolvedRadius },
        style,
      ]}
    >
      {!reduceMotion && (
        <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
          <LinearGradient
            colors={['transparent', tokens.surface.overlay, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: tokens.surface.raised,
    overflow:        'hidden',
  },
})
