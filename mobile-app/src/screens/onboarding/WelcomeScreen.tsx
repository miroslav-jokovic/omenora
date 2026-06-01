import React, { useEffect, useState } from 'react'
import {
  View,
  Image,
  StyleSheet,
  Pressable,
  PressableStateCallbackType,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { MotiView } from 'moti'

import {
  surface,
  accent,
  text,
  space,
  layout,
  fontFamily,
  typeScale,
} from '../../design/tokens'
import { AtmosphericBackground } from '../../components/atmosphere'
import { Text } from '../../components/atoms/Text'
import { Button } from '../../components/atoms/Button'
import { useAuth } from '../../context/useAuth'
import { useProfileComplete } from '../../stores/profileStore'
import { RootStackParamList } from '../../navigation/types'

type WelcomeNavProp = NativeStackNavigationProp<RootStackParamList, 'Welcome'>

const WELCOME_WORDMARK_FROM       = { opacity: 0 } as const
const WELCOME_WORDMARK_ANIMATE    = { opacity: 1 } as const
const WELCOME_WORDMARK_TRANSITION = { type: 'timing' as const, duration: 600 }

const WELCOME_HEADLINE_FROM       = { opacity: 0, translateY: 16 } as const
const WELCOME_HEADLINE_ANIMATE    = { opacity: 1, translateY: 0  } as const
const WELCOME_HEADLINE_TRANSITION = { type: 'timing' as const, duration: 800, delay: 200 }

const WELCOME_SUBHEAD_FROM       = { opacity: 0, translateY: 12 } as const
const WELCOME_SUBHEAD_ANIMATE    = { opacity: 1, translateY: 0  } as const
const WELCOME_SUBHEAD_TRANSITION = { type: 'timing' as const, duration: 800, delay: 400 }

const WELCOME_CTA_FROM       = { opacity: 0, translateY: 12 } as const
const WELCOME_CTA_ANIMATE    = { opacity: 1, translateY: 0  } as const
const WELCOME_CTA_TRANSITION = { type: 'timing' as const, duration: 800, delay: 600 }

export default function WelcomeScreen() {
  const navigation  = useNavigation<WelcomeNavProp>()
  const { isAnonymous, profileHydrating, profileHydrated, showAuthGate } = useAuth()
  const profileComplete = useProfileComplete()
  const [hydrationTimedOut, setHydrationTimedOut] = useState(false)

  // Route after sign-in based on profile completeness. Wait for hydration
  // to COMPLETE (profileHydrated=true) before evaluating the triple-check —
  // gating on profileHydrating=false alone has a race window between
  // SIGNED_IN firing and the hydration block setting hydrating=true.
  // Triple-check mirrors SplashScreen. Decision 8.
  useEffect(() => {
    if (isAnonymous) return
    if (profileHydrated || hydrationTimedOut) {
      navigation.replace(profileComplete ? 'MainTabs' : 'Name')
    }
  }, [isAnonymous, profileHydrated, hydrationTimedOut, profileComplete, navigation])

  // 5-second max wait for profile hydration after permanent sign-in.
  // Reset timeout state when user signs out so a subsequent sign-in
  // starts with a fresh 5s window, not a stale already-timed-out flag.
  useEffect(() => {
    if (isAnonymous) {
      setHydrationTimedOut(false)
      return
    }
    if (profileHydrated) return
    const timer = setTimeout(() => setHydrationTimedOut(true), 5000)
    return () => clearTimeout(timer)
  }, [isAnonymous, profileHydrated])

  return (
    <View style={styles.container} testID="welcome-screen-root">
      {/* Atmospheric layered background — static. Never animate this stack. */}
      <AtmosphericBackground
        variant="hero"
        glowPosition="top-center"
        counterGlow
        ctaLightPool
        buttonHalo
        grain
        graphicOverlay
        vignette="bottom"
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Brand logo mark — centered masthead */}
        <MotiView
          from={WELCOME_WORDMARK_FROM}
          animate={WELCOME_WORDMARK_ANIMATE}
          transition={WELCOME_WORDMARK_TRANSITION}
          style={styles.topBar}
        >
          <Image
            source={require('../../../assets/logomark.png')}
            style={styles.logoMark}
            resizeMode="contain"
            accessibilityLabel="Omenora"
          />
        </MotiView>

        {/* Headline cluster — upper third, asymmetric with right breathing room */}
        <View style={styles.headlineZone}>
          <MotiView
            from={WELCOME_HEADLINE_FROM}
            animate={WELCOME_HEADLINE_ANIMATE}
            transition={WELCOME_HEADLINE_TRANSITION}
          >
            <Text variant="eyebrow" color="tertiary" style={styles.eyebrow}>
              An invitation
            </Text>
            <Text variant="display1" color="primary" style={styles.headline}>
              {'Begin with the\nnight you were '}
              <Text
                variant="display1"
                color="primary"
                style={styles.headlineEmphasis}
              >
                born
              </Text>
            </Text>
          </MotiView>
        </View>

        {/* Bottom cluster — subhead + CTA + sign-in + legal */}
        <View style={styles.bottomZone}>
          <MotiView
            from={WELCOME_SUBHEAD_FROM}
            animate={WELCOME_SUBHEAD_ANIMATE}
            transition={WELCOME_SUBHEAD_TRANSITION}
          >
            <Text variant="lede" color="secondary" style={styles.subheadline}>
              Your birth, your hour, your hemisphere — the reading is shaped only by what is true for you.
            </Text>
          </MotiView>

          <MotiView
            from={WELCOME_CTA_FROM}
            animate={WELCOME_CTA_ANIMATE}
            transition={WELCOME_CTA_TRANSITION}
          >
            {!isAnonymous && profileHydrating && !hydrationTimedOut ? (
              <View style={styles.actions}>
                <ActivityIndicator size="small" color={text.disabled} />
              </View>
            ) : (
              <View style={styles.actions}>
                <View testID="welcome-cta-primary">
                  <Button
                    label="Begin"
                    variant="premium"
                    fullWidth
                    onPress={() => navigation.navigate('Name')}
                  />
                </View>

                <Pressable
                  testID="welcome-cta-signin"
                  onPress={() =>
                    showAuthGate({
                      title: 'Welcome back',
                      body: 'Sign in to access your readings and profile.',
                    })
                  }
                  style={({ pressed }: PressableStateCallbackType) => [
                    styles.signInTap,
                    pressed && styles.signInTapPressed,
                  ]}
                >
                  <Text variant="label" color="secondary">Already have an account?</Text>
                  <Text variant="label" style={styles.signInAccent}>{' '}Sign in</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.legalRow}>
              <Text variant="caption" color="tertiary">By continuing you agree to our </Text>
              <Pressable
                testID="welcome-link-terms"
                onPress={() => navigation.navigate('Terms')}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text variant="caption" style={styles.legalLink}>Terms</Text>
              </Pressable>
              <Text variant="caption" color="tertiary"> and </Text>
              <Pressable
                testID="welcome-link-privacy"
                onPress={() => navigation.navigate('Privacy')}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text variant="caption" style={styles.legalLink}>Privacy Policy</Text>
              </Pressable>
            </View>
          </MotiView>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: surface.deep,  // deepest tone — matches atmosphere base
  },
  safe: {
    flex:              1,
    paddingHorizontal: layout.screenPadding,
  },
  topBar: {
    paddingTop:  space['8'],        // 32px — generous masthead breathing room
    alignItems:  'center',
  },
  logoMark: {
    width:  52,
    height: 52,
  },
  headlineZone: {
    flex:              1,
    paddingTop:        space['10'], // 40px — headline sits in upper third
    paddingHorizontal: space['2'],  // 8px extra inset on top of screenPadding
    justifyContent:    'flex-start',
  },
  eyebrow: {
    // letterSpacing comes from typeScale.eyebrow (tracking.caps = 2.0)
    marginBottom: space['3'],
    textAlign:    'center',
  },
  headline: {
    // letterSpacing comes from typeScale.display1 (tracking.snug = -1.0) — no override
    textAlign: 'center',
  },
  // Weight-contrast emphasis on "born" — Onest 500 Medium over 300 Light base.
  // Renamed from headlineItalic (stale) to headlineEmphasis.
  headlineEmphasis: {
    ...typeScale.display1,
    fontFamily: fontFamily.displayMedium,
  },
  bottomZone: {
    paddingBottom: space['6'],       // 24px — safe area already covers system bar
  },
  subheadline: {
    marginBottom: space['8'],        // 32px separation before CTA
    textAlign:    'center',          // no extra paddingHorizontal — screenPadding is sufficient
  },
  actions: {
    gap:          space['3'],
    marginBottom: space['4'],
  },
  signInTap: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    minHeight:      layout.tapTarget,
  },
  signInTapPressed: {
    opacity: 0.6,
  },
  signInAccent: {
    color: accent.primary,
  },
  legalRow: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    marginTop:      space['2'],
    justifyContent: 'center',
  },
  legalLink: {
    color:              text.tertiary,
    textDecorationLine: 'underline',
  },
})
