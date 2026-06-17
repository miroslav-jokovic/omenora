import React, { useEffect, useRef, useState } from 'react'
import { Animated, AccessibilityInfo, StyleSheet, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ScreenWrapper } from '../../components/templates'
import { Text } from '../../components/atoms'
import { useProfileStore } from '../../stores/profileStore'
import { tokens, space } from '../../design/tokens'
import { RootStackParamList } from '../../navigation/types'

type ChartPreparationNavProp = NativeStackNavigationProp<RootStackParamList, 'ChartPreparation'>

// Each step: delay (ms after mount) and copy
const STEPS = [
  { key: 'planets',   text: 'Mapping all 10 planets from your birth moment' },
  { key: 'sun',       text: null }, // filled dynamically from sunSign
  { key: 'forecast',  text: 'Preparing your 90-day window' },
] as const

const STEP_DURATION    = 500  // fade-in duration per line
const STEP_STAGGER     = 700  // delay between lines
const SETTLE_DELAY     = 600  // wait after third line before navigating
// Total dwell (standard): 0 + 500 + 700 + 500 + 700 + 500 + 600 = 3500ms → clamp to 3200
// Clamp auto-nav to 3200ms total
const NAV_TIMEOUT      = 3200
const REDUCED_MOTION_DWELL = 1200

export default function ChartPreparationScreen() {
  const navigation = useNavigation<ChartPreparationNavProp>()
  const sunSign    = useProfileStore((s) => s.sunSign)

  const line2Text = sunSign != null && sunSign.length > 0
    ? `Reading your ${sunSign} Sun against today's sky`
    : 'Reading your chart against today\'s sky'

  const lines = [STEPS[0].text, line2Text, STEPS[2].text]

  // Three Animated values — opacity + translateY
  const anims = useRef(
    lines.map(() => ({
      opacity:    new Animated.Value(0),
      translateY: new Animated.Value(8),
    }))
  ).current

  const [reducedMotion, setReducedMotion] = useState(false)
  const navigated = useRef(false)

  const navigateNext = () => {
    if (navigated.current) return
    navigated.current = true
    navigation.replace('PremiumTeaser')
  }

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      setReducedMotion(enabled)

      if (enabled) {
        // Show all lines immediately, dwell then navigate
        anims.forEach((a) => {
          a.opacity.setValue(1)
          a.translateY.setValue(0)
        })
        const t = setTimeout(navigateNext, REDUCED_MOTION_DWELL)
        return () => clearTimeout(t)
      }

      // Standard: stagger fade-in per line, then navigate
      const animations = anims.map((a, i) =>
        Animated.parallel([
          Animated.timing(a.opacity, {
            toValue:         1,
            duration:        STEP_DURATION,
            delay:           i * STEP_STAGGER,
            useNativeDriver: true,
          }),
          Animated.timing(a.translateY, {
            toValue:         0,
            duration:        STEP_DURATION,
            delay:           i * STEP_STAGGER,
            useNativeDriver: true,
          }),
        ])
      )

      Animated.sequence([
        Animated.parallel(animations),
        Animated.delay(SETTLE_DELAY),
      ]).start(navigateNext)

      const safetyNet = setTimeout(navigateNext, NAV_TIMEOUT)
      return () => clearTimeout(safetyNet)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <ScreenWrapper scroll={false} padded background="base">
      <View style={styles.content}>
        <Text variant="eyebrow" color="secondary" style={styles.eyebrow}>
          PREPARING YOUR READING
        </Text>
        <View style={styles.lines}>
          {lines.map((text, i) => (
            <Animated.View
              key={i}
              style={[
                styles.lineRow,
                reducedMotion
                  ? undefined
                  : {
                      opacity:   anims[i].opacity,
                      transform: [{ translateY: anims[i].translateY }],
                    },
              ]}
            >
              <View style={styles.checkWrapper}>
                <Check size={16} color={tokens.accent.emphasis} />
              </View>
              <Text variant="bodyLarge" color="primary" style={styles.lineText}>
                {text}
              </Text>
            </Animated.View>
          ))}
        </View>
      </View>
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  content: {
    flex:            1,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: space['4'],
  },
  eyebrow: {
    marginBottom: space['10'],
    textAlign:    'center',
  },
  lines: {
    gap:      space['6'],
    alignSelf: 'stretch',
  },
  lineRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           space['3'],
  },
  checkWrapper: {
    marginTop: 2,
    flexShrink: 0,
  },
  lineText: {
    flex: 1,
  },
})
