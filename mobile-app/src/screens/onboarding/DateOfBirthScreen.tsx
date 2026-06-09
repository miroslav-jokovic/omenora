import React from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'
import { MotiView } from 'moti'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Text, Button } from '../../components/atoms'
import { DateField } from '../../components/molecules'
import { AtmosphericBackground } from '../../components/atmosphere'
import { useProfileStore } from '../../stores/profileStore'
import { calculateLifePathNumber } from '../../utils/lifePathNumber'
import { surface, text, space, layout } from '../../design/tokens'
import { RootStackParamList } from '../../navigation/types'
import { track } from '../../lib/analytics'

type DateOfBirthNavProp = NativeStackNavigationProp<RootStackParamList, 'DateOfBirth'>

const DOB_HEADER_FROM       = { opacity: 0, translateY: 16 } as const
const DOB_HEADER_ANIMATE    = { opacity: 1, translateY: 0  } as const
const DOB_HEADER_TRANSITION = { type: 'timing' as const, duration: 800, delay: 100 }

const DOB_INPUT_FROM       = { opacity: 0, translateY: 12 } as const
const DOB_INPUT_ANIMATE    = { opacity: 1, translateY: 0  } as const
const DOB_INPUT_TRANSITION = { type: 'timing' as const, duration: 800, delay: 300 }

const DOB_CTA_FROM       = { opacity: 0, translateY: 8 } as const
const DOB_CTA_ANIMATE    = { opacity: 1, translateY: 0 } as const
const DOB_CTA_TRANSITION = { type: 'timing' as const, duration: 800, delay: 500 }

const dateStringToDate = (s: string): Date | null => {
  if (!s) return null
  const d = new Date(`${s}T00:00:00`)
  return isNaN(d.getTime()) ? null : d
}

const dateToISO = (d: Date | null): string => {
  if (!d) return ''
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export default function DateOfBirthScreen() {
  const navigation     = useNavigation<DateOfBirthNavProp>()
  const dateOfBirth    = useProfileStore((s) => s.dateOfBirth)
  const setDateOfBirth = useProfileStore((s) => s.setDateOfBirth)
  const setLifePathNumber = useProfileStore((s) => s.setLifePathNumber)

  const canContinue = dateOfBirth.length > 0

  const handleContinue = () => {
    const lpn = calculateLifePathNumber(dateOfBirth)
    setLifePathNumber(lpn)
    track('onboarding_step_completed', { step: 'dob' })
    navigation.navigate('BirthCity')
  }

  return (
    <View style={styles.root} testID="dob-screen-root">
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
            from={DOB_HEADER_FROM}
            animate={DOB_HEADER_ANIMATE}
            transition={DOB_HEADER_TRANSITION}
            style={styles.header}
          >
            <Text variant="eyebrow" color="secondary" style={styles.eyebrow}>
              YOUR DAY
            </Text>
            <Text variant="heading1" color="primary" style={styles.headline}>
              When were you born?
            </Text>
            <Text variant="readingBody" color="secondary" style={styles.support}>
              Your birth date sets your Sun sign and the foundation of your chart.
            </Text>
          </MotiView>

          <MotiView
            from={DOB_INPUT_FROM}
            animate={DOB_INPUT_ANIMATE}
            transition={DOB_INPUT_TRANSITION}
            testID="dob-input"
          >
            <DateField
              value={dateStringToDate(dateOfBirth)}
              onChange={(date) => setDateOfBirth(dateToISO(date))}
              maximumDate={new Date()}
            />
          </MotiView>
        </View>

        <MotiView
          from={DOB_CTA_FROM}
          animate={DOB_CTA_ANIMATE}
          transition={DOB_CTA_TRANSITION}
          style={styles.footer}
          testID="dob-cta-continue"
        >
          <Button
            label="Continue"
            variant="premium"
            fullWidth
            disabled={!canContinue}
            onPress={handleContinue}
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
