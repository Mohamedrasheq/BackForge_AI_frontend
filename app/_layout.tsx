import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { registerPushToken } from '@/services/api';
import {
  getDevicePushToken,
  onNotificationReceived,
  onNotificationResponse,
  registerForPushNotifications,
  setupNotificationChannel,
} from '@/services/notifications';
import { ClerkLoaded, ClerkProvider, useAuth, useUser } from '@clerk/clerk-expo';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { configureRevenueCat, identifyUser } from '../services/revenuecat';

const tokenCache = {
  async getToken(key: string) {
    try {
      const item = await SecureStore.getItemAsync(key);
      if (item) {
        console.log(`${key} was used 🔐 \n`);
      } else {
        console.log('No values stored under key: ' + key);
      }
      return item;
    } catch (error) {
      console.error('SecureStore get item error: ', error);
      await SecureStore.deleteItemAsync(key);
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

function InitialLayout() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [isNavigationReady, setIsNavigationReady] = React.useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = React.useState<boolean | null>(null);
  const hasRegisteredPush = useRef(false);

  useEffect(() => {
    const checkFirstLaunch = async () => {
      try {
        // Initialize RevenueCat
        await configureRevenueCat();

        const hasLaunched = await SecureStore.getItemAsync('has_launched_app');
        setIsFirstLaunch(hasLaunched === null);
      } catch (error) {
        setIsFirstLaunch(true); // Default to showing onboarding on error
      }
    };
    checkFirstLaunch();
  }, []);

  // ── Push notification registration ──
  useEffect(() => {
    if (!isSignedIn || !user?.id || hasRegisteredPush.current) return;

    const setupPush = async () => {
      try {
        // Identify user in RevenueCat
        await identifyUser(user.id);

        // Set up Android notification channel
        await setupNotificationChannel();

        // Get Expo push token
        const pushToken = await registerForPushNotifications();
        if (pushToken) {
          // Also get native device token (FCM/APNS)
          const deviceToken = await getDevicePushToken();

          // Get Clerk session token for authentication
          const token = await getToken();

          // Send tokens to backend
          await registerPushToken(user.id, pushToken, Platform.OS, deviceToken || undefined, token || undefined).catch((err) =>
            console.warn('[Notifications] Failed to register token with backend:', err)
          );
          hasRegisteredPush.current = true;
        }
      } catch (error) {
        console.error('[Notifications] Setup failed:', error);
      }
    };

    setupPush();
  }, [isSignedIn, user?.id]);

  // ── Notification listeners ──
  useEffect(() => {
    const receivedSub = onNotificationReceived((notification) => {
      console.log('[Notifications] Received in foreground:', notification.request.content.title);
    });

    const responseSub = onNotificationResponse((response) => {
      console.log('[Notifications] User tapped notification');
      const data = response.notification.request.content.data;

      // Navigate based on notification payload
      if (data?.screen === 'chat') {
        router.push('/(tabs)/chat');
      } else if (data?.screen === 'brief') {
        router.push('/(tabs)/brief');
      } else if (data?.screen === 'memory') {
        router.push('/(tabs)/memory');
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [router]);

  useEffect(() => {
    if (!isLoaded || isFirstLaunch === null) return;

    console.log('[Auth] useEffect triggered:', {
      isLoaded,
      isSignedIn,
      isFirstLaunch,
      segments: segments.join('/') || '(root)',
      isNavigationReady,
    });

    const inTabsGroup = segments[0] === '(tabs)';
    const inModal = segments[0] === 'modal';
    const inSettings = segments[0] === 'settings';
    const inProfile = segments[0] === 'profile';
    const inPaywall = segments[0] === 'paywall';

    const inAuthGroup = segments[0] === 'onboarding' || segments[0] === 'sign-in';
    const isRootRoute = !segments[0];

    // If user is not signed in
    if (!isSignedIn) {
      if (inAuthGroup) {
        console.log('[Auth] ✅ Not signed in, already on auth screen - ready!');
        setIsNavigationReady(true);
      } else {
        const targetRoute = '/onboarding';

        console.log(`[Auth] 🔄 Not signed in, redirecting to ${targetRoute}...`);
        setIsNavigationReady(false);
        router.replace(targetRoute);
      }
    } else {
      // User IS signed in
      if (inTabsGroup || inModal || inSettings || inProfile || inPaywall) {
        console.log('[Auth] ✅ Signed in, already on protected screen - ready!');
        setIsNavigationReady(true);
      } else {
        console.log('[Auth] 🔄 Signed in, redirecting to /(tabs)/home...');
        setIsNavigationReady(false);
        router.replace('/(tabs)/home');
      }
    }
  }, [isSignedIn, segments, isLoaded, isFirstLaunch]);

  // Show loading while Clerk is loading OR while checking launch state
  if (!isLoaded || isFirstLaunch === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="small" color={colors.tint} />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="profile" />

        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>

      {!isNavigationReady && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, zIndex: 999 }]}>
          <ActivityIndicator size="small" color={colors.tint} />
        </View>
      )}

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

  if (!publishableKey) {
    throw new Error(
      'Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env'
    );
  }

  return (
    <ClerkProvider tokenCache={tokenCache} publishableKey={publishableKey}>
      <ClerkLoaded>
        <InitialLayout />
      </ClerkLoaded>
    </ClerkProvider>
  );
}
