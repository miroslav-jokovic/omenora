import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, ActivityIndicator, Pressable, StyleSheet } from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import { Mail, ArrowLeft } from 'lucide-react-native'
import Svg, { Path } from 'react-native-svg'

import { BottomSheet } from './BottomSheet'
import { Text } from '../atoms/Text'
import { Button } from '../atoms/Button'
import { TextField } from '../molecules/TextField'
import { Divider } from '../atoms/Divider'
import { useAuth } from '../../context/useAuth'

import { space, typeScale, fontFamily, tokens } from '../../design/tokens'

export interface AuthGateProps {
  visible: boolean
  title?: string
  body?: string
  onClose: () => void
}

type GateState = 'idle' | 'email_input' | 'email_otp_input'

const DEFAULT_TITLE = 'Save your archetype'
const DEFAULT_BODY = 'Sign in to keep your readings synced across devices.'

const styles = StyleSheet.create({
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
})

export const AuthGate: React.FC<AuthGateProps> = ({
  visible,
  title = DEFAULT_TITLE,
  body = DEFAULT_BODY,
  onClose,
}) => {
  const { signInWithApple, signInWithGoogle, sendEmailOtp, verifyEmailOtp, isAnonymous } = useAuth()
  const [gateState, setGateState] = useState<GateState>('idle')
  const [email,          setEmail]          = useState('')
  const [otp,            setOtp]            = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [resendCount,    setResendCount]    = useState(0)
  const [appleLoading,   setAppleLoading]   = useState(false)
  const [googleLoading,  setGoogleLoading]  = useState(false)
  const [emailLoading,   setEmailLoading]   = useState(false)

  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Auto-close when user transitions from anonymous to permanent.
  useEffect(() => {
    if (visible && !isAnonymous) {
      // Brief delay so user sees confirmation, then dismiss.
      const timer = setTimeout(() => onClose(), 400)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [visible, isAnonymous, onClose])

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current)
        cooldownRef.current = null
      }
      return
    }
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(cooldownRef.current!)
          cooldownRef.current = null
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [resendCooldown])

  // Reset internal state when sheet closes.
  useEffect(() => {
    if (!visible) {
      setGateState('idle')
      setEmail('')
      setOtp('')
      setResendCooldown(0)
      setResendCount(0)
      setAppleLoading(false)
      setGoogleLoading(false)
      setEmailLoading(false)
    }
  }, [visible])

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

  const handleSendEmailCode = useCallback(async () => {
    if (!email.includes('@')) return
    setEmailLoading(true)
    try {
      await sendEmailOtp(email)
      setGateState('email_otp_input')
      setResendCooldown(60)
    } catch {
      // AuthProvider already alerted user; stay on email_input
    } finally {
      setEmailLoading(false)
    }
  }, [email, sendEmailOtp])

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length < 6) return
    setEmailLoading(true)
    try {
      await verifyEmailOtp(email, otp)
      // On success: isAnonymous → false → auto-close useEffect fires
    } catch {
      // AuthProvider already alerted; clear entered code
      setOtp('')
    } finally {
      setEmailLoading(false)
    }
  }, [otp, email, verifyEmailOtp])

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || resendCount >= 3) return
    setEmailLoading(true)
    try {
      await sendEmailOtp(email)
      setResendCount((n) => n + 1)
      setResendCooldown(60)
      setOtp('')
    } catch {
      // AuthProvider already alerted
    } finally {
      setEmailLoading(false)
    }
  }, [resendCooldown, resendCount, email, sendEmailOtp])

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View>
        {gateState === 'idle' && (
          <>
            <Text variant="heading2" color="primary" style={{ textAlign: 'center' }}>
              {title}
            </Text>
            <Text
              variant="body"
              color="secondary"
              style={{ textAlign: 'center', marginTop: space['2'], marginBottom: space['6'] }}
            >
              {body}
            </Text>

            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={12}
              style={{ width: '100%', height: 50, marginBottom: space['3'] }}
              onPress={handleApple}
            />
            {appleLoading && (
              <ActivityIndicator
                size="small"
                color={tokens.text.primary}
                style={{ position: 'absolute', alignSelf: 'center', top: 50 }}
              />
            )}

            <Pressable
              onPress={handleGoogle}
              disabled={googleLoading}
              style={({ pressed }) => [
                styles.googleBtn,
                { marginBottom: space['3'] },
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

            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: space['4'] }}>
              <View style={{ flex: 1 }}>
                <Divider variant="default" />
              </View>
              <Text variant="micro" color="tertiary" style={{ marginHorizontal: space['3'] }}>
                OR
              </Text>
              <View style={{ flex: 1 }}>
                <Divider variant="default" />
              </View>
            </View>

            <Button
              label="Continue with email"
              variant="tertiary"
              icon={Mail}
              onPress={() => setGateState('email_input')}
            />
          </>
        )}

        {gateState === 'email_input' && (
          <>
            <Text variant="heading2" color="primary" style={{ textAlign: 'center' }}>
              Continue with email
            </Text>
            <Text
              variant="body"
              color="secondary"
              style={{ textAlign: 'center', marginTop: space['2'], marginBottom: space['5'] }}
            >
              We'll send a 6-digit code to your inbox.
            </Text>

            <TextField
              label="Email"
              type="email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              required
            />

            <View style={{ height: space['4'] }} />

            <Button
              label="Send code"
              onPress={handleSendEmailCode}
              loading={emailLoading}
              disabled={!email.includes('@')}
            />

            <View style={{ height: space['2'] }} />

            <Button
              label="Back"
              variant="tertiary"
              icon={ArrowLeft}
              onPress={() => setGateState('idle')}
            />
          </>
        )}

        {gateState === 'email_otp_input' && (
          <>
            <Text variant="heading2" color="primary" style={{ textAlign: 'center' }}>
              Check your email
            </Text>
            <Text
              variant="body"
              color="secondary"
              style={{ textAlign: 'center', marginTop: space['2'], marginBottom: space['5'] }}
            >
              Enter the 6-digit code sent to {email}.
            </Text>

            <TextField
              label="Code"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              textContentType="oneTimeCode"
              placeholder="000000"
            />

            <View style={{ height: space['4'] }} />

            <Button
              label="Verify"
              onPress={handleVerifyOtp}
              loading={emailLoading}
              disabled={otp.length < 6}
            />

            <View style={{ height: space['2'] }} />

            <Button
              label={
                resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : resendCount >= 3
                  ? 'Max resends reached'
                  : 'Resend code'
              }
              variant="tertiary"
              disabled={resendCooldown > 0 || resendCount >= 3 || emailLoading}
              onPress={handleResend}
            />

            <View style={{ height: space['2'] }} />

            <Button
              label="Wrong email? Go back"
              variant="tertiary"
              icon={ArrowLeft}
              onPress={() => { setGateState('email_input'); setOtp('') }}
            />
          </>
        )}
      </View>
    </BottomSheet>
  )
}

