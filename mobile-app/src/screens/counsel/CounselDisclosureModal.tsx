import React, { useState, useCallback, useEffect } from 'react'
import { ScrollView, View, StyleSheet } from 'react-native'
import { Text, Button } from '../../components/atoms'
import { Modal } from '../../components/organisms'
import { useProfileStore } from '../../stores/profileStore'
import { space, layout } from '../../design/tokens'

export interface CounselDisclosureModalProps {
  visible:           boolean
  onAccept:          () => void
  onCrisisResources: () => void
}

type DisclosureStep = 'intro' | 'consent'

const INTRO_BULLETS = [
  'Professional mental health support',
  'Medical or psychiatric advice',
  'Legal or financial counsel',
  'Emergency or crisis intervention',
] as const

const CONSENT_BULLETS = [
  'Be wrong about specific facts',
  'Reflect patterns it learned from training, not truth about you',
  'Sound more certain than it should',
] as const

export const CounselDisclosureModal: React.FC<CounselDisclosureModalProps> = ({
  visible,
  onAccept,
  onCrisisResources,
}) => {
  const setHasAcceptedCounselDisclosure = useProfileStore(
    (s) => s.setHasAcceptedCounselDisclosure
  )

  const [step, setStep] = useState<DisclosureStep>('intro')

  useEffect(() => {
    if (visible) setStep('intro')
  }, [visible])

  const handleAccept = useCallback(() => {
    setHasAcceptedCounselDisclosure(true)
    onAccept()
  }, [setHasAcceptedCounselDisclosure, onAccept])

  return (
    <Modal
      visible={visible}
      onClose={() => {}}
      presentationStyle="fullScreen"
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {step === 'intro' ? (
          <>
            <Text variant="heading1" color="primary" style={styles.title}>
              Before you begin
            </Text>

            <Text variant="body" color="secondary" style={styles.paragraph}>
              Counsel is an AI conversation partner trained on your birth chart,
              archetype, and the same astrological traditions OMENORA uses
              throughout the app.
            </Text>

            <Text variant="body" color="secondary" style={styles.paragraph}>
              It's designed for self-reflection — to help you sit with patterns,
              questions, and decisions you're already thinking about.
            </Text>

            <Text variant="body" color="secondary" style={styles.paragraph}>
              It is not a substitute for:
            </Text>

            <View style={styles.bulletList}>
              {INTRO_BULLETS.map((item) => (
                <View key={item} style={styles.bulletRow}>
                  <Text variant="body" color="secondary" style={styles.bulletMark}>
                    {'•'}
                  </Text>
                  <Text variant="body" color="secondary" style={styles.bulletText}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>

            <Text variant="body" color="secondary" style={styles.paragraph}>
              If you're in crisis, or need immediate support, tap "Crisis resources"
              anytime to find help.
            </Text>

            <View style={styles.actions}>
              <Button
                label="Continue →"
                variant="premium"
                fullWidth
                onPress={() => setStep('consent')}
              />
              <Button
                label="Crisis resources"
                variant="tertiary"
                onPress={onCrisisResources}
              />
            </View>
          </>
        ) : (
          <>
            <Text variant="heading1" color="primary" style={styles.title}>
              Counsel is AI
            </Text>

            <Text variant="body" color="secondary" style={styles.paragraph}>
              You're about to talk with AI, not a human.
            </Text>

            <Text variant="body" color="secondary" style={styles.paragraph}>
              Counsel may sometimes:
            </Text>

            <View style={styles.bulletList}>
              {CONSENT_BULLETS.map((item) => (
                <View key={item} style={styles.bulletRow}>
                  <Text variant="body" color="secondary" style={styles.bulletMark}>
                    {'•'}
                  </Text>
                  <Text variant="body" color="secondary" style={styles.bulletText}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>

            <Text variant="body" color="secondary" style={styles.paragraph}>
              Treat its responses as a starting point for your own thinking — not
              as instructions.
            </Text>

            <Text variant="body" color="secondary" style={styles.paragraph}>
              Your conversations are sent to OMENORA's servers and to Anthropic (the
              AI provider) to generate responses. They are not stored after your
              session ends and are never used to train AI models.
            </Text>

            <Text variant="caption" color="tertiary" style={styles.footer}>
              You can revisit these guidelines anytime under More → Counsel
              guidelines.
            </Text>

            <View style={styles.actions}>
              <Button
                label="I understand — Start chatting"
                variant="premium"
                fullWidth
                onPress={handleAccept}
              />
            </View>
          </>
        )}
      </ScrollView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop:        space['8'],
    paddingBottom:     space['12'],
  },
  title: {
    marginBottom: space['6'],
  },
  paragraph: {
    marginBottom: space['4'],
  },
  bulletList: {
    gap:          space['2'],
    marginBottom: space['4'],
  },
  bulletRow: {
    flexDirection: 'row',
    gap:           space['3'],
  },
  bulletMark: {
    width:     space['4'],
    textAlign: 'center',
  },
  bulletText: {
    flex: 1,
  },
  footer: {
    marginTop:    space['2'],
    marginBottom: space['6'],
  },
  actions: {
    gap:       space['3'],
    marginTop: space['6'],
  },
})
