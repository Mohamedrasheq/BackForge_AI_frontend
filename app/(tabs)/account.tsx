import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { TextButton } from '@/components/ui/text-button';
import { Theme } from '@/constants/theme';
import { useAccountCounts } from '@/hooks/use-account-counts';
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
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

function spokenCount(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function StatChip({
  label,
  value,
  loading,
  singular,
  plural,
}: {
  label: string;
  value: number | null;
  loading: boolean;
  singular: string;
  plural: string;
}) {
  const ready = value !== null;
  return (
    <View
      accessible
      accessibilityLabel={
        ready ? spokenCount(value, singular, plural) : loading ? `Loading ${label}` : `${label} unavailable`
      }
      style={styles.statSlot}
    >
      <Card style={styles.stat}>
        <Text style={[styles.statValue, !ready && styles.statValuePending]}>
          {ready ? String(value) : '—'}
        </Text>
        <Text style={styles.statLabel}>{label}</Text>
      </Card>
    </View>
  );
}

export default function AccountScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const { resetSeen } = useOnboarding();
  const { permission, registering, message, refreshPermission, enableAlerts } =
    useNotificationEnable();
  const { categoryCount, openCount, doneCount, itemCount, loading: countsLoading } =
    useAccountCounts();
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

      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
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

        <View style={styles.stats}>
          <View style={styles.statsRow}>
            <StatChip
              label="Categories"
              value={categoryCount}
              loading={countsLoading}
              singular="category"
              plural="categories"
            />
            <StatChip
              label="Items"
              value={itemCount}
              loading={countsLoading}
              singular="item"
              plural="items"
            />
          </View>
          <View style={styles.statsRow}>
            <StatChip
              label="Open"
              value={openCount}
              loading={countsLoading}
              singular="open item"
              plural="open items"
            />
            <StatChip
              label="Done"
              value={doneCount}
              loading={countsLoading}
              singular="done item"
              plural="done items"
            />
          </View>
        </View>

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
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  body: {
    paddingHorizontal: Theme.space.screenX,
    paddingBottom: Theme.space.listBottom,
  },
  stats: {
    marginTop: Theme.space.lg,
    gap: Theme.space.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Theme.space.sm,
  },
  statSlot: {
    flex: 1,
  },
  stat: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  statValue: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: Theme.color.accent,
  },
  statValuePending: {
    color: Theme.color.textTertiary,
  },
  statLabel: {
    marginTop: 2,
    fontSize: Theme.type.caption,
    lineHeight: 18,
    fontWeight: '600',
    color: Theme.color.textSecondary,
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
