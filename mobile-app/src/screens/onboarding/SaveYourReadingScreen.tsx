import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import * as AppleAuthentication from 'expo-apple-authentication'
import Svg, { Path } from 'react-native-svg'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ArrowLeft } from 'lucide-react-native'
import { Text, Button } from '../../components/atoms'
import { TextField } from '../../components/molecules'
import { AtmosphericBackground } from '../../components/atmosphere'
import { useAuth } from '../../context/useAuth'
import { useProfileStore } from '../../stores/profileStore'
import { space, layout, tokens, typeScale, fontFamily } from '../../design/tokens'
import { RootStackParamList } from '../../navigation/types'

type SaveYourReadingNavProp = NativeStackNavigationProp<RootStackParamList, 'SaveYourReading'>

type ScreenState = 'buttons' | 'email_input' | 'otp_input'

const RESEND_COOLDOWN_SEC = 60
const MAX_RESENDS         = 3

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: tokens.surface.base,
  },
  safe: {
    flex: 1,
  },
  content: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: layout.screenPadding,
  },
  textBlock: {
    alignItems: 'center',
    width:      '100%',
    maxWidth:   360,
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom:  space['3'],
  },
  hero: {
    textAlign:    'center',
    marginBottom: space['4'],
  },
  support: {
    textAlign:    'center',
    marginBottom: space['8'],
  },
  authGroup: {
    width:    '100%',
    maxWidth: 360,
    gap:      space['3'],
  },
  googleBtn: {
    width:           '100%',
    height:          50,
    borderRadius:    12,
    backgroundColor: tokens.specialty.white,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
  },
  googleBtnPressed: {
    opacity: 0.85,
  },
  googleBtnDisabled: {
    opacity: 0.5,
  },
  googleLogo: {
    marginRight: 8,
  },
  googleLabel: {
    ...typeScale.labelLarge,
    fontFamily: fontFamily.uiSemiBold,
    color:      tokens.text.inverse,
  },
  declineWrapper: {
    marginTop:  space['6'],
    alignItems: 'center',
  },
  emailGroup: {
    width:    '100%',
    maxWidth: 360,
    gap:      space['3'],
  },
})

export default function SaveYourReadingScreen() {
  const navigation = useNavigation<SaveYourReadingNavProp>()
  const insets     = useSafeAreaInsets()

  const { signInWithApple, signInWithGoogle, sendEmailOtp, verifyEmailOtp, isAnonymous } = useAuth()
  const { archetype, firstName, saveDeclineCount, setSaveDeclineCount, setSaveLastDeclinedAt } =
    useProfileStore()

  const [screenState,    setScreenState]    = useState<ScreenState>('buttons')
  const [email,          setEmail]          = useState('')
  const [otp,            setOtp]            = useState('')
  const [appleLoading,   setAppleLoading]   = useState(false)
  const [googleLoading,  setGoogleLoading]  = useState(false)
  const [emailLoading,   setEmailLoading]   = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendCount,    setResendCount]    = useState(0)

  const hasNavigatedRef = useRef(false)

  // Navigate to OptionalQuestions when auth succeeds (anonymous → permanent)
  useEffect(() => {
    if (!isAnonymous && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true
      navigation.navigate('OptionalQuestions')
    }
  }, [isAnonymous, navigation])

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((s) => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleApple = useCallback(async () => {
    setAppleLoading(true)
    try {
      await signInWithApple()
    } finally {
      setAppleLoading(false)
    }
  }, [signInWithApple])

  const handleGoogle = useCallback(async () => {
    setGoogleLoading(true)
    try {
      await signInWithGoogle()
    } finally {
      setGoogleLoading(false)
    }
  }, [signInWithGoogle])

  const handleSendCode = useCallback(async () => {
    if (!email.includes('@')) return
    setEmailLoading(true)
    try {
      await sendEmailOtp(email)
      setScreenState('otp_input')
      setResendCooldown(RESEND_COOLDOWN_SEC)
    } catch {
      // AuthProvider already alerted; stay on email_input
    } finally {
      setEmailLoading(false)
    }
  }, [email, sendEmailOtp])

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length < 6) return
    setEmailLoading(true)
    try {
      await verifyEmailOtp(email, otp)
      // On success: isAnonymous → false → useEffect navigates
    } catch {
      // AuthProvider already alerted; clear entered code
      setOtp('')
    } finally {
      setEmailLoading(false)
    }
  }, [otp, email, verifyEmailOtp])

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || resendCount >= MAX_RESENDS) return
    setEmailLoading(true)
    try {
      await sendEmailOtp(email)
      setResendCount((n) => n + 1)
      setResendCooldown(RESEND_COOLDOWN_SEC)
      setOtp('')
    } catch {
      // AuthProvider already alerted
    } finally {
      setEmailLoading(false)
    }
  }, [resendCooldown, resendCount, email, sendEmailOtp])

  const handleDecline = useCallback(() => {
    setSaveDeclineCount(saveDeclineCount + 1)
    setSaveLastDeclinedAt(Date.now())
    navigation.navigate('OptionalQuestions')
  }, [saveDeclineCount, setSaveDeclineCount, setSaveLastDeclinedAt, navigation])

  const greeting = firstName ? firstName : archetype ?? null

  return (
    <View style={styles.root} testID="save-screen-root">
      <AtmosphericBackground
        variant="hero"
        glowPosition="top-center"
        counterGlow
        ctaLightPool
        buttonHalo
        grain
        vignette="bottom"
      />

      <SafeAreaView style={styles.safe} edges={['top']}>
        <View
          style={[
            styles.content,
            { paddingBottom: Math.max(space['8'], insets.bottom + space['4']) },
          ]}
        >
          {/* Editorial text block */}
          <View style={styles.textBlock}>
            <Text variant="micro" color="secondary" style={styles.eyebrow}>
              {greeting ? `${greeting}'s reading` : 'Your reading'}
            </Text>
            <Text variant="display1" color="primary" style={styles.hero}>
              Save your reading
            </Text>
            <Text variant="readingBody" color="secondary" style={styles.support}>
              Your portrait lives only on this device. Sign in to keep it forever, on any device.
            </Text>
          </View>

          {/* ── buttons state ──────────────────────────────────────── */}
          {screenState === 'buttons' && (
            <View style={styles.authGroup}>
              {Platform.OS === 'ios' && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                  cornerRadius={12}
                  style={{ width: '100%', height: 50 }}
                  onPress={handleApple}
                  testID="save-cta-apple"
                />
              )}
              {appleLoading && (
                <ActivityIndicator size="small" color={tokens.text.primary} />
              )}

              <Pressable
                testID="save-cta-google"
                onPress={handleGoogle}
                disabled={googleLoading}
                style={({ pressed }) => [
                  styles.googleBtn,
                  pressed && styles.googleBtnPressed,
                  googleLoading && styles.googleBtnDisabled,
                ]}
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color="#1F1F1F" />
                ) : (
                  <>
                    <Svg width={20} height={20} viewBox="0 0 48 48" style={styles.googleLogo}>
                      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/>
                      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-3.58-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      <Path fill="none" d="M0 0h48v48H0z"/>
                    </Svg>
                    <Text style={styles.googleLabel}>Continue with Google</Text>
                  </>
                )}
              </Pressable>

              <Button
                label="Continue with email"
                variant="tertiary"
                onPress={() => setScreenState('email_input')}
              />

              <View style={styles.declineWrapper}>
                <Pressable
                  testID="save-cta-decline"
                  onPress={handleDecline}
                  hitSlop={12}
                >
                  <Text variant="caption" color="tertiary">
                    I understand, save it only on this device
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── email_input state ──────────────────────────────────── */}
          {screenState === 'email_input' && (
            <View style={styles.emailGroup}>
              <TextField
                testID="save-email-input"
                label="Email"
                type="email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                required
              />

              <Button
                label="Send code"
                onPress={handleSendCode}
                loading={emailLoading}
                disabled={!email.includes('@')}
              />

              <Button
                label="Back"
                variant="tertiary"
                icon={ArrowLeft}
                onPress={() => setScreenState('buttons')}
              />
            </View>
          )}

          {/* ── otp_input state ────────────────────────────────────── */}
          {screenState === 'otp_input' && (
            <View style={styles.emailGroup}>
              <TextField
                testID="save-otp-input"
                label="Verification code"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                textContentType="oneTimeCode"
                placeholder="000000"
              />

              <Button
                label="Verify"
                onPress={handleVerifyOtp}
                loading={emailLoading}
                disabled={otp.length < 6}
              />

              <Button
                label={
                  resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : resendCount >= MAX_RESENDS
                    ? 'Max resends reached'
                    : 'Resend code'
                }
                variant="tertiary"
                disabled={resendCooldown > 0 || resendCount >= MAX_RESENDS || emailLoading}
                onPress={handleResend}
              />

              <Button
                label="Wrong email? Go back"
                variant="tertiary"
                icon={ArrowLeft}
                onPress={() => {
                  setScreenState('email_input')
                  setOtp('')
                }}
              />
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  )
}
