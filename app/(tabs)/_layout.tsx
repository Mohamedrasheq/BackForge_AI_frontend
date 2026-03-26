import { useAuth, useUser } from '@clerk/clerk-expo';
import { Redirect, Tabs } from 'expo-router';
import React, { useEffect } from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { syncUserToBackend } from '@/lib/auth';
import { TabBarProvider, useAnimatedTabBarStyle, useTabBar } from '@/lib/tab-bar-context';
import { BottomTabBar, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Animated wrapper around the DEFAULT tab bar ────────────────────────────────
function AnimatedTabBar(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const animatedStyle = useAnimatedTabBarStyle();
  const { tabBarTranslateY } = useTabBar();
  const currentRoute = props.state.routes[props.state.index].name;
  const isChat = currentRoute === 'chat';

  // On chat screen, always show the tab bar (reset position & skip animation)
  React.useEffect(() => {
    if (isChat) {
      tabBarTranslateY.value = 0;
    }
  }, [isChat]);

  if (isChat) {
    return <BottomTabBar {...props} />;
  }

  return (
    <Animated.View style={[{ 
      position: 'absolute', 
      bottom: 0, 
      left: 0, 
      right: 0,
      height: 64 + insets.bottom,
    }, animatedStyle]}>
      <BottomTabBar {...props} />
    </Animated.View>
  );
}

// ─── Tab Layout (inner, uses context) ───────────────────────────────────────────
function TabsContent() {
  const insets = useSafeAreaInsets();
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
    return null;
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
        tabBarStyle: {
          height: 64 + insets.bottom,
          paddingTop: 12,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginBottom: 4,
        },
      }}
      tabBar={(props) => <AnimatedTabBar {...props} />}
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

// ─── Root Export (wraps with provider) ───────────────────────────────────────────
export default function TabLayout() {
  return (
    <TabBarProvider>
      <TabsContent />
    </TabBarProvider>
  );
}
