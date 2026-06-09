import React, { useEffect, useState } from 'react'
import {
  View,
  StyleSheet,
  Pressable,
  PressableStateCallbackType,
  ActivityIndicator,
} from 'react-native'
import { SvgXml } from 'react-native-svg'
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
import { track } from '../../lib/analytics'

type WelcomeNavProp = NativeStackNavigationProp<RootStackParamList, 'Welcome'>

// Omenora logomark SVG — all fills overridden to text.primary (#F2EDE5 warm cream).
// Renders as a clean monochrome mark with no background square.
const LOGO_FILL = '#F2EDE5'
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 301.62 499.33">
  <polygon fill="${LOGO_FILL}" points="301.62 210.03 234.96 187.05 174.86 114.93 150.08 0 301.62 210.03"/>
  <polygon fill="${LOGO_FILL}" points="150.08 499.33 0 214 79.78 195.77 150.08 499.33"/>
  <path fill="${LOGO_FILL}" d="M301.62,210.03l-151.54,289.29c3.2-86.22,39.95-196.34,84.88-312.28l66.66,22.98Z" opacity="0.75"/>
  <polygon fill="${LOGO_FILL}" points="150.08 0 79.78 195.77 0 214 150.08 0" opacity="0.55"/>
  <polygon fill="${LOGO_FILL}" points="174.86 114.93 79.78 195.77 150.08 0 174.86 114.93" opacity="0.88"/>
  <path fill="${LOGO_FILL}" d="M234.96,187.05c-44.93,115.94-81.68,226.06-84.88,312.28L79.78,195.77l95.08-80.84,60.11,72.12Z" opacity="0.65"/>
</svg>`

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

  useEffect(() => { track('welcome_viewed') }, [])

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
          <SvgXml
            xml={LOGO_SVG}
            width={styles.logoMark.width}
            height={styles.logoMark.height}
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
              From your birth moment, OMENORA reads your full chart — who you are, the patterns shaping your life, and what’s ahead. It takes a minute.
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
                    label="Reveal my chart"
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
    paddingTop:  space['5'],        // 20px — tighter masthead, more room for content
    alignItems:  'center',
  },
  logoMark: {
    width:  60,
    height: 60,
  },
  headlineZone: {
    flex:              1,
    paddingHorizontal: space['2'],  // 8px extra inset on top of screenPadding
    justifyContent:    'center',    // vertically centre headline in available space
    alignItems:        'center',
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
    marginBottom: space['4'],        // 16px separation before CTA (reduced from 24px for longer text)
    textAlign:    'center',
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
