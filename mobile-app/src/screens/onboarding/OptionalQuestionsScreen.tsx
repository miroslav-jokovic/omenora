import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { MotiView } from 'moti'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { OnboardingStep } from '../../components/templates'
import { Button } from '../../components/atoms'
import { ChipGroup, ProgressDots } from '../../components/molecules'
import type { ChipOption } from '../../components/molecules'
import { useProfileStore } from '../../stores/profileStore'
import { space } from '../../design/tokens'
import { RootStackParamList } from '../../navigation/types'

type OptionalQuestionsNavProp = NativeStackNavigationProp<RootStackParamList, 'OptionalQuestions'>

const QUESTIONS = [
  {
    id: 'life_focus',
    question: 'What is your life focused on right now?',
    type: 'multi' as const,
    options: [
      { value: 'love',         label: 'Love & relationships' },
      { value: 'career',       label: 'Career & purpose'     },
      { value: 'inner_growth', label: 'Inner growth'         },
      { value: 'spiritual',    label: 'Spiritual exploration' },
      { value: 'curiosity',    label: 'General curiosity'    },
    ],
  },
  {
    id: 'tone_pref',
    question: 'How would you like your reading to sound?',
    type: 'single' as const,
    options: [
      { value: 'gentle',   label: 'Gentle'   },
      { value: 'direct',   label: 'Direct'   },
      { value: 'mystical', label: 'Mystical' },
    ],
  },
  {
    id: 'astro_familiarity',
    question: 'How familiar are you with astrology?',
    type: 'single' as const,
    options: [
      { value: 'new',      label: 'New to this'    },
      { value: 'some',     label: 'Some knowledge' },
      { value: 'familiar', label: 'Quite familiar' },
    ],
  },
] as const

export default function OptionalQuestionsScreen() {
  const navigation = useNavigation<OptionalQuestionsNavProp>()
  const setAnswer  = useProfileStore((s) => s.setAnswer)

  const [questionIndex,  setQuestionIndex]  = useState(0)
  // Multi-select arrays keyed by question id
  const [multiAnswers,   setMultiAnswers]   = useState<Record<string, string[]>>({})
  // Single-select values keyed by question id
  const [singleAnswers,  setSingleAnswers]  = useState<Record<string, string | null>>({})

  const currentQ  = QUESTIONS[questionIndex]
  const isLast    = questionIndex === QUESTIONS.length - 1
  const chipOptions: ChipOption[] = currentQ.options.map((o) => ({ id: o.value, label: o.label }))

  const canContinue = currentQ.type === 'multi'
    ? (multiAnswers[currentQ.id]?.length ?? 0) > 0
    : singleAnswers[currentQ.id] != null

  const saveAllAndNavigate = () => {
    // Multi-select arrays are JSON-serialized per the Record<string,string> store contract
    QUESTIONS.forEach((q) => {
      if (q.type === 'multi') {
        const arr = multiAnswers[q.id]
        if (arr && arr.length > 0) setAnswer(q.id, JSON.stringify(arr))
      } else {
        const val = singleAnswers[q.id]
        if (val != null) setAnswer(q.id, val)
      }
    })
    navigation.replace('PremiumTeaser')
  }

  const handleContinue = () => {
    if (isLast) {
      saveAllAndNavigate()
    } else {
      setQuestionIndex((n) => n + 1)
    }
  }

  return (
    <OnboardingStep
      onBack={() => {
        if (questionIndex > 0) {
          setQuestionIndex((n) => n - 1)
        } else {
          navigation.goBack()
        }
      }}
      progress={<ProgressDots total={QUESTIONS.length} current={questionIndex} />}
      heading={currentQ.question}
      footer={
        <View style={styles.footerActions}>
          <Button
            label={isLast ? 'Finish' : 'Continue'}
            variant="premium"
            fullWidth
            disabled={!canContinue}
            onPress={handleContinue}
          />
          <Button
            label="Skip for now"
            variant="tertiary"
            fullWidth
            onPress={saveAllAndNavigate}
          />
        </View>
      }
    >
      <MotiView
        key={questionIndex}
        from={{ opacity: 0, translateX: 8 }}
        animate={{ opacity: 1, translateX: 0 }}
        transition={{ type: 'timing', duration: 220 }}
      >
        {currentQ.type === 'multi' ? (
          <ChipGroup
            mode="multi"
            options={chipOptions}
            value={multiAnswers[currentQ.id] ?? []}
            onChange={(val) =>
              setMultiAnswers((prev) => ({ ...prev, [currentQ.id]: val }))
            }
          />
        ) : (
          <ChipGroup
            mode="single"
            options={chipOptions}
            value={singleAnswers[currentQ.id] ?? null}
            onChange={(val) =>
              setSingleAnswers((prev) => ({ ...prev, [currentQ.id]: val }))
            }
          />
        )}
      </MotiView>
    </OnboardingStep>
  )
}

const styles = StyleSheet.create({
  footerActions: {
    gap: space['3'],
  },
})
