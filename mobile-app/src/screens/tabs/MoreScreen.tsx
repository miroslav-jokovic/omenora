import React, { useCallback, useEffect, useState } from 'react'
import { View, ScrollView, Alert, Linking, StyleSheet } from 'react-native'
import { SvgXml } from 'react-native-svg'
import { SafeAreaView } from 'react-native-safe-area-context'
import { CommonActions } from '@react-navigation/native'
import Constants from 'expo-constants'
import {
  Heart,
  Calendar,
  Compass,
  User,
  CreditCard,
  Bell,
  Globe,
  Shield,
  FileText,
  Info,
  LifeBuoy,
  Trash2,
  AlertTriangle,
  LogOut,
  HelpCircle,
  Mail,
  Layers,
  Lock,
} from 'lucide-react-native'
import { Text } from '../../components/atoms'
import { Card } from '../../components/organisms'
import { ListItem } from '../../components/molecules'
import { useProfileStore } from '../../stores/profileStore'
import { usePurchases } from '../../context/usePurchases'
import { useAuth } from '../../context/useAuth'
import { tokens, space, layout } from '../../design/tokens'
import { AtmosphericBackground } from '../../components/atmosphere'
import type { MoreScreenProps } from '../../navigation/types'

// Omenora logomark — same inline SVG used by WelcomeScreen
const LOGO_FILL = '#F2EDE5'
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 301.62 499.33">
  <polygon fill="${LOGO_FILL}" points="301.62 210.03 234.96 187.05 174.86 114.93 150.08 0 301.62 210.03"/>
  <polygon fill="${LOGO_FILL}" points="150.08 499.33 0 214 79.78 195.77 150.08 499.33"/>
  <path fill="${LOGO_FILL}" d="M301.62,210.03l-151.54,289.29c3.2-86.22,39.95-196.34,84.88-312.28l66.66,22.98Z" opacity="0.75"/>
  <polygon fill="${LOGO_FILL}" points="150.08 0 79.78 195.77 0 214 150.08 0" opacity="0.55"/>
  <polygon fill="${LOGO_FILL}" points="174.86 114.93 79.78 195.77 150.08 0 174.86 114.93" opacity="0.88"/>
  <path fill="${LOGO_FILL}" d="M234.96,187.05c-44.93,115.94-81.68,226.06-84.88,312.28L79.78,195.77l95.08-80.84,60.11,72.12Z" opacity="0.65"/>
</svg>`

export default function MoreScreen({ navigation }: MoreScreenProps) {
  const { languageOverride } = useProfileStore()
  const { isPremium, presentCustomerCenter, presentPaywall } = usePurchases()
  const { signOut, showAuthGate, isAnonymous, displayName, user } = useAuth()

  const [awaitingSignIn, setAwaitingSignIn] = useState(false)

  useEffect(() => {
    if (awaitingSignIn && !isAnonymous) {
      setAwaitingSignIn(false)
      if (!isPremium) {
        presentPaywall()
      }
    }
  }, [awaitingSignIn, isAnonymous, isPremium, presentPaywall])

  const version = Constants.expoConfig?.version ?? 'unknown'

  const handleSignOut = useCallback(async () => {
    if (isAnonymous) {
      // Anonymous users: signing out abandons their local-only session — data-loss warning.
      Alert.alert(
        'Sign out and lose your data?',
        'Your profile and readings are not linked to an account and cannot be recovered after sign-out.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign out',
            style: 'destructive',
            onPress: async () => {
              try {
                await signOut({ skipWarning: true })
                const parent = navigation.getParent()
                if (parent) {
                  parent.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Splash' }] }))
                } else {
                  console.warn('[MoreScreen] sign-out: getParent() returned null, falling back to navigation.dispatch — investigate navigator nesting')
                  navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Splash' }] }))
                }
              } catch (err) {
                Alert.alert('Could not sign out', String(err))
              }
            },
          },
        ],
      )
    } else {
      // Permanent users: sign-out is recoverable — skip the dialog, one tap.
      try {
        await signOut({ skipWarning: true })
        const parent = navigation.getParent()
        if (parent) {
          parent.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Splash' }] }))
        } else {
          console.warn('[MoreScreen] sign-out: getParent() returned null, falling back to navigation.dispatch — investigate navigator nesting')
          navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Splash' }] }))
        }
      } catch (err) {
        Alert.alert('Could not sign out', String(err))
      }
    }
  }, [signOut, isAnonymous, navigation])

  return (
    <View style={styles.root}>
      <AtmosphericBackground variant="standard" />
      <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Brand logo mark ────────────────────────────────────────── */}
        <View style={styles.logoBlock}>
          <SvgXml
            xml={LOGO_SVG}
            width={styles.logoMark.width}
            height={styles.logoMark.height}
            accessibilityLabel="Omenora"
          />
        </View>

        {/* ── Account header ─────────────────────────────────────────── */}
        <Card variant="content" padding="default">
          <Text variant="heading2" color="primary">Account</Text>
          <View style={styles.accountSubRow}>
            <View style={styles.accountIdentity}>
              <Text variant="body" color="secondary">
                {displayName || 'Welcome'}
              </Text>
              {!isAnonymous && user?.email ? (
                <Text variant="caption" color="tertiary" style={styles.accountEmail}>
                  {user.email}
                </Text>
              ) : null}
            </View>
            <View style={[styles.planBadge, isPremium && styles.planBadgePremium]}>
              <Text variant="micro" color={isPremium ? 'accent' : 'tertiary'}>
                {isPremium ? 'PREMIUM' : 'FREE'}
              </Text>
            </View>
          </View>
        </Card>

        {/* ── Section 1: Premium Features ────────────────────────────── */}
        <View>
          <Text variant="micro" color="tertiary" style={styles.sectionHeading}>
            Premium Features
          </Text>
          <Card variant="content" style={styles.listCard}>
            <ListItem
              icon={Heart}
              label="Compatibility"
              onPress={() => navigation.navigate('Compatibility')}
              showChevron
            />
            <View style={styles.divider} />
            <ListItem
              icon={Calendar}
              label="Lucky Timing Calendar"
              onPress={() => navigation.navigate('Calendar')}
              showChevron
            />
            <View style={styles.divider} />
            <ListItem
              icon={Compass}
              label="Tradition switcher"
              onPress={() => navigation.navigate('TraditionSwitcher')}
              showChevron
            />
          </Card>
        </View>

        {/* ── Section 2: Account & Settings ──────────────────────────── */}
        <View>
          <Text variant="micro" color="tertiary" style={styles.sectionHeading}>
            Account &amp; Settings
          </Text>
          <Card variant="content" style={styles.listCard}>
            {/* Sign-in CTA — only visible for anonymous users */}
            {isAnonymous && (
              <>
                <ListItem
                  icon={AlertTriangle}
                  label="Sign in or create account"
                  meta="Your reading isn't backed up"
                  onPress={() => { setAwaitingSignIn(true); showAuthGate() }}
                  showChevron
                />
                <View style={styles.divider} />
              </>
            )}
            {/* Profile route not yet registered — Phase 6 */}
            <ListItem
              icon={User}
              label="Profile"
              onPress={() => navigation.navigate('Profile')}
              showChevron
            />
            <View style={styles.divider} />
            {/* Subscription route not in RootStackParamList — open iOS subscription management */}
            <ListItem
              icon={CreditCard}
              label="Subscription"
              onPress={presentCustomerCenter}
              showChevron
            />
            <View style={styles.divider} />
            {/* Notifications route not yet registered — Phase 6 */}
            <ListItem
              icon={Bell}
              label="Notifications"
              onPress={() => navigation.navigate('Notifications')}
              showChevron
            />
            <View style={styles.divider} />
            {/* Language selector — Phase 6 */}
            <ListItem
              icon={Globe}
              label="Language"
              meta={languageOverride ?? 'English'}
              onPress={() => navigation.navigate('Language')}
              showChevron
            />
          </Card>
        </View>

        {/* ── Section 3: Trust & Compliance ──────────────────────────── */}
        <View>
          <Text variant="micro" color="tertiary" style={styles.sectionHeading}>
            Trust &amp; Compliance
          </Text>
          <Card variant="content" style={styles.listCard}>
            {/* navigate() not Linking — web /privacy URL doesn't exist yet */}
            <ListItem
              icon={Shield}
              label="Privacy & Data"
              onPress={() => navigation.navigate('PrivacySettings')}
              showChevron
            />
            <View style={styles.divider} />
            {/* navigate() not Linking — web /terms URL doesn't exist yet */}
            <ListItem
              icon={FileText}
              label="Terms of Service"
              onPress={() => navigation.navigate('Terms')}
              showChevron
            />
            <View style={styles.divider} />
            <ListItem
              icon={Info}
              label="Counsel guidelines"
              onPress={() => navigation.navigate('CounselChat', { showDisclosure: true })}
              showChevron
            />
            <View style={styles.divider} />
            <ListItem
              icon={LifeBuoy}
              label="Crisis resources"
              onPress={() => navigation.navigate('CrisisResources')}
              showChevron
            />
            {!isAnonymous && (
              <>
                <View style={styles.divider} />
                <ListItem
                  icon={Trash2}
                  label="Account deletion"
                  destructive
                  onPress={() => navigation.navigate('DeleteAccount')}
                />
              </>
            )}
            <View style={styles.divider} />
            <ListItem
              icon={LogOut}
              label="Sign out"
              onPress={handleSignOut}
            />
          </Card>
        </View>

        {/* ── Section 4: Support ─────────────────────────────────────── */}
        <View>
          <Text variant="micro" color="tertiary" style={styles.sectionHeading}>
            Support
          </Text>
          <Card variant="content" style={styles.listCard}>
            {/* /faq page does not exist on web yet — disabled until it ships */}
            <ListItem
              icon={HelpCircle}
              label="Help / FAQ"
              meta="Coming soon"
              disabled
            />
            <View style={styles.divider} />
            <ListItem
              icon={Mail}
              label="Contact support"
              onPress={() => Linking.openURL('mailto:support@omenora.com')}
              showChevron
            />
            <View style={styles.divider} />
            <ListItem
              icon={Info}
              label="About OMENORA"
              meta={`v${version}`}
            />
          </Card>
        </View>

        {/* ── Section 5: Developer (dev-only) ───────────────────────── */}
        {__DEV__ && (
          <View>
            <Text variant="micro" color="tertiary" style={styles.sectionHeading}>
              Developer (dev-only)
            </Text>
            <Card variant="content" style={styles.listCard}>
              <ListItem
                icon={Layers}
                label="Component Gallery"
                onPress={() => navigation.navigate('Components')}
                showChevron
              />
              <View style={styles.divider} />
              <ListItem
                icon={Lock}
                label="Test AuthGate"
                onPress={() => showAuthGate({ title: 'Test', body: 'Dev test trigger' })}
              />
            </Card>
          </View>
        )}

      </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: tokens.surface.deep,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: layout.screenPadding,
    paddingTop:        space['6'],
    paddingBottom:     space['10'],
    gap:               layout.cardGap,
  },
  accountSubRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginTop:      space['2'],
  },
  accountIdentity: {
    flex: 1,
    gap:  space['0.5'],
  },
  accountEmail: {
  },
  planBadge: {
    borderWidth:       1,
    borderColor:       tokens.border.subtle,
    borderRadius:      4,
    paddingVertical:   space['0.5'],
    paddingHorizontal: space['2'],
  },
  planBadgePremium: {
    borderColor: tokens.border.accent,
  },
  logoBlock: {
    alignItems:   'center',
    paddingBottom: space['6'],
  },
  logoMark: {
    width:   40,
    height:  40,
  },
  sectionHeading: {
    marginBottom: space['2'],
  },
  listCard: {
    paddingHorizontal: 0,
    paddingVertical:   0,
    overflow:          'hidden',
  },
  divider: {
    height:           1,
    backgroundColor:  tokens.border.default,
    marginHorizontal: space['4'],
  },
})
