import React, { useState, useEffect } from 'react'
import { StyleSheet, Switch, Alert, Linking, Platform, ScrollView } from 'react-native'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { ScreenWrapper } from '../../components/templates'
import { Header, Card } from '../../components/organisms'
import { ListItem } from '../../components/molecules'
import { Text } from '../../components/atoms'
import { tokens, space, layout } from '../../design/tokens'
import { useAuth } from '../../context/useAuth'
import type { NotificationsScreenProps } from '../../navigation/types'

export default function NotificationsScreen({ navigation }: NotificationsScreenProps) {
  const { session } = useAuth()
  const [pushEnabled, setPushEnabled] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Notifications.getPermissionsAsync().then((perm) => {
      setPushEnabled(perm.status === 'granted')
    })
  }, [])

  const handleToggle = async (newValue: boolean) => {
    setBusy(true)

    const register = async () => {
      const expoPushToken = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })
      const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL
      if (!apiBaseUrl) throw new Error('API base URL not configured')
      const resp = await fetch(`${apiBaseUrl}/api/notifications/register`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: expoPushToken.data, platform: Platform.OS }),
      })
      if (!resp.ok) throw new Error('Notification registration failed')
      setPushEnabled(true)
    }

    try {
      if (!newValue) {
        await Notifications.cancelAllScheduledNotificationsAsync()
        setPushEnabled(false)
        return
      }

      const current = await Notifications.getPermissionsAsync()

      if (current.status === 'granted') {
        await register()
      } else if (current.status === 'undetermined') {
        const req = await Notifications.requestPermissionsAsync()
        if (req.status === 'granted') {
          await register()
        } else {
          setPushEnabled(false)
        }
      } else {
        Alert.alert(
          'Enable notifications in Settings',
          'To turn on daily horoscope reminders, allow notifications for OMENORA in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        )
        setPushEnabled(false)
      }
    } catch {
      setPushEnabled(false)
      Alert.alert(
        'Could not enable notifications',
        "Couldn't enable notifications. Please try again."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScreenWrapper scroll={false} padded={false} background="base">
      <Header title="Notifications" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card variant="default" style={styles.listCard}>
          <ListItem
            label="Daily horoscope"
            right={
              <Switch
                value={pushEnabled}
                onValueChange={handleToggle}
                disabled={busy}
                trackColor={{ true: tokens.accent.primary, false: tokens.border.default }}
              />
            }
          />
        </Card>
        <Text variant="caption" color="secondary" style={styles.helperText}>
          Get a personalized horoscope based on today's transits.
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
  },
  listCard: {
    paddingHorizontal: 0,
    paddingVertical:   0,
    overflow:          'hidden',
  },
  helperText: {
    marginTop: space['3'],
  },
})
