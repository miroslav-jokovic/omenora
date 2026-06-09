import React from 'react'
import { View, Pressable, Linking, ScrollView, StyleSheet, Alert } from 'react-native'
import { Phone, MessageSquare, Globe } from 'lucide-react-native'
import { Text } from '../../components/atoms'
import { Card, Header } from '../../components/organisms'
import { ScreenWrapper } from '../../components/templates'
import { tokens, space, layout } from '../../design/tokens'
import type { CrisisResourcesScreenProps } from '../../navigation/types'

const RESOURCES = [
  {
    name:        '988 Suicide & Crisis Lifeline',
    description: 'Free, confidential, 24/7 support for anyone in suicidal crisis or emotional distress in the United States.',
    actionLabel: 'Call 988',
    url:         'tel:988',
    Icon:        Phone,
  },
  {
    name:        'Crisis Text Line',
    description: 'Free, 24/7 support via text message. Trained counselors respond to texts about anxiety, depression, suicidal ideation, and more.',
    actionLabel: 'Text HOME to 741741',
    url:         'sms:741741?body=HOME',
    Icon:        MessageSquare,
  },
  {
    name:        'International Association for Suicide Prevention',
    description: 'Directory of crisis lines and suicide prevention resources by country.',
    actionLabel: 'Visit iasp.info',
    url:         'https://www.iasp.info/resources/Crisis_Centres/',
    Icon:        Globe,
  },
] as const

export default function CrisisResourcesScreen({ navigation }: CrisisResourcesScreenProps) {
  return (
    <ScreenWrapper scroll={false} padded={false} background="base">
      <Header title="Crisis Resources" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="body" color="secondary" style={styles.intro}>
          If you or someone you know is in crisis, please reach out to one of these
          resources.
        </Text>

        <View style={styles.cards}>
          {RESOURCES.map(({ name, description, actionLabel, url, Icon }) => (
            <Card key={name} variant="default" padding="default">
              <Text variant="heading2" color="primary" style={styles.resourceName}>
                {name}
              </Text>
              <Text variant="body" color="secondary" style={styles.resourceDesc}>
                {description}
              </Text>
              <Pressable
                style={styles.actionRow}
                onPress={() => {
                  Linking.openURL(url).catch(() => {
                    Alert.alert('Could not open', `Please reach out directly: ${actionLabel}.`)
                  })
                }}
                accessibilityRole="button"
                accessibilityLabel={actionLabel}
              >
                <Icon size={18} color={tokens.accent.primary} />
                <Text variant="label" color="accent">
                  {actionLabel}
                </Text>
              </Pressable>
            </Card>
          ))}
        </View>

        <Text variant="caption" color="tertiary" style={styles.footer}>
          OMENORA Counsel is not a substitute for professional crisis intervention.
          If you are in immediate danger, please call emergency services (911 in the
          US) or go to the nearest emergency room.
        </Text>
      </ScrollView>
    </ScreenWrapper>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: layout.screenPadding,
    paddingTop:        space['4'],
    paddingBottom:     space['10'],
    gap:               space['5'],
  },
  intro: {
    marginBottom: space['2'],
  },
  cards: {
    gap: space['4'],
  },
  resourceName: {
    marginBottom: space['2'],
  },
  resourceDesc: {
    marginBottom: space['4'],
  },
  actionRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           space['2'],
  },
  footer: {
    marginTop: space['4'],
  },
})
