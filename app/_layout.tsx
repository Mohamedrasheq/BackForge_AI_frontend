import { Theme } from '@/constants/theme';
import { setApiTokenGetter } from '@/lib/api-auth';
import { OnboardingProvider, useOnboarding } from '@/lib/onboarding';
import { registerDevice } from '@/services/api';
import {
  getExpoPushToken,
  getNotificationPermissionStatus,
  onNotificationReceived,
  onNotificationResponse,
  setupNotificationChannel,
} from '@/services/notifications';
import { ClerkLoaded, ClerkProvider, useAuth } from '@clerk/clerk-expo';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // SecureStore unavailable (web/dev)
    }
  },
};

function InitialLayout() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { seen: hasSeenOnboarding } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const hasRegisteredPush = useRef(false);

  useEffect(() => {
    setApiTokenGetter(() => getToken());
  }, [getToken]);

  useEffect(() => {
    if (Platform.OS === 'web' || !isSignedIn || hasRegisteredPush.current) return;

    const setupPush = async () => {
      try {
        await setupNotificationChannel();
        const status = await getNotificationPermissionStatus();
        if (status !== 'granted') return;
        const pushToken = await getExpoPushToken();
        if (pushToken) {
          await registerDevice(pushToken);
          hasRegisteredPush.current = true;
        }
      } catch (error) {
        console.warn('[Notifications] Silent register failed:', error);
      }
    };

    void setupPush();
  }, [isSignedIn]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const received = onNotificationReceived(() => undefined);
    const response = onNotificationResponse(() => {
      router.push('/(tabs)');
    });
    return () => {
      received.remove();
      response.remove();
    };
  }, [router]);

  useEffect(() => {
    if (!isLoaded || hasSeenOnboarding === null) return;

    const route = segments[0];
    const onSignIn = route === 'sign-in';
    const onOnboarding = route === 'onboarding';
    const inTabs = route === '(tabs)';

    if (isSignedIn) {
      if (!inTabs) {
        setReady(false);
        router.replace('/(tabs)');
        return;
      }
      setReady(true);
      return;
    }

    if (!hasSeenOnboarding) {
      if (!onOnboarding) {
        setReady(false);
        router.replace('/onboarding');
        return;
      }
      setReady(true);
      return;
    }

    if (!onSignIn) {
      setReady(false);
      router.replace('/sign-in');
      return;
    }

    setReady(true);
  }, [isLoaded, isSignedIn, hasSeenOnboarding, segments, router]);

  if (!isLoaded || hasSeenOnboarding === null) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="small" color={Theme.color.accent} />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={[styles.flex, Platform.OS === 'web' && styles.webShell]}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Theme.color.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      {!ready && (
        <View style={[StyleSheet.absoluteFill, styles.boot, styles.overlay]}>
          <ActivityIndicator size="small" color={Theme.color.accent} />
        </View>
      )}
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    throw new Error(
      'Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env'
    );
  }

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <OnboardingProvider>
        <ClerkLoaded>
          <InitialLayout />
        </ClerkLoaded>
      </OnboardingProvider>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  boot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.color.background,
  },
  overlay: {
    zIndex: 999,
  },
  webShell: {
    maxWidth: 430,
    width: '100%',
    alignSelf: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: Theme.color.border,
  },
});
