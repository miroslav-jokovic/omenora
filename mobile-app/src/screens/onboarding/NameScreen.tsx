import React from 'react'
import { View, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'
import { MotiView } from 'moti'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Text, Button } from '../../components/atoms'
import { TextField } from '../../components/molecules'
import { AtmosphericBackground } from '../../components/atmosphere'
import { useProfileStore } from '../../stores/profileStore'
import { surface, text, space, layout } from '../../design/tokens'
import { RootStackParamList } from '../../navigation/types'

type NameNavProp = NativeStackNavigationProp<RootStackParamList, 'Name'>

const NAME_HEADER_FROM       = { opacity: 0, translateY: 16 } as const
const NAME_HEADER_ANIMATE    = { opacity: 1, translateY: 0  } as const
const NAME_HEADER_TRANSITION = { type: 'timing' as const, duration: 800, delay: 100 }

const NAME_INPUT_FROM       = { opacity: 0, translateY: 12 } as const
const NAME_INPUT_ANIMATE    = { opacity: 1, translateY: 0  } as const
const NAME_INPUT_TRANSITION = { type: 'timing' as const, duration: 800, delay: 300 }

const NAME_CTA_FROM       = { opacity: 0, translateY: 8 } as const
const NAME_CTA_ANIMATE    = { opacity: 1, translateY: 0 } as const
const NAME_CTA_TRANSITION = { type: 'timing' as const, duration: 800, delay: 500 }

export default function NameScreen() {
  const navigation  = useNavigation<NameNavProp>()
  const firstName   = useProfileStore((s) => s.firstName)
  const setFirstName = useProfileStore((s) => s.setFirstName)

  const canContinue = firstName.trim().length > 0

  return (
    <View style={styles.root} testID="name-screen-root">
      <AtmosphericBackground variant="default" glowPosition="top-center" grain graphicOverlay vignette="bottom" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <Pressable
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
            hitSlop={12}
            style={styles.backButton}
          >
            <ChevronLeft size={24} color={text.secondary} />
          </Pressable>
          <View style={styles.content}>
            <MotiView
              from={NAME_HEADER_FROM}
              animate={NAME_HEADER_ANIMATE}
              transition={NAME_HEADER_TRANSITION}
              style={styles.header}
            >
              <Text variant="eyebrow" color="secondary" style={styles.eyebrow}>
                YOUR NAME
              </Text>
              <Text variant="heading1" color="primary" style={styles.headline}>
                What shall we call you?
              </Text>
              <Text variant="readingBody" color="secondary" style={styles.support}>
                Your reading begins with your name.
              </Text>
            </MotiView>

            <MotiView
              from={NAME_INPUT_FROM}
              animate={NAME_INPUT_ANIMATE}
              transition={NAME_INPUT_TRANSITION}
              testID="name-input"
            >
              <TextField
                type="name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Your first name"
                autoFocus
              />
            </MotiView>
          </View>

          <MotiView
            from={NAME_CTA_FROM}
            animate={NAME_CTA_ANIMATE}
            transition={NAME_CTA_TRANSITION}
            style={styles.footer}
            testID="name-cta-continue"
          >
            <Button
              label="Continue"
              variant="premium"
              fullWidth
              disabled={!canContinue}
              onPress={() => navigation.navigate('DateOfBirth')}
            />
          </MotiView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: surface.deep,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex:              1,
    justifyContent:    'center',
    paddingHorizontal: layout.screenPadding,
    gap:               space['8'],
  },
  header: {
    gap: space['3'],
  },
  eyebrow: {
    // letterSpacing provided by typeScale.eyebrow (tracking.caps)
  },
  headline: {
    marginTop: space['1'],
  },
  support: {
    marginTop: space['1'],
  },
  footer: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom:     space['6'],
  },
  backButton: {
    alignSelf:         'flex-start',
    minWidth:          layout.tapTarget,
    minHeight:         layout.tapTarget,
    alignItems:        'center',
    justifyContent:    'center',
    marginLeft:        layout.screenPadding - space['2'],
    marginTop:         space['2'],
  },
})
