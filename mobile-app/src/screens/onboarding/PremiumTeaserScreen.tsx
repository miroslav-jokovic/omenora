import React, { useCallback, useEffect, useState } from 'react'
import { View, StyleSheet, ScrollView, Pressable } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { MotiView } from 'moti'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Text, Button, EditorialBenefit } from '../../components/atoms'
import { AtmosphericBackground } from '../../components/atmosphere'
import { useProfileStore } from '../../stores/profileStore'
import { useAuth } from '../../context/useAuth'
import { usePurchases } from '../../context/usePurchases'
import { tokens, space, layout } from '../../design/tokens'
import { RootStackParamList } from '../../navigation/types'

type PremiumTeaserNavProp = NativeStackNavigationProp<RootStackParamList, 'PremiumTeaser'>

const TEASER_HERO_FROM       = { opacity: 0, translateY: 16 } as const
const TEASER_HERO_ANIMATE    = { opacity: 1, translateY: 0  } as const
const TEASER_HERO_TRANSITION = { type: 'timing' as const, duration: 800, delay: 100 }

const TEASER_CTA_FROM       = { opacity: 0, translateY: 12 } as const
const TEASER_CTA_ANIMATE    = { opacity: 1, translateY: 0  } as const
const TEASER_CTA_TRANSITION = { type: 'timing' as const, duration: 800, delay: 500 }

const TEASER_SKIP_FROM       = { opacity: 0 } as const
const TEASER_SKIP_ANIMATE    = { opacity: 1 } as const
const TEASER_SKIP_TRANSITION = { type: 'timing' as const, duration: 600, delay: 700 }

// Editorial dinkus — inline component; promote to atoms if pattern recurs in Cluster 12+
const DinkusDivider = () => (
  <View style={styles.dinkusRow}>
    <View style={styles.dinkusLine} />
    <Text variant="micro" color="tertiary" style={styles.dinkusGlyph}>❋</Text>
    <View style={styles.dinkusLine} />
  </View>
)

export default function PremiumTeaserScreen() {
  const navigation = useNavigation<PremiumTeaserNavProp>()
  const insets = useSafeAreaInsets()

  const archetype  = useProfileStore((s) => s.archetype)
  const archetypeName =
    archetype != null && archetype.length > 0
      ? `The ${archetype.charAt(0).toUpperCase()}${archetype.slice(1)}`
      : 'Your Archetype'

  const { isAnonymous, showAuthGate } = useAuth()
  const { presentPaywall }            = usePurchases()

  const [awaitingAuth, setAwaitingAuth] = useState(false)

  const proceedToPaywall = useCallback(() => {
    presentPaywall().finally(() => navigation.replace('MainTabs'))
  }, [presentPaywall, navigation])

  useEffect(() => {
    if (awaitingAuth && !isAnonymous) {
      setAwaitingAuth(false)
      proceedToPaywall()
    }
  }, [awaitingAuth, isAnonymous, proceedToPaywall])

  const handleUnlock = () => {
    if (isAnonymous) {
      setAwaitingAuth(true)
      showAuthGate({
        title: 'Unlock your reading',
        body:  'Sign in to access your full chart and sync readings across devices.',
      })
    } else {
      proceedToPaywall()
    }
  }

  return (
    <View style={styles.container} testID="paywall-screen-root">
      {/* Atmospheric layered background — static. Never animate this stack. */}
      <AtmosphericBackground
        variant="hero"
        glowPosition="top-right"
        counterGlow
        ctaLightPool
        buttonHalo
        grain
        graphicOverlay
        vignette="bottom"
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero zone + benefits — single orchestrated entrance */}
          <MotiView
            from={TEASER_HERO_FROM}
            animate={TEASER_HERO_ANIMATE}
            transition={TEASER_HERO_TRANSITION}
          >
            <View style={styles.heroZone}>
              <Text variant="micro" color="secondary" style={styles.eyebrow}>
                You are
              </Text>
              <Text
                variant="hero"
                color="primary"
                style={styles.archetypeName}
                testID="paywall-headline-archetype"
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.85}
              >
                {archetypeName}
              </Text>
            </View>

            <DinkusDivider />

            <View style={styles.benefitsZone}>
              <EditorialBenefit>
                The full portrait of who you were born to be.
              </EditorialBenefit>
              <EditorialBenefit>
                Every planet's whisper at the moment you arrived.
              </EditorialBenefit>
              <EditorialBenefit>
                The next ninety days, mapped by what's moving above.
              </EditorialBenefit>
            </View>
          </MotiView>
        </ScrollView>

        {/* CTA — staggered separately so it feels like the door opening after the content lands */}
        <MotiView
          from={TEASER_CTA_FROM}
          animate={TEASER_CTA_ANIMATE}
          transition={TEASER_CTA_TRANSITION}
          style={[styles.footer, { paddingBottom: Math.max(space['8'], insets.bottom + space['4']) }]}
        >
          <View testID="paywall-cta-primary">
            <Button
              label="Open my reading"
              variant="premium"
              fullWidth
              onPress={handleUnlock}
            />
          </View>

          {/* Tertiary skip — fade only, softest entrance */}
          <MotiView
            from={TEASER_SKIP_FROM}
            animate={TEASER_SKIP_ANIMATE}
            transition={TEASER_SKIP_TRANSITION}
          >
            <Pressable
              testID="paywall-cta-decline"
              onPress={() => navigation.replace('MainTabs')}
              style={({ pressed }) => [styles.declineTap, pressed && styles.declineTapPressed]}
            >
              <Text variant="label" color="tertiary">
                I'll come back to my reading
              </Text>
            </Pressable>
          </MotiView>
        </MotiView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: tokens.surface.deep,
  },
  safe: {
    flex:              1,
    paddingHorizontal: layout.screenPadding,
  },
  scroll: {
    flexGrow:      1,
    paddingTop:    space['16'],
    paddingBottom: space['8'],
  },
  heroZone: {
    alignItems:   'center',
    marginBottom: space['10'],
  },
  eyebrow: {
    letterSpacing: 4,
    marginBottom:  space['3'],
  },
  archetypeName: {
    textAlign: 'center',
  },
  dinkusRow: {
    flexDirection:   'row',
    alignItems:      'center',
    marginVertical:  space['8'],
    paddingHorizontal: space['4'],
  },
  dinkusLine: {
    flex:            1,
    height:          1,
    backgroundColor: tokens.border.gold,
  },
  dinkusGlyph: {
    paddingHorizontal: space['3'],
    letterSpacing:     2,
  },
  benefitsZone: {
    gap:               space['6'],
    paddingHorizontal: space['4'],
  },
  footer: {
    gap: space['3'],
  },
  declineTap: {
    alignItems:  'center',
    justifyContent: 'center',
    minHeight:   layout.tapTarget,
  },
  declineTapPressed: {
    opacity: 0.5,
  },
})
