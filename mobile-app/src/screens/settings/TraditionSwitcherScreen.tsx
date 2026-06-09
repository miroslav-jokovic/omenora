import React, { useCallback } from 'react'
import { ScrollView, View, StyleSheet } from 'react-native'
import { ScreenWrapper } from '../../components/templates'
import { Header, LockedCard } from '../../components/organisms'
import { Text, Chip } from '../../components/atoms'
import { useProfileStore } from '../../stores/profileStore'
import { usePurchases } from '../../context/usePurchases'
import { tokens, layout, space } from '../../design/tokens'
import type { TraditionSwitcherScreenProps } from '../../navigation/types'

interface TraditionItem {
  id: string
  label: string
  description: string
}

const TRADITIONS: TraditionItem[] = [
  {
    id:          'western',
    label:       'Western',
    description: 'Tropical zodiac. The system most familiar in Europe and the Americas.',
  },
  {
    id:          'vedic',
    label:       'Vedic',
    description: 'Sidereal zodiac. Rooted in Indian astrological tradition.',
  },
  {
    id:          'chinese',
    label:       'Chinese',
    description: 'Animal year + element cycle. Five-element theory.',
  },
  {
    id:          'tarot',
    label:       'Tarot',
    description: 'Major and Minor Arcana. Symbolic archetypal system.',
  },
]

function ChipsList({
  selected,
  onSelect,
}: {
  selected: string
  onSelect: (id: string) => void
}) {
  return (
    <View style={styles.chipsRow}>
      {TRADITIONS.map((t) => (
        <Chip
          key={t.id}
          variant="selection"
          label={t.label}
          selected={t.id === selected}
          onPress={() => onSelect(t.id)}
        />
      ))}
    </View>
  )
}

export default function TraditionSwitcherScreen({ navigation }: TraditionSwitcherScreenProps) {
  const { regionOverride, setRegionOverride } = useProfileStore()
  const { isPremium, presentPaywall } = usePurchases()

  const currentTradition = TRADITIONS.find((t) => t.id === regionOverride)?.id ?? 'western'
  const currentTraditionData = TRADITIONS.find((t) => t.id === currentTradition)!

  const handleSelectTradition = useCallback(
    (traditionId: string) => {
      if (traditionId === currentTradition) return
      setRegionOverride(traditionId)
    },
    [currentTradition, setRegionOverride],
  )

  const handleUnlockPress = useCallback(async () => {
    try {
      await presentPaywall('tradition_switcher')
    } catch (err) {
      console.warn('[TraditionSwitcher] presentPaywall threw:', err)
    }
  }, [presentPaywall])

  return (
    <ScreenWrapper scroll={false} padded={false} background="base">
      <Header title="Tradition" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="body" style={styles.intro}>
          OMENORA reads your chart through different astrological traditions. Switch
          between them anytime to see your archetype through new lenses.
        </Text>

        {isPremium ? (
          <>
            <ChipsList selected={currentTradition} onSelect={handleSelectTradition} />
            <View style={styles.detailBlock}>
              <Text variant="caption" style={styles.activeLabel}>Currently active</Text>
              <Text variant="heading2" style={styles.activeName}>
                {currentTraditionData.label}
              </Text>
              <Text variant="body" style={styles.description}>
                {currentTraditionData.description}
              </Text>
            </View>
          </>
        ) : (
          <LockedCard
            placement="feature_tradition_switcher"
            title="Unlock Tradition Switching"
            description="Access Western, Vedic, Chinese, and Tarot frameworks — each recalculates your full reading in its tradition."
            onUnlockPress={handleUnlockPress}
          />
        )}

        <Text variant="caption" style={styles.footer}>
          Your next reading will use this tradition. Existing readings keep their
          original tradition.
        </Text>
      </ScrollView>
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: layout.screenPadding,
    paddingTop:        space['4'],
    paddingBottom:     space['8'],
    gap:               space['5'],
  },
  intro: {
    color: tokens.text.secondary,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           space['2'],
  },
  detailBlock: {
    gap: space['2'],
  },
  activeLabel: {
    color:         tokens.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  activeName: {
    color: tokens.text.primary,
  },
  description: {
    color: tokens.text.secondary,
  },
  footer: {
    color:     tokens.text.tertiary,
    textAlign: 'center',
  },
})
