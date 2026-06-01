import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text } from '../atoms/Text'
import { Card } from '../organisms/Card'
import { accent } from '../../design/tokens/colors'
import { space } from '../../design/tokens/spacing'

export interface ReadingHeroProps {
  archetypeKey:        string | null
  archetypeDisplayName:string | null
  element:             string | null
  powerTraits:         string[] | null
  identityTeaser:      string | null
}

export default function ReadingHero({
  archetypeKey: _archetypeKey,
  archetypeDisplayName,
  element,
  powerTraits,
  identityTeaser,
}: ReadingHeroProps) {
  const traitLine: string | null = (() => {
    const parts: string[] = []
    if (element != null && element.length > 0) parts.push(element)
    if (powerTraits != null && powerTraits.length > 0) {
      parts.push(...powerTraits.slice(0, 3))
    }
    return parts.length > 0 ? parts.join(' · ') : null
  })()

  return (
    <Card variant="featured" padding="premium">
      {/* Text content layer */}
      <View style={styles.content}>
        <Text variant="subMicro" style={styles.eyebrow}>
          YOUR ARCHETYPE
        </Text>

        {archetypeDisplayName != null ? (
          <Text variant="display2" color="primary" style={styles.headline}>
            {archetypeDisplayName}
          </Text>
        ) : (
          <Text variant="heading1" color="primary" style={styles.headline}>
            Reading prepared
          </Text>
        )}

        {traitLine != null && (
          <Text variant="caption" style={styles.traits}>
            {traitLine}
          </Text>
        )}

        {identityTeaser != null && (
          <Text variant="body" color="secondary" style={styles.teaser} numberOfLines={4}>
            {identityTeaser}
          </Text>
        )}
      </View>
    </Card>
  )
}

const styles = StyleSheet.create({
  content: {},
  eyebrow: {
    color:         accent.primary,
    letterSpacing: 1.5,
    marginBottom:  space['2'],
  },
  headline: {
    marginBottom: space['2'],
  },
  traits: {
    color:        'rgba(255,255,255,0.60)',
    marginBottom: space['3'],
    letterSpacing: 0.4,
  },
  teaser: {
    marginTop: space['1'],
  },
})
