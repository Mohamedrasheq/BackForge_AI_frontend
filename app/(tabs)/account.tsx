import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { TextButton } from '@/components/ui/text-button';
import { Theme } from '@/constants/theme';
import { useNotificationEnable } from '@/hooks/use-notification-enable';
import { haptics } from '@/lib/haptics';
import {
  notificationStatusDetail,
  notificationStatusLabel,
} from '@/lib/notifications-enable';
import { useOnboarding } from '@/lib/onboarding';
import { useAuth, useUser } from '@clerk/clerk-expo';
import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

export default function AccountScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const { resetSeen } = useOnboarding();
  const { permission, registering, message, refreshPermission, enableAlerts } =
    useNotificationEnable();
  const [signingOut, setSigningOut] = useState(false);
  const [onboardingReset, setOnboardingReset] = useState(false);
  const [permissionCheckFailed, setPermissionCheckFailed] = useState(false);

  const name =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    'Signed in';
  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  const version = Constants.expoConfig?.version ?? '1.0.0';

  useFocusEffect(
    useCallback(() => {
      void refreshPermission()
        .then(() => setPermissionCheckFailed(false))
        .catch(() => setPermissionCheckFailed(true));
    }, [refreshPermission])
  );

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

  const statusLabel = permission ? notificationStatusLabel(permission) : null;
  const statusDetail = permission
    ? notificationStatusDetail(permission)
    : 'Push delivery is not live yet.';
  const showEnable = permission !== 'granted' && (permission !== null || permissionCheckFailed);

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

        <Card style={styles.notifications}>
          <View style={styles.statusRow}>
            <Text style={styles.cardTitle}>Notifications</Text>
            {statusLabel ? (
              <Text
                style={styles.statusValue}
                accessibilityLabel={`Notifications ${statusLabel}`}
              >
                {statusLabel}
              </Text>
            ) : null}
          </View>
          <Text style={styles.cardBody}>{statusDetail}</Text>
          {permission === 'granted' ? (
            <TextButton
              label={registering ? 'Refreshing…' : 'Refresh this device'}
              onPress={() => void enableAlerts()}
              disabled={registering}
              tone="secondary"
              style={styles.refresh}
            />
          ) : showEnable ? (
            <SecondaryButton
              label="Enable alerts"
              onPress={() => void enableAlerts()}
              loading={registering}
              style={styles.enable}
            />
          ) : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </Card>

        <View style={styles.signOutRow}>
          <TextButton
            label={signingOut ? 'Signing out…' : 'Sign out'}
            onPress={() => void onSignOut()}
            tone="danger"
            style={styles.signOut}
          />
        </View>

        {__DEV__ ? (
          <View style={styles.dev}>
            <TextButton
              label="Reset onboarding"
              tone="secondary"
              onPress={() => {
                resetSeen();
                setOnboardingReset(true);
              }}
              style={styles.reset}
            />
            {onboardingReset ? (
              <Text style={styles.devHint}>Cleared. Sign out to see onboarding again.</Text>
            ) : null}
          </View>
        ) : null}

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
  notifications: {
    marginTop: Theme.space.lg,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Theme.space.md,
  },
  cardTitle: {
    fontSize: Theme.type.label,
    fontWeight: '600',
    color: Theme.color.text,
  },
  statusValue: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: Theme.type.label,
    fontWeight: '600',
    color: Theme.color.textSecondary,
  },
  cardBody: {
    marginTop: 4,
    fontSize: Theme.type.caption,
    lineHeight: 18,
    color: Theme.color.textSecondary,
  },
  enable: {
    marginTop: Theme.space.sm,
  },
  refresh: {
    alignSelf: 'flex-start',
    marginTop: Theme.space.xs,
    paddingHorizontal: 0,
  },
  message: {
    marginTop: Theme.space.sm,
    color: Theme.color.textSecondary,
    fontSize: Theme.type.caption,
    lineHeight: 20,
  },
  signOutRow: {
    marginTop: Theme.space.xl,
    width: '100%',
    alignItems: 'center',
  },
  signOut: {
    alignSelf: 'center',
  },
  dev: {
    marginTop: Theme.space.md,
    width: '100%',
    alignItems: 'center',
  },
  reset: {
    alignSelf: 'center',
  },
  devHint: {
    marginTop: Theme.space.xs,
    textAlign: 'center',
    color: Theme.color.textTertiary,
    fontSize: Theme.type.caption,
    lineHeight: 18,
  },
  version: {
    marginTop: Theme.space.xxl,
    textAlign: 'center',
    color: Theme.color.textTertiary,
    fontSize: Theme.type.caption,
    lineHeight: 18,
  },
});
