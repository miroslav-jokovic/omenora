import React from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'
import { MotiView } from 'moti'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Text, Button } from '../../components/atoms'
import { TimeField } from '../../components/molecules'
import { AtmosphericBackground } from '../../components/atmosphere'
import { useProfileStore } from '../../stores/profileStore'
import { surface, text, space, layout } from '../../design/tokens'
import { RootStackParamList } from '../../navigation/types'
import { track } from '../../lib/analytics'

type BirthTimeNavProp = NativeStackNavigationProp<RootStackParamList, 'BirthTime'>

const TIME_HEADER_FROM       = { opacity: 0, translateY: 16 } as const
const TIME_HEADER_ANIMATE    = { opacity: 1, translateY: 0  } as const
const TIME_HEADER_TRANSITION = { type: 'timing' as const, duration: 800, delay: 100 }

const TIME_INPUT_FROM       = { opacity: 0, translateY: 12 } as const
const TIME_INPUT_ANIMATE    = { opacity: 1, translateY: 0  } as const
const TIME_INPUT_TRANSITION = { type: 'timing' as const, duration: 800, delay: 300 }

const TIME_CTA_FROM       = { opacity: 0, translateY: 8 } as const
const TIME_CTA_ANIMATE    = { opacity: 1, translateY: 0 } as const
const TIME_CTA_TRANSITION = { type: 'timing' as const, duration: 800, delay: 500 }

const timeStringToDate = (s: string): Date | null => {
  if (!s) return null
  const parts = s.split(':')
  if (parts.length < 2) return null
  const d = new Date()
  d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0)
  return d
}

const dateToTimeString = (d: Date | null): string => {
  if (!d) return ''
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

export default function BirthTimeScreen() {
  const navigation     = useNavigation<BirthTimeNavProp>()
  const timeOfBirth    = useProfileStore((s) => s.timeOfBirth)
  const setTimeOfBirth = useProfileStore((s) => s.setTimeOfBirth)

  const handleTimeChange = (date: Date | null) => {
    setTimeOfBirth(dateToTimeString(date))
  }

  return (
    <View style={styles.root} testID="birthtime-screen-root">
      <AtmosphericBackground variant="default" glowPosition="top-center" grain graphicOverlay vignette="bottom" />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={12}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={text.secondary} />
        </Pressable>
        <View style={styles.content}>
          <MotiView
            from={TIME_HEADER_FROM}
            animate={TIME_HEADER_ANIMATE}
            transition={TIME_HEADER_TRANSITION}
            style={styles.header}
          >
            <Text variant="eyebrow" color="secondary" style={styles.eyebrow}>
              YOUR HOUR
            </Text>
            <Text variant="heading1" color="primary" style={styles.headline}>
              What time were you born?
            </Text>
            <Text variant="readingBody" color="secondary" style={styles.support}>
              Optional — your exact time sets your Rising sign and house placements. Even an estimate helps.
            </Text>
          </MotiView>

          <MotiView
            from={TIME_INPUT_FROM}
            animate={TIME_INPUT_ANIMATE}
            transition={TIME_INPUT_TRANSITION}
            testID="birthtime-input"
          >
            <TimeField
              value={timeStringToDate(timeOfBirth)}
              onChange={handleTimeChange}
              showUnknownToggle
            />
          </MotiView>
        </View>

        <MotiView
          from={TIME_CTA_FROM}
          animate={TIME_CTA_ANIMATE}
          transition={TIME_CTA_TRANSITION}
          style={styles.footer}
          testID="birthtime-cta-continue"
        >
          <Button
            label="Continue"
            variant="premium"
            fullWidth
            onPress={() => { track('onboarding_step_completed', { step: 'time' }); navigation.navigate('Calculating') }}
          />
        </MotiView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: surface.deep,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex:              1,
    justifyContent:    'center',
    paddingHorizontal: layout.screenPadding,
    gap:               space['8'],
  },
  header: {
    gap: space['3'],
  },
  eyebrow: {
    // letterSpacing provided by typeScale.eyebrow (tracking.caps)
  },
  headline: {
    marginTop: space['1'],
  },
  support: {
    marginTop: space['1'],
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom:     space['6'],
  },
  backButton: {
    alignSelf:      'flex-start',
    minWidth:       layout.tapTarget,
    minHeight:      layout.tapTarget,
    alignItems:     'center',
    justifyContent: 'center',
    marginLeft:     layout.screenPadding - space['2'],
    marginTop:      space['2'],
  },
})
