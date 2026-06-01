import React, { useState } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'
import { MotiView } from 'moti'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Text, Button } from '../../components/atoms'
import { CityField } from '../../components/molecules'
import { AtmosphericBackground } from '../../components/atmosphere'
import { useProfileStore } from '../../stores/profileStore'
import { surface, space, layout, tokens } from '../../design/tokens'
import { RootStackParamList } from '../../navigation/types'
import type { Place } from '../../api/nominatim'

type BirthCityNavProp = NativeStackNavigationProp<RootStackParamList, 'BirthCity'>

const CITY_HEADER_FROM       = { opacity: 0, translateY: 16 } as const
const CITY_HEADER_ANIMATE    = { opacity: 1, translateY: 0  } as const
const CITY_HEADER_TRANSITION = { type: 'timing' as const, duration: 800, delay: 100 }

const CITY_INPUT_FROM       = { opacity: 0, translateY: 12 } as const
const CITY_INPUT_ANIMATE    = { opacity: 1, translateY: 0  } as const
const CITY_INPUT_TRANSITION = { type: 'timing' as const, duration: 800, delay: 300 }

const CITY_CTA_FROM       = { opacity: 0, translateY: 8 } as const
const CITY_CTA_ANIMATE    = { opacity: 1, translateY: 0 } as const
const CITY_CTA_TRANSITION = { type: 'timing' as const, duration: 800, delay: 500 }

export default function BirthCityScreen() {
  const navigation = useNavigation<BirthCityNavProp>()
  const city       = useProfileStore((s) => s.city)
  const setCity    = useProfileStore((s) => s.setCity)

  const [selectedPlace, setSelectedPlace] = useState<Place | null>(
    city.length > 0
      ? { id: '', name: city, country: '', countryCode: '', lat: 0, lon: 0, displayName: city }
      : null
  )

  const handleCityChange = (place: Place | null) => {
    setSelectedPlace(place)
    setCity(place != null ? place.displayName : '')
  }

  const canContinue = city.length > 0

  return (
    <View style={styles.root} testID="birthcity-screen-root">
      <AtmosphericBackground variant="default" glowPosition="top-center" grain graphicOverlay vignette="bottom" />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={12}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={tokens.text.secondary} />
        </Pressable>
        <View style={styles.content}>
          <MotiView
            from={CITY_HEADER_FROM}
            animate={CITY_HEADER_ANIMATE}
            transition={CITY_HEADER_TRANSITION}
            style={styles.header}
          >
            <Text variant="eyebrow" color="secondary" style={styles.eyebrow}>
              YOUR PLACE
            </Text>
            <Text variant="heading1" color="primary" style={styles.headline}>
              Where were you born?
            </Text>
            <Text variant="readingBody" color="secondary" style={styles.support}>
              The place beneath the sky on that day.
            </Text>
          </MotiView>

          <MotiView
            from={CITY_INPUT_FROM}
            animate={CITY_INPUT_ANIMATE}
            transition={CITY_INPUT_TRANSITION}
            testID="birthcity-input"
          >
            <CityField
              value={selectedPlace}
              onChange={handleCityChange}
              placeholder="Search city..."
            />
          </MotiView>
        </View>

        <MotiView
          from={CITY_CTA_FROM}
          animate={CITY_CTA_ANIMATE}
          transition={CITY_CTA_TRANSITION}
          style={styles.footer}
          testID="birthcity-cta-continue"
        >
          <Button
            label="Continue"
            variant="premium"
            fullWidth
            disabled={!canContinue}
            onPress={() => navigation.navigate('BirthTime')}
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
