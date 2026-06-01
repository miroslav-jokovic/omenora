import React, { useEffect, useRef, useState } from 'react'
import { Animated, Dimensions, View, StyleSheet, Pressable } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Svg, { Circle } from 'react-native-svg'
import { Text } from '../../components/atoms'
import { tokens } from '../../design/tokens'
import { RootStackParamList } from '../../navigation/types'
import { useAuth } from '../../context/useAuth'
import { useProfileStore, useProfileComplete } from '../../stores/profileStore'
import { supabase } from '../../lib/supabase'

type SplashNavProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>

const MIN_DISPLAY_MS  = 900
const SESSION_WAIT_MS = 8000

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window')

const STAR_POSITIONS = (() => {
  const result: { cx: number; cy: number; r: number; opacity: number }[] = []
  let seed = 42
  for (let i = 0; i < 40; i++) {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff
    const cx = (seed % Math.floor(SCREEN_W - 20)) + 10
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff
    const cy = (seed % Math.floor(SCREEN_H - 24)) + 12
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff
    const r  = (seed % 5 === 0) ? 2 : 1
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff
    const opacity = 0.08 + ((seed % 10) / 10) * 0.17
    result.push({ cx, cy, r, opacity })
  }
  return result
})()

export default function SplashScreen() {
  const navigation = useNavigation<SplashNavProp>()
  const { session, isLoading } = useAuth()
  const profileComplete       = useProfileComplete()
  const pendingServerSync     = useProfileStore((s) => s.pendingServerSync)
  const commitProfileToServer = useProfileStore((s) => s.commitProfileToServer)
  const fadeAnim              = useRef(new Animated.Value(0)).current

  const [minDisplayElapsed, setMinDisplayElapsed] = useState(false)
  const [sessionTimedOut,   setSessionTimedOut]   = useState(false)
  const [retrying,          setRetrying]          = useState(false)
  const [storeHydrated,     setStoreHydrated]     = useState(false)
  const sessionTimeoutRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasNavigatedRef    = useRef(false)

  // Fade-in animation (unchanged)
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue:         1,
      duration:        700,
      useNativeDriver: true,
    }).start()
  }, [])

  // Minimum brand display — replaces the old hardcoded 1500ms → Welcome timer
  useEffect(() => {
    const timer = setTimeout(() => setMinDisplayElapsed(true), MIN_DISPLAY_MS)
    return () => clearTimeout(timer)
  }, [])

  // Wait for Zustand persist to hydrate from AsyncStorage before reading profile fields.
  useEffect(() => {
    if (useProfileStore.persist.hasHydrated()) {
      setStoreHydrated(true)
      return
    }
    const unsub = useProfileStore.persist.onFinishHydration(() => setStoreHydrated(true))
    return unsub
  }, [])

  // Session-wait timeout: show retry UI if no session materialises after min display +
  // bootstrap completion. Covers network failure or signInAnonymously rejection.
  useEffect(() => {
    if (!minDisplayElapsed || isLoading || session) return
    sessionTimeoutRef.current = setTimeout(() => setSessionTimedOut(true), SESSION_WAIT_MS)
    return () => {
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current)
    }
  }, [minDisplayElapsed, isLoading, session])

  // Clear retry state when session finally arrives (e.g. after retrying)
  useEffect(() => {
    if (session && sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current)
      setSessionTimedOut(false)
    }
  }, [session])

  // Routing decision — fires once all guards pass: min display, auth bootstrap, session
  // stable, and store hydrated. Profile complete requires archetype AND dateOfBirth AND sunSign
  // all set. Mid-onboarding users (any missing) route back to Welcome to resume safely.
  useEffect(() => {
    if (!minDisplayElapsed || isLoading || !session || !storeHydrated) return
    if (hasNavigatedRef.current) return
    hasNavigatedRef.current = true

    let destination: 'MainTabs' | 'Welcome' | 'SaveYourReading' = profileComplete ? 'MainTabs' : 'Welcome'

    // Re-prompt anonymous users who previously declined SaveYourReading:
    // — up to 3 total declines, spaced at least 24h apart.
    if (profileComplete && destination === 'MainTabs') {
      const { saveDeclineCount, saveLastDeclinedAt } = useProfileStore.getState()
      const isAnon = (session.user as any)?.is_anonymous ?? true
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
      const cooldownElapsed =
        saveLastDeclinedAt === null ||
        Date.now() - saveLastDeclinedAt > TWENTY_FOUR_HOURS
      if (
        isAnon &&
        saveDeclineCount > 0 &&
        saveDeclineCount < 3 &&
        cooldownElapsed
      ) {
        destination = 'SaveYourReading'
      }
    }

    // Triple-check completeness gate (AD-6: server-first data integrity)
    navigation.replace(destination)
    // Background recovery: flush any unsynced profile data to server after routing.
    if (pendingServerSync && session.user?.id) {
      commitProfileToServer(session.user.id).catch((e) =>
        console.warn('[Splash] pendingServerSync recovery failed:', e)
      )
    }
  }, [minDisplayElapsed, isLoading, session, storeHydrated, profileComplete, pendingServerSync, commitProfileToServer, navigation])

  return (
    <View style={styles.container}>
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${SCREEN_W} ${SCREEN_H}`}
        preserveAspectRatio="xMidYMid slice"
      >
        {STAR_POSITIONS.map((s, i) => (
          <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={`rgba(255,255,255,${s.opacity.toFixed(2)})`} />
        ))}
      </Svg>
      <Animated.View style={{ opacity: fadeAnim }}>
        <Text variant="display2" style={styles.wordmark}>OMENORA</Text>
      </Animated.View>
      {sessionTimedOut && (
        <Pressable
          disabled={retrying}
          onPress={async () => {
            setRetrying(true)
            setSessionTimedOut(false)
            try {
              await supabase.auth.signInAnonymously()
              // On success: SIGNED_IN fires via AuthProvider → session updates
              // → routing effect fires → navigates. Button stays disabled until unmount.
            } catch (err: any) {
              console.error('[Splash] retry sign-in failed:', err)
              setSessionTimedOut(true)
              setRetrying(false)
            }
          }}
          style={styles.retry}
        >
          <Text variant="label" color="secondary">
            {retrying ? 'Retrying…' : 'Tap to retry'}
          </Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: tokens.surface.base,
    alignItems:      'center',
    justifyContent:  'center',
  },
  wordmark: {
    letterSpacing: 6,
  },
  retry: {
    position: 'absolute',
    bottom:   60,
  },
})
