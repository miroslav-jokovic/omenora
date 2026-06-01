import React from 'react'
import { View, ImageBackground, StyleSheet, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Text } from '../atoms/Text'
import { ZodiacSymbol } from '../atoms/ZodiacSymbol'
import { specialty, text } from '../../design/tokens/colors'
import { space } from '../../design/tokens/spacing'

const PHASE_IMAGES: Record<string, number> = {
  'New Moon':       require('../../../assets/hero/moon-phases/hero_new_moon.webp'),
  'Waxing Crescent':require('../../../assets/hero/moon-phases/hero_waxing_crescent.webp'),
  'First Quarter':  require('../../../assets/hero/moon-phases/hero_first_quarter.webp'),
  'Waxing Gibbous': require('../../../assets/hero/moon-phases/hero_waxing_gibbous.webp'),
  'Full Moon':      require('../../../assets/hero/moon-phases/hero_full_moon.webp'),
  'Waning Gibbous': require('../../../assets/hero/moon-phases/hero_waning_gibbous.webp'),
  'Last Quarter':   require('../../../assets/hero/moon-phases/hero_last_quarter.webp'),
  'Waning Crescent':require('../../../assets/hero/moon-phases/hero_waning_crescent.webp'),
}

const FALLBACK_IMAGE = PHASE_IMAGES['New Moon']

export interface MoonPhaseHeroProps {
  moonPhase:     string
  archetypeName?: string
  signName:       string | null
  greeting:       string
  formattedDate:  string
  style?:         ViewStyle
}

export default function MoonPhaseHero({
  moonPhase,
  signName,
  greeting,
  formattedDate,
  style,
}: MoonPhaseHeroProps) {
  const source = PHASE_IMAGES[moonPhase] ?? FALLBACK_IMAGE

  return (
    <View style={[styles.outer, style]}>
      <ImageBackground
        source={source}
        resizeMode="cover"
        style={StyleSheet.absoluteFill}
      />

      {/* Scrim: transparent top → opaque warm-black bottom */}
      <LinearGradient
        colors={[
          specialty.heroScrimTransparent,
          specialty.heroScrimTransparent,
          specialty.heroScrim,
          specialty.heroScrim,
        ]}
        locations={[0, 0.25, 0.8, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Content layer */}
      <View style={[StyleSheet.absoluteFill, styles.content]}>

        {/* Moon phase caption — top-right */}
        <View style={styles.phaseCaption}>
          <Text variant="subMicro" style={styles.phaseCaptionText}>
            {moonPhase.toUpperCase()}
          </Text>
        </View>

        {/* Greeting + date — bottom-left */}
        <View style={styles.greetingBlock}>
          <View style={styles.greetingRow}>
            <Text variant="display2" style={styles.greetingText}>
              {greeting}
            </Text>
            {signName != null && (
              <ZodiacSymbol
                sign={signName}
                size={28}
                opacity={0.65}
                style={styles.zodiacSymbol}
              />
            )}
          </View>
          <Text variant="caption" style={styles.dateText}>
            {formattedDate}
          </Text>
        </View>

      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  outer: {
    height:   320,
    overflow: 'hidden',
  },
  content: {
    padding: 0,
  },
  phaseCaption: {
    position: 'absolute',
    top:      space['5'],
    right:    space['5'],
  },
  phaseCaptionText: {
    color:         text.primary,
    opacity:       0.70,
    letterSpacing: 1.2,
  },
  greetingBlock: {
    position: 'absolute',
    bottom:   space['5'],
    left:     space['5'],
    right:    space['5'],
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems:    'flex-end',
  },
  greetingText: {
    flex:  1,  // prevents zodiac symbol overflow on long names
    color: text.primary,
  },
  zodiacSymbol: {
    marginLeft: space['2'],
  },
  dateText: {
    color:     text.secondary,
    marginTop: space['1'],
  },
})
