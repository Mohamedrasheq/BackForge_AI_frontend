import { Card } from '@/components/ui/card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useAuth, useUser } from '@clerk/clerk-expo';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

export default function AccountScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const name =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    'Signed in';
  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const onSignOut = async () => {
    if (signingOut) return;
    haptics.medium();
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader title="Account" subtitle="Just the essentials." />

      <View style={styles.body}>
        <Card style={styles.profile}>
          {user?.imageUrl ? (
            <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.profileText}>
            <Text style={styles.name}>{name}</Text>
            {email ? <Text style={styles.email}>{email}</Text> : null}
          </View>
        </Card>

        <Card style={styles.group}>
          <Pressable
            onPress={() => {
              haptics.light();
              router.push('/(tabs)/alerts');
            }}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <View style={styles.rowLeft}>
              <View style={styles.icon}>
                <IconSymbol name="bell.fill" size={18} color={Theme.color.accent} />
              </View>
              <Text style={styles.rowLabel}>Alerts</Text>
            </View>
            <IconSymbol name="chevron.right" size={18} color={Theme.color.textTertiary} />
          </Pressable>
        </Card>

        <Pressable
          onPress={() => void onSignOut()}
          style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}
        >
          <IconSymbol name="rectangle.portrait.and.arrow.right" size={18} color={Theme.color.danger} />
          <Text style={styles.signOutText}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
        </Pressable>

        <Text style={styles.version}>{version}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: Theme.space.lg,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.space.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: Theme.color.white,
    fontSize: 22,
    fontWeight: '700',
  },
  profileText: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.color.text,
  },
  email: {
    marginTop: 4,
    fontSize: 15,
    color: Theme.color.textSecondary,
  },
  group: {
    marginTop: Theme.space.md,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.color.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.color.text,
  },
  signOut: {
    marginTop: Theme.space.lg,
    height: 52,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.color.card,
    borderWidth: 1,
    borderColor: Theme.color.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  signOutPressed: {
    backgroundColor: Theme.color.dangerSoft,
  },
  signOutText: {
    color: Theme.color.danger,
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    marginTop: Theme.space.lg,
    textAlign: 'center',
    color: Theme.color.textTertiary,
    fontSize: 13,
  },
});
