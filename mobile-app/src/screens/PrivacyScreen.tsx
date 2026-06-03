import React from 'react'
import { View, StyleSheet } from 'react-native'
import { ChevronLeft } from 'lucide-react-native'
import { Pressable } from 'react-native'
import { PrivacyScreenProps } from '../navigation/types'
import { ScreenWrapper } from '../components/templates'
import { Text } from '../components/atoms'
import { tokens, space, layout } from '../design/tokens'

const SECTIONS = [
  {
    title: 'Information We Collect',
    body: 'We collect your first name, date of birth, time of birth, city, and email address solely to generate your personal destiny report. Anonymous usage analytics help us improve the service.',
  },
  {
    title: 'How We Use Your Data',
    body: 'Your data is used exclusively to generate and deliver your destiny report. We do not sell, rent, or share your personal information with third parties for marketing purposes.',
  },
  {
    title: 'Data Storage & Security',
    body: 'Your data is stored securely using industry-standard encryption. Reports are retained for 12 months so you can reference them. We use 256-bit SSL on all data in transit.',
  },
  {
    title: 'Payment Information',
    body: 'Purchases made within the app are processed securely by the app store you downloaded OMENORA from (the Apple App Store or Google Play). We never receive or store your payment card details — your payment information is handled entirely by Apple or Google under their respective privacy and payment terms.',
  },
  {
    title: 'Your Rights',
    body: 'You may request deletion of your data at any time by emailing privacy@omenora.com. We will process all deletion requests within 30 days in accordance with applicable law.',
  },
  {
    title: 'Contact',
    body: 'For any privacy concerns, contact us at privacy@omenora.com. Last updated: January 2026.',
  },
];

export const PrivacyScreen: React.FC<PrivacyScreenProps> = ({ navigation }) => (
  <ScreenWrapper
    scroll
    padded
    contentContainerStyle={styles.scroll}
  >
    <Pressable onPress={() => navigation.goBack()} style={styles.back} hitSlop={12}>
      <ChevronLeft size={24} color={tokens.text.secondary} />
    </Pressable>

    <Text variant="micro" color="accent" style={styles.eyebrow}>LEGAL</Text>
    <Text variant="display2" color="primary" style={styles.heading}>Privacy Policy</Text>
    <Text variant="caption" color="tertiary" style={styles.lastUpdated}>Effective January 2026</Text>

    <View style={styles.rule} />

    {SECTIONS.map(({ title, body }) => (
      <View key={title} style={styles.section}>
        <Text variant="micro" color="tertiary" style={styles.sectionTitle}>{title}</Text>
        <Text variant="body" color="secondary">{body}</Text>
      </View>
    ))}
  </ScreenWrapper>
)

const styles = StyleSheet.create({
  scroll:       { paddingTop: space['4'], paddingBottom: space['16'] },
  back:         { marginBottom: space['8'], alignSelf: 'flex-start', minHeight: layout.tapTarget, justifyContent: 'center' },
  eyebrow:      { marginBottom: space['2'] },
  heading:      { marginBottom: space['2'] },
  lastUpdated:  { marginBottom: space['6'] },
  rule:         { height: StyleSheet.hairlineWidth, backgroundColor: tokens.border.subtle, marginBottom: space['8'] },
  section:      { marginBottom: space['8'] },
  sectionTitle: { marginBottom: space['2'] },
})
