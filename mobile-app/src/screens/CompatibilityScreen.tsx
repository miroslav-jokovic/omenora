import React, { useState, useCallback } from 'react'
import { ScrollView, View, ActivityIndicator, StyleSheet } from 'react-native'
import { ScreenWrapper, ErrorState } from '../components/templates'
import { Header, Card, LockedCard } from '../components/organisms'
import { Text, Button } from '../components/atoms'
import { TextField, DateField, CompatibilityIAPSheet, Toast } from '../components/molecules'
import { parseBackendError } from '../api/errors'
import { useProfileStore } from '../stores/profileStore'
import { usePurchases } from '../context/usePurchases'
import api from '../api/endpoints'
import { tokens, layout, space } from '../design/tokens'
import type { CompatibilityScreenProps } from '../navigation/types'
import type { CompatibilityReading } from '../api/endpoints'

// ── Helpers ───────────────────────────────────────────────────────────────────

function dateToIso(d: Date): string {
  const y  = d.getFullYear()
  const m  = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SECTION_ORDER: Array<keyof CompatibilityReading['sections']> = [
  'bond', 'strength', 'challenge', 'communication', 'powerDynamic', 'forecast', 'advice',
]

// ── State machine ─────────────────────────────────────────────────────────────

type ScreenState =
  | { kind: 'initial' }
  | { kind: 'loading' }
  | { kind: 'result'; reading: CompatibilityReading }
  | { kind: 'error'; message: string }

// ── Component ─────────────────────────────────────────────────────────────────

export const CompatibilityScreen: React.FC<CompatibilityScreenProps> = ({ navigation }) => {
  const firstName        = useProfileStore((s) => s.firstName)
  const dateOfBirth      = useProfileStore((s) => s.dateOfBirth)
  const lifePathNumber   = useProfileStore((s) => s.lifePathNumber)
  const archetype        = useProfileStore((s) => s.archetype)
  const languageOverride = useProfileStore((s) => s.languageOverride)
  const report           = useProfileStore((s) => s.report)

  const { isPremium, presentPaywall, compatibilityAddonOffering } = usePurchases()

  const [screenState, setScreenState]       = useState<ScreenState>({ kind: 'initial' })
  const [partnerName, setPartnerName]       = useState('')
  const [partnerCity, setPartnerCity]       = useState('')
  const [partnerDobDate, setPartnerDobDate] = useState<Date | null>(null)
  const [iapSheetVisible, setIapSheetVisible] = useState(false)
  const [toast, setToast] = useState<{ visible: boolean; message: string }>({ visible: false, message: '' })

  const canSubmit = partnerName.trim().length > 0 && partnerDobDate != null

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return

    if (!archetype || !report) {
      setScreenState({
        kind:    'error',
        message: 'Complete your birth chart profile first before generating a compatibility reading.',
      })
      return
    }

    setScreenState({ kind: 'loading' })

    try {
      const response = await api.generateCompatibility({
        firstName,
        partnerName:    partnerName.trim(),
        partnerDob:     dateToIso(partnerDobDate!),
        partnerCity:    partnerCity.trim() || null,
        language:       languageOverride ?? 'en',
        previewMode:    false,
        archetype,
        element:        report.element,
        lifePathNumber: lifePathNumber ?? 0,
        powerTraits:    report.powerTraits,
        dateOfBirth,
      })

      if (response.success && response.compatibility) {
        setScreenState({ kind: 'result', reading: response.compatibility })
      } else {
        setScreenState({ kind: 'error', message: 'Something went wrong. Please try again.' })
      }
    } catch (err) {
      const parsed = parseBackendError(err)

      if (parsed.kind === 'subscription_required') {
        setScreenState({ kind: 'initial' })
        if (compatibilityAddonOffering !== null) {
          setIapSheetVisible(true)
        } else {
          await presentPaywall()
        }
        return
      }

      if (parsed.kind === 'cap_reached') {
        if (compatibilityAddonOffering !== null) {
          setScreenState({ kind: 'initial' })
          setIapSheetVisible(true)
        } else {
          setScreenState({
            kind: 'error',
            message: "You've reached your monthly compatibility limit. Resets next month.",
          })
        }
        return
      }

      setScreenState({ kind: 'error', message: "Couldn't generate the reading. Please try again." })
    }
  }, [canSubmit, archetype, report, firstName, partnerName, partnerDobDate, partnerCity, languageOverride, lifePathNumber, dateOfBirth, compatibilityAddonOffering, presentPaywall])

  const handleUnlockPress = useCallback(async () => {
    try {
      await presentPaywall()
    } catch (err) {
      console.warn('[Compatibility] presentPaywall threw:', err)
    }
  }, [presentPaywall])

  const handleReset = useCallback(() => {
    setPartnerName('')
    setPartnerCity('')
    setPartnerDobDate(null)
    setScreenState({ kind: 'initial' })
  }, [])

  return (
    <ScreenWrapper scroll={false} padded={false} background="base">
      <Header title="Compatibility" onBack={() => navigation.goBack()} />

      {screenState.kind === 'loading' ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={tokens.accent.primary} />
          <Text variant="body" style={styles.loadingText}>
            Reading the connection between you and {partnerName}…
          </Text>
          <Text variant="caption" style={styles.loadingHint}>
            This usually takes about 20 seconds.
          </Text>
        </View>

      ) : screenState.kind === 'error' ? (
        <ErrorState
          heading="Couldn't generate the reading"
          body={screenState.message}
          actionLabel="Try again"
          onActionPress={handleReset}
        />

      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text variant="body" style={styles.intro}>
            See how your chart connects with someone else's. Two birth dates, one reading.
          </Text>

          {screenState.kind === 'result' ? (
            <>
              <Card variant="premium" padding="premium" style={styles.scoreCard}>
                <Text variant="display1" style={styles.scoreNumber}>
                  {screenState.reading.compatibilityScore}%
                </Text>
                <Text variant="body" style={styles.scoreTitle}>
                  {screenState.reading.compatibilityTitle}
                </Text>
                <Text variant="caption" style={styles.scoreNames}>
                  {firstName} × {partnerName}
                </Text>
              </Card>

              {SECTION_ORDER.map((key) => {
                const section = screenState.reading.sections[key]
                return (
                  <Card key={key} variant="default" style={styles.sectionCard}>
                    <Text variant="label" style={styles.sectionTitle}>
                      {section.title}
                    </Text>
                    <Text variant="body" style={styles.sectionContent}>
                      {section.content}
                    </Text>
                  </Card>
                )
              })}

              <Button
                label="Read someone else"
                variant="secondary"
                fullWidth
                onPress={handleReset}
              />
              {/* TODO: Phase 5 — add "Share this reading" button */}
            </>

          ) : isPremium ? (
            <>
              <View style={styles.form}>
                <TextField
                  label="Partner's name"
                  required
                  type="name"
                  value={partnerName}
                  onChangeText={setPartnerName}
                  placeholder="Enter name"
                />
                <DateField
                  label="Partner's date of birth"
                  required
                  value={partnerDobDate}
                  onChange={setPartnerDobDate}
                  maximumDate={new Date()}
                  placeholder="Select date of birth"
                />
                <TextField
                  label="Partner's birth city (optional)"
                  value={partnerCity}
                  onChangeText={setPartnerCity}
                  placeholder="e.g. London"
                  autoCapitalize="words"
                />
              </View>
              <Button
                label="See your compatibility"
                variant="primary"
                fullWidth
                disabled={!canSubmit}
                onPress={handleSubmit}
              />
            </>

          ) : (
            <LockedCard
              placement="feature_compatibility"
              title="Compatibility Reading"
              description="Seven sections including bond strength, communication style, conflict patterns, and intimacy — your full relationship blueprint."
              onUnlockPress={handleUnlockPress}
            />
          )}
        </ScrollView>
      )}
      <CompatibilityIAPSheet
        visible={iapSheetVisible}
        onDismiss={() => setIapSheetVisible(false)}
        onPurchaseSuccess={() => {
          setToast({ visible: true, message: 'Compatibility reading unlocked' })
          void handleSubmit()
        }}
      />
      <Toast
        variant="success"
        message={toast.message}
        visible={toast.visible}
        onDismiss={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: layout.screenPadding,
    paddingTop:        space['4'],
    paddingBottom:     space['8'],
    gap:               space['4'],
  },
  intro: {
    color: tokens.text.secondary,
  },
  form: {
    gap: space['4'],
  },
  centered: {
    flex:              1,
    alignItems:        'center',
    justifyContent:    'center',
    paddingHorizontal: layout.screenPadding,
    gap:               space['4'],
  },
  loadingText: {
    color:     tokens.text.secondary,
    textAlign: 'center',
  },
  loadingHint: {
    color:     tokens.text.tertiary,
    textAlign: 'center',
  },
  scoreCard: {
    alignItems: 'center',
    gap:        space['2'],
  },
  scoreNumber: {
    color: tokens.text.accent,
  },
  scoreTitle: {
    color:     tokens.text.primary,
    textAlign: 'center',
  },
  scoreNames: {
    color:     tokens.text.tertiary,
    textAlign: 'center',
  },
  sectionCard: {
    gap: space['2'],
  },
  sectionTitle: {
    color:         tokens.text.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionContent: {
    color: tokens.text.secondary,
  },
  decorativeScore: {
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical: space['6'],
    opacity:         0.4,
  },
  decorativeScorePct: {
    color: tokens.text.primary,
  },
  decorativeScoreLabel: {
    color:         tokens.text.secondary,
    marginTop:     space['1'],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
})
