import { useAuth, useUser } from '@clerk/clerk-expo';
import { Redirect, Tabs } from 'expo-router';
import React, { useEffect } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { syncUserToBackend } from '@/lib/auth';

export default function TabLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  useEffect(() => {
    if (isSignedIn && user) {
      syncUserToBackend({
        id: user.id,
        emailAddresses: user.emailAddresses.map(e => ({ emailAddress: e.emailAddress })),
        firstName: user.firstName,
        imageUrl: user.imageUrl,
      });
    }
  }, [isSignedIn, user]);

  if (!isLoaded) {
    return null; // Or a loading spinner
  }

  if (isSignedIn === false) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="bubble.left.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="brief"
        options={{
          title: 'Brief',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="list.bullet.rectangle" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'alert',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="bell.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="memory"
        options={{
          title: 'Memory',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="tray.full.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="integrations"
        options={{
          title: 'Links',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="link" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
