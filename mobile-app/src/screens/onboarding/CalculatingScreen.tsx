import React, { useEffect, useRef, useState } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Text } from '../../components/atoms'
import { ErrorState, ScreenWrapper } from '../../components/templates'
import { OmenLoader } from '../../components/atoms/OmenLoader'
import { useProfileStore } from '../../stores/profileStore'
import { useAuth } from '../../context/useAuth'
import { saveProfile, ProfileSaveError } from '../../services/profileService'
import { supabase } from '../../lib/supabase'
import { tokens, space, layout } from '../../design/tokens'
import { AtmosphericBackground } from '../../components/atmosphere'
import { api } from '../../api/endpoints'
import { RootStackParamList } from '../../navigation/types'
import type { ProfilePayload } from '../../services/profileService'

type CalculatingNavProp = NativeStackNavigationProp<RootStackParamList, 'Calculating'>

type SavePhase = 'idle' | 'saving' | 'save-error'

const LOADING_PHRASES = [
  'Reading your chart…',
  'Mapping the celestial sphere…',
  'Tracing your archetypes…',
  'Charting the planets…',
  'Unveiling your cosmic path…',
]

const MAX_MANUAL_RETRIES = 3

export default function CalculatingScreen() {
  const navigation = useNavigation<CalculatingNavProp>()

  const firstName          = useProfileStore((s) => s.firstName)
  const dateOfBirth        = useProfileStore((s) => s.dateOfBirth)
  const timeOfBirth        = useProfileStore((s) => s.timeOfBirth)
  const city               = useProfileStore((s) => s.city)
  const lifePathNumber     = useProfileStore((s) => s.lifePathNumber)
  const languageOverride   = useProfileStore((s) => s.languageOverride)
  const answers            = useProfileStore((s) => s.answers)
  const setSunSign         = useProfileStore((s) => s.setSunSign)
  const setMoonSign        = useProfileStore((s) => s.setMoonSign)
  const setRisingSign      = useProfileStore((s) => s.setRisingSign)
  const setArchetype       = useProfileStore((s) => s.setArchetype)
  const setPendingServerSync = useProfileStore((s) => s.setPendingServerSync)
  const { user }           = useAuth()

  const [llmError,         setLlmError]         = useState<string | null>(null)
  const [retryBump,        setRetryBump]         = useState(0)
  const [phraseIndex,      setPhraseIndex]       = useState(0)
  const [savePhase,        setSavePhase]         = useState<SavePhase>('idle')
  const [saveErrorMsg,     setSaveErrorMsg]      = useState<string | null>(null)
  const [manualRetryCount, setManualRetryCount]  = useState(0)

  const mountedRef    = useRef(true)
  // Holds save args for manual retries without re-running the LLM call.
  const retrySaveRef  = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    const id = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % LOADING_PHRASES.length)
    }, 2200)
    return () => clearInterval(id)
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    mountedRef.current = true
    setLlmError(null)
    setSavePhase('idle')
    setSaveErrorMsg(null)
    setManualRetryCount(0)
    retrySaveRef.current = null

    const language = languageOverride ?? 'en'

    ;(async () => {
      try {
        const { birthChart } = await api.generateBirthChart({
          firstName,
          dateOfBirth,
          timeOfBirth:    timeOfBirth    || undefined,
          city:           city           || undefined,
          lifePathNumber: lifePathNumber ?? 0,
          language,
        })

        if (!mountedRef.current) return

        setSunSign(birthChart.sunSign)
        setMoonSign(birthChart.moonSign)
        setRisingSign(birthChart.risingSign)
        setArchetype(birthChart.archetype)

        const archetypeName =
          `The ${birthChart.archetype.charAt(0).toUpperCase()}${birthChart.archetype.slice(1)}`

        const navArgs = {
          sunSign:       birthChart.sunSign,
          moonSign:      birthChart.moonSign,
          risingSign:    birthChart.risingSign,
          archetypeName,
        }

        if (!user?.id) {
          setPendingServerSync(true)
          navigation.replace('BigThreeReveal', navArgs)
          return
        }

        const payload: ProfilePayload = {
          first_name:       firstName        || undefined,
          date_of_birth:    dateOfBirth      || undefined,
          time_of_birth:    timeOfBirth      || undefined,
          city:             city             || undefined,
          archetype:        birthChart.archetype,
          sun_sign:         birthChart.sunSign,
          moon_sign:        birthChart.moonSign,
          rising_sign:      birthChart.risingSign,
          life_path_number: lifePathNumber   ?? undefined,
          answers,
        }

        const doSave = async (isAuthRetry = false): Promise<void> => {
          if (!mountedRef.current) return
          setSavePhase('saving')
          setSaveErrorMsg(null)

          try {
            await saveProfile(user.id!, payload)
            if (!mountedRef.current) return
            setSavePhase('idle')
            navigation.replace('BigThreeReveal', navArgs)
          } catch (err: unknown) {
            if (!mountedRef.current) return
            if (err instanceof ProfileSaveError) {
              if (err.kind === 'auth' && !isAuthRetry) {
                try {
                  await supabase.auth.signInAnonymously()
                  await doSave(true)
                  return
                } catch {
                  // Fall through to show error
                }
              }
              const msg = err.kind === 'network'
                ? "Couldn't reach the server. Check your connection and retry."
                : 'Profile save failed. Your reading is ready — continue anyway.'
              setSavePhase('save-error')
              setSaveErrorMsg(msg)
            } else {
              setSavePhase('save-error')
              setSaveErrorMsg('An unexpected error occurred. Your reading is ready — continue anyway.')
            }
            retrySaveRef.current = () => doSave()
          }
        }

        await doSave()
      } catch (err: unknown) {
        if (!mountedRef.current) return
        const message =
          err instanceof Error ? err.message : 'Please check your connection and try again'
        setLlmError(message)
      }
    })()

    return () => {
      mountedRef.current = false
    }
  }, [retryBump])

  const handleSaveRetry = () => {
    const nextCount = manualRetryCount + 1
    setManualRetryCount(nextCount)
    retrySaveRef.current?.()
  }

  const handleContinueOffline = () => {
    setPendingServerSync(true)
    // retrySaveRef.current is not null at this point — use its navArgs closure
    // by triggering navigation directly; the retry closure would call doSave
    // which re-navigates on success. For offline, we skip the save.
    // Navigate using last known navArgs stored in the doSave closure via retrySaveRef.
    // Since we can't access navArgs directly, we use the existing store state.
    const store = useProfileStore.getState()
    const arch = store.archetype ?? ''
    const archetypeName = `The ${arch.charAt(0).toUpperCase()}${arch.slice(1)}`
    navigation.replace('BigThreeReveal', {
      sunSign:       store.sunSign    ?? '',
      moonSign:      store.moonSign   ?? '',
      risingSign:    store.risingSign ?? '',
      archetypeName,
    })
  }

  if (llmError != null) {
    return (
      <ScreenWrapper scroll={false} padded={false} background='base'>
        <View style={styles.centered} accessibilityLiveRegion="polite">
          <ErrorState
            heading="We couldn't read your chart"
            body={llmError}
            actionLabel="Try again"
            onActionPress={() => setRetryBump((n) => n + 1)}
          />
        </View>
      </ScreenWrapper>
    )
  }

  return (
    <View style={styles.container}>
      <AtmosphericBackground variant="hero" glowPosition="top-center" grain />
      <OmenLoader size={80} />
      <Text variant="display2" style={styles.label}>
        {savePhase === 'saving' ? 'Saving your profile…' : LOADING_PHRASES[phraseIndex]}
      </Text>
      {savePhase === 'save-error' && saveErrorMsg && (
        <View style={styles.saveErrorZone}>
          <Text variant="body" color="secondary" style={styles.saveErrorText}>
            {saveErrorMsg}
          </Text>
          {manualRetryCount < MAX_MANUAL_RETRIES ? (
            <Pressable onPress={handleSaveRetry} style={styles.saveActionBtn}>
              <Text variant="label" color="secondary">Retry</Text>
            </Pressable>
          ) : (
            <Pressable onPress={handleContinueOffline} style={styles.saveActionBtn}>
              <Text variant="label" color="secondary">Continue offline</Text>
            </Pressable>
          )}
        </View>
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
    position:        'relative',
  },
  centered: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  label: {
    marginTop:         space['8'],
    textAlign:         'center',
    paddingHorizontal: layout.screenPadding,
  },
  saveErrorZone: {
    position:          'absolute',
    bottom:            60,
    alignItems:        'center',
    paddingHorizontal: layout.screenPadding,
  },
  saveErrorText: {
    textAlign:    'center',
    marginBottom: space['3'],
  },
  saveActionBtn: {
    paddingVertical:   space['2'],
    paddingHorizontal: space['5'],
  },
})
