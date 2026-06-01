import React from 'react'
import { View, StyleSheet } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { MotiView } from 'moti'
import { Button, Text, ZodiacSymbol } from '../../components/atoms'
import { Card } from '../../components/organisms'
import { AtmosphericBackground } from '../../components/atmosphere'
import { tokens, space, layout } from '../../design/tokens'
import { RootStackParamList } from '../../navigation/types'

type BigThreeRevealNavProp   = NativeStackNavigationProp<RootStackParamList, 'BigThreeReveal'>
type BigThreeRevealRouteProp = RouteProp<RootStackParamList, 'BigThreeReveal'>

const CARD_DURATION   = 400
const CARD_STAGGER    = 60
const ARCHETYPE_DELAY = 700

const CARD_FROM       = { opacity: 0, translateY: 8 } as const
const CARD_ANIMATE    = { opacity: 1, translateY: 0 } as const

const ARCH_FROM       = { opacity: 0 } as const
const ARCH_ANIMATE    = { opacity: 1 } as const

const FOOTER_FROM     = { opacity: 0 } as const
const FOOTER_ANIMATE  = { opacity: 1 } as const

const PLACEMENTS = (sunSign: string, moonSign: string, risingSign: string) => [
  { label: 'Sun',    sign: sunSign    },
  { label: 'Moon',   sign: moonSign   },
  { label: 'Rising', sign: risingSign },
]

export default function BigThreeRevealScreen() {
  const navigation = useNavigation<BigThreeRevealNavProp>()
  const route      = useRoute<BigThreeRevealRouteProp>()
  const { sunSign, moonSign, risingSign, archetypeName } = route.params
  const insets = useSafeAreaInsets()

  const cards = PLACEMENTS(sunSign, moonSign, risingSign)

  return (
    <View style={styles.root}>
      <AtmosphericBackground
        variant="hero"
        glowPosition="top-center"
        counterGlow
        grain
        vignette="bottom"
      />

      <SafeAreaView style={styles.content} edges={['top']}>
        <View style={styles.cards}>
          {cards.map((card, i) => (
            <MotiView
              key={card.label}
              from={CARD_FROM}
              animate={CARD_ANIMATE}
              transition={{ type: 'timing', duration: CARD_DURATION, delay: CARD_STAGGER * i }}
              accessible={true}
              accessibilityLabel={`${card.label} sign: ${card.sign}`}
            >
              <Card variant="glass" padding="default">
                <View style={styles.cardRow}>
                  <ZodiacSymbol sign={card.sign} size={36} opacity={0.70} style={styles.symbolContainer} />
                  <View>
                    <Text variant="caption" color="secondary" style={styles.cardLabel}>
                      {card.label}
                    </Text>
                    <Text variant="heading1" color="primary">
                      {card.sign}
                    </Text>
                  </View>
                </View>
              </Card>
            </MotiView>
          ))}
        </View>

        <MotiView
          from={ARCH_FROM}
          animate={ARCH_ANIMATE}
          transition={{ type: 'timing', duration: 400, delay: ARCHETYPE_DELAY }}
          style={styles.archetypeBlock}
        >
          <Text variant="micro" color="secondary" style={styles.eyebrow}>
            You are
          </Text>
          <Text variant="display1" color="primary" style={styles.archetypeName} accessibilityRole="header">
            {archetypeName}
          </Text>
        </MotiView>
      </SafeAreaView>

      <MotiView
        from={FOOTER_FROM}
        animate={FOOTER_ANIMATE}
        transition={{ type: 'timing', duration: 300, delay: ARCHETYPE_DELAY + 400 }}
        style={[styles.footer, { paddingBottom: Math.max(space['8'], insets.bottom + space['4']) }]}
      >
        <Button
          label="Continue to deeper reading"
          variant="premium"
          fullWidth
          onPress={() => navigation.navigate('SaveYourReading')}
        />
      </MotiView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: tokens.surface.base,
  },
  content: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: layout.screenPadding,
  },
  cards: {
    width:    '100%',
    gap:      space['3'],
    maxWidth: 400,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           space['5'],
  },
  symbolContainer: {
    width:  40,
    height: 40,
  },
  cardLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom:  space['0.5'],
  },
  archetypeBlock: {
    alignItems: 'center',
    marginTop:  space['10'],
  },
  eyebrow: {
    marginBottom:  space['2'],
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  archetypeName: {
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
  },
})
