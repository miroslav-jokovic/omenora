import React, { useEffect, useState, useCallback } from 'react';
import * as Sentry from '@sentry/react-native';
import { isRunningInExpoGo } from 'expo';
import * as Linking from 'expo-linking'
import { useAuth } from './src/context/useAuth'
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context/AuthProvider'
import { PurchasesProvider } from './src/context/PurchasesProvider';
import { RootNavigator, navigationRef } from './src/navigation/RootNavigator';
import { useProfileStore } from './src/stores/profileStore';
import {
  useFonts,
  Onest_300Light,
  Onest_400Regular,
  Onest_500Medium,
  Onest_600SemiBold,
} from '@expo-google-fonts/onest';
import {
  GeistMono_400Regular,
  GeistMono_500Medium,
} from '@expo-google-fonts/geist-mono';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: 0,
  sendDefaultPii: false,
  enableNativeFramesTracking: !isRunningInExpoGo(),
  beforeSend(event) {
    if (event.user) {
      delete event.user.ip_address;
      delete event.user.email;
    }
    if (event.request?.headers) {
      const headers = event.request.headers as Record<string, unknown>;
      delete headers['user-agent'];
      delete headers['User-Agent'];
    }
    const scrubObject = (obj: Record<string, unknown>) => {
      const PII_FIELDS = ['email', 'firstName', 'dateOfBirth', 'city', 'ip_address'];
      const SECRET_PATTERN = /token|secret|key|password/i;
      for (const field of PII_FIELDS) {
        if (field in obj) obj[field] = '[Filtered]';
      }
      for (const field of Object.keys(obj)) {
        if (SECRET_PATTERN.test(field)) obj[field] = '[Filtered]';
      }
    };
    if (event.request?.data && typeof event.request.data === 'object') {
      scrubObject(event.request.data as Record<string, unknown>);
    }
    if (event.extra && typeof event.extra === 'object') {
      scrubObject(event.extra as Record<string, unknown>);
    }
    return event;
  },
});

function DeepLinkHandler() {
  const { handleMagicLinkUrl } = useAuth()

  useEffect(() => {
    // Handle URL when app is already open
    const subscription = Linking.addEventListener('url', ({ url }) => {
      console.log('[DeepLink] Received URL:', url)
      if (url.includes('token_hash=')) {
        handleMagicLinkUrl(url)
      }
    })

    // Handle URL when app is opened cold from a link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[DeepLink] Initial URL:', url)
        if (url.includes('token_hash=')) {
          handleMagicLinkUrl(url)
        }
      }
    })

    return () => {
      subscription.remove()
    }
  }, [handleMagicLinkUrl])

  return null
}

function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const initializeStore = useProfileStore((state) => state.initialize);

  const [fontsLoaded] = useFonts({
    Onest_300Light,
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    GeistMono_400Regular,
    GeistMono_500Medium,
  });

  useEffect(() => {
    async function prepare() {
      try {
        await initializeStore();
      } catch (e) {
        console.warn('Error loading app:', e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, [initializeStore]);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady && fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady, fontsLoaded]);

  if (!appIsReady || !fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <DeepLinkHandler />
          <PurchasesProvider>
            <NavigationContainer ref={navigationRef}>
              <RootNavigator />
              <StatusBar style="light" />
            </NavigationContainer>
          </PurchasesProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(App);
