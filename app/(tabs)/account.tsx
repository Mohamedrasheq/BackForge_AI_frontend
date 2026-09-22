import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextButton } from '@/components/ui/text-button';
import { Theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useAuth, useUser } from '@clerk/clerk-expo';
import Constants from 'expo-constants';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

export default function AccountScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
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
      <ScreenHeader title="Account" />

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

        <TextButton
          label={signingOut ? 'Signing out…' : 'Sign out'}
          onPress={() => void onSignOut()}
          tone="danger"
          style={styles.signOut}
        />

        <Text style={styles.version}>{version}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: Theme.space.screenX,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.space.md,
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.color.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: Theme.color.accent,
    fontSize: 24,
    fontWeight: '700',
  },
  profileText: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: Theme.color.text,
  },
  email: {
    marginTop: 4,
    fontSize: Theme.type.label,
    lineHeight: 20,
    color: Theme.color.textSecondary,
  },
  signOut: {
    alignSelf: 'flex-start',
    marginTop: Theme.space.xl,
    paddingHorizontal: 0,
  },
  version: {
    marginTop: Theme.space.xxl,
    textAlign: 'center',
    color: Theme.color.textTertiary,
    fontSize: Theme.type.caption,
    lineHeight: 18,
  },
});
