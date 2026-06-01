import React, { useEffect, useState } from 'react'
import { Dimensions, Pressable, View, StyleSheet } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedKeyboard,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
import { useReduceMotion } from '../../hooks/useReduceMotion'
import { tokens, space, radius, layout } from '../../design/tokens'

const SCREEN_HEIGHT = Dimensions.get('window').height

export interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  height?: number
  children: React.ReactNode
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  height,
  children,
}) => {
  const reduceMotion = useReduceMotion()
  const translateY = useSharedValue(SCREEN_HEIGHT)
  const [shouldRender, setShouldRender] = useState(visible)
  const keyboard = useAnimatedKeyboard()

  useEffect(() => {
    if (visible) {
      setShouldRender(true)
      translateY.value = reduceMotion
        ? 0
        : withSpring(0, { damping: 18, stiffness: 180 })
    } else {
      const onComplete = () => setShouldRender(false)
      translateY.value = reduceMotion
        ? SCREEN_HEIGHT
        : withTiming(SCREEN_HEIGHT, { duration: 300 }, (finished) => {
            if (finished) runOnJS(onComplete)()
          })
    }
  }, [visible, reduceMotion])

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY
      }
    })
    .onEnd((event) => {
      if (event.translationY > SCREEN_HEIGHT * 0.3) {
        runOnJS(onClose)()
      } else {
        translateY.value = withSpring(0, { damping: 18, stiffness: 180 })
      }
    })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    marginBottom: keyboard.height.value,
  }))

  if (!shouldRender) return null

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sheet, height != null && { height }, animatedStyle]}>
          <View style={styles.handle} />
          <View style={styles.content}>
            {children}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: tokens.specialty.lockScrim,
  },
  sheet: {
    backgroundColor:      tokens.surface.floating,
    borderTopLeftRadius:  radius.xl,
    borderTopRightRadius: radius.xl,
  },
  handle: {
    width:           36,
    height:          4,
    backgroundColor: tokens.border.strong,
    borderRadius:    radius.pill,
    alignSelf:       'center',
    marginTop:       space['2'],
    marginBottom:    space['3'],
  },
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom:     space['6'],
  },
})
