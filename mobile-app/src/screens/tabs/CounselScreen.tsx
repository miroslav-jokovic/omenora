import React, { useCallback, useMemo, useState } from 'react'
import { View, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { MessageCircle } from 'lucide-react-native'
import { Text, Button } from '../../components/atoms'
import { BoostPackSheet } from '../../components/molecules'
import type { BoostPackIdentifier } from '../../components/molecules'
import { useProfileStore } from '../../stores/profileStore'
import { usePurchases } from '../../context/usePurchases'
import { tokens, space, layout } from '../../design/tokens'
import { AtmosphericBackground } from '../../components/atmosphere'
import type { CounselScreenProps } from '../../navigation/types'

export default function CounselScreen({ navigation }: CounselScreenProps) {
  const { sunSign } = useProfileStore()
  const { isPremium, presentPaywall } = usePurchases()
  const [boostSheetVisible, setBoostSheetVisible] = useState(false)

  const sampleQuestions = useMemo(() => [
    "What's coming up for me this week?",
    sunSign
      ? `How do I align with my Sun in ${sunSign}?`
      : `How do I align with my Sun?`,
    "Why does this pattern keep showing up?",
    "What's the meaning behind today's mood?",
  ], [sunSign])

  const handleStartChat = useCallback(async () => {
    try {
      await presentPaywall()
    } catch (err) {
      console.warn('[Counsel] presentPaywall threw:', err)
    }
  }, [presentPaywall])

  return (
    <View style={styles.root}>
      <AtmosphericBackground variant="standard" />
      <SafeAreaView edges={['top']} style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Hero block — always rendered ───────────────────────────── */}
          <View style={styles.hero}>
            <View style={styles.iconWrap}>
              <MessageCircle size={64} color={tokens.accent.primary} strokeWidth={1.5} />
            </View>
            <Text variant="display2" color="primary" style={styles.heading}>
              Ask Counsel anything about your chart
            </Text>
            <Text variant="caption" color="tertiary" style={styles.subheading}>
              Personal guidance from your full birth chart
            </Text>
          </View>

          {isPremium ? (
            // ── Premium: navigate to CounselChatScreen ────────────────
            <View style={styles.ctaBlock}>
              <Button
                label="Open Counsel"
                variant="premium"
                fullWidth
                onPress={() => navigation.navigate('CounselChat')}
              />
              <Text variant="caption" color="tertiary">
                Personal guidance from your full birth chart
              </Text>
            </View>
          ) : (
            <>
              {/* ── Sample question chips (visual-only) ──── */}
              <View style={styles.chips}>
                {sampleQuestions.map((q, i) => (
                  <View key={i} style={styles.chip}>
                    <Text variant="caption" color="secondary">{q}</Text>
                  </View>
                ))}
              </View>

              {/* ── Primary CTA ───────────────────────────────────────── */}
              <View style={styles.ctaBlock}>
                <Button
                  label="Start chatting"
                  onPress={handleStartChat}
                  variant="premium"
                  fullWidth
                />
                <Button
                  label="Or pay per conversation — from $1.99"
                  onPress={() => setBoostSheetVisible(true)}
                  variant="tertiary"
                  fullWidth
                />
                <Text variant="caption" color="tertiary">
                  Tap to unlock Counsel
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
      <BoostPackSheet
        visible={boostSheetVisible}
        onDismiss={() => setBoostSheetVisible(false)}
        onPurchaseSuccess={(_packId: BoostPackIdentifier) => {
          navigation.navigate('CounselChat')
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: tokens.surface.base,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop:        space['8'],
    paddingBottom:     space['10'],
    gap:               layout.cardGap,
  },
  hero: {
    alignItems:   'center',
    gap:          space['4'],
    marginBottom: space['2'],
  },
  iconWrap: {
    padding:         space['5'],
    borderRadius:    48,
    backgroundColor: tokens.surface.raised,
  },
  heading: {
    textAlign: 'center',
  },
  subheading: {
    textAlign: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           space['2'],
  },
  chip: {
    borderWidth:       1,
    borderColor:       tokens.border.subtle,
    borderRadius:      20,
    paddingVertical:   space['2'],
    paddingHorizontal: space['3'],
  },
  ctaBlock: {
    alignItems: 'center',
    gap:        space['3'],
  },
})
