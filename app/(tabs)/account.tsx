import { EditNameSheet } from '@/components/account/edit-name-sheet';
import { Card } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/error-banner';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextButton } from '@/components/ui/text-button';
import { Theme } from '@/constants/theme';
import { useAccountCounts } from '@/hooks/use-account-counts';
import { useNotificationEnable } from '@/hooks/use-notification-enable';
import {
  DELETE_ACCOUNT_FAILED,
  DELETE_ACCOUNT_LABEL,
  DELETE_ACCOUNT_NOTE,
  DELETE_ACCOUNT_TITLE,
} from '@/lib/account-delete';
import {
  clearLocalAccountData,
  RESET_ONBOARDING_LABEL,
  RESET_ONBOARDING_TITLE,
} from '@/lib/account-reset';
import { haptics } from '@/lib/haptics';
import { LEGAL_LINKS } from '@/lib/links';
import { remindersRowModel } from '@/lib/reminder-nudge';
import { useOnboarding } from '@/lib/onboarding';
import { displayProfileName, profileNameA11yLabel } from '@/lib/profile-name';
import { deleteAccount } from '@/services/api';
import { useAuth, useUser } from '@clerk/clerk-expo';
import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useState } from 'react';
import { Alert, Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useAuth();
  const { resetSeen } = useOnboarding();
  const { permission, registering, refreshPermission, enableAlerts } =
    useNotificationEnable();
  const { categoryCount, openCount, doneCount, itemCount, loading: countsLoading } =
    useAccountCounts(user?.id);
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editNameOpen, setEditNameOpen] = useState(false);

  const name = displayProfileName(user?.firstName, user?.lastName);
  const email = user?.primaryEmailAddress?.emailAddress ?? '';
  const version = Constants.expoConfig?.version ?? '1.0.0';

  useFocusEffect(
    useCallback(() => {
      void refreshPermission().catch(() => undefined);
    }, [refreshPermission])
  );

  const onSignOut = async () => {
    if (signingOut) return;
    haptics.medium();
    setSigningOut(true);
    try {
      await clearLocalAccountData();
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const onDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
    } catch {
      haptics.error();
      setDeleting(false);
      setDeleteError(DELETE_ACCOUNT_FAILED);
      return;
    }
    await clearLocalAccountData();
    try {
      await signOut();
    } catch {
      // The server already removed the account, so its session is gone either way.
    }
    setDeleting(false);
    router.replace('/sign-in');
  };

  const onPressResetOnboarding = () => {
    haptics.warning();
    Alert.alert(RESET_ONBOARDING_TITLE, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', onPress: () => resetSeen() },
    ]);
  };

  const onPressDeleteAccount = () => {
    if (deleting) return;
    haptics.warning();
    setDeleteError(null);
    Alert.alert(DELETE_ACCOUNT_TITLE, DELETE_ACCOUNT_NOTE, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void onDeleteAccount() },
    ]);
  };

  const reminders = remindersRowModel(permission);

  return (
    <Screen>
      <ScreenHeader title="Account" />
      {deleteError ? <ErrorBanner message={deleteError} /> : null}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
        <Card style={styles.profile}>
          {user?.imageUrl ? (
            <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.initial}>{name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={profileNameA11yLabel(name)}
            onPress={() => {
              haptics.light();
              setEditNameOpen(true);
            }}
            style={({ pressed }) => [styles.nameRow, pressed && styles.namePressed]}
          >
            <View style={styles.profileText}>
              <Text style={styles.name}>{name}</Text>
              {email ? <Text style={styles.email}>{email}</Text> : null}
            </View>
            <IconSymbol name="pencil" size={16} color={Theme.color.textTertiary} />
          </Pressable>
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

        <Card style={styles.links}>
          <View style={styles.linkRow}>
            <Text style={styles.linkLabel}>Reminders</Text>
            {reminders.kind === 'on' ? (
              <Text
                style={styles.statusMuted}
                accessibilityLabel="Reminders On"
              >
                {reminders.statusLabel}
              </Text>
            ) : null}
            {reminders.kind === 'turn_on' ? (
              <TextButton
                label={registering ? 'Turning on…' : reminders.actionLabel}
                onPress={() => void enableAlerts()}
                disabled={registering}
                style={styles.rowAction}
              />
            ) : null}
            {reminders.kind === 'off' ? (
              <Text
                style={styles.statusMuted}
                accessibilityLabel="Reminders Off"
              >
                {reminders.statusLabel}
              </Text>
            ) : null}
          </View>
          {reminders.kind === 'off' || reminders.kind === 'on' ? (
            <View style={[styles.linkRow, styles.linkDivider]}>
              <Text style={styles.settingsHint}>{reminders.hint}</Text>
              <TextButton
                label={reminders.actionLabel}
                onPress={() => {
                  void Linking.openSettings();
                }}
                style={styles.rowAction}
              />
            </View>
          ) : null}
        </Card>

        <Card style={styles.links}>
          {LEGAL_LINKS.map((link, index) => (
            <Pressable
              key={link.url}
              accessibilityRole="link"
              accessibilityLabel={link.label}
              onPress={() => {
                haptics.light();
                void WebBrowser.openBrowserAsync(link.url);
              }}
              style={({ pressed }) => [
                styles.linkRow,
                index > 0 && styles.linkDivider,
                pressed && styles.linkPressed,
              ]}
            >
              <Text style={styles.linkLabel}>{link.label}</Text>
              <IconSymbol name="chevron.right" size={18} color={Theme.color.textTertiary} />
            </Pressable>
          ))}
        </Card>

        <Card style={styles.links}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={signingOut ? 'Signing out' : 'Sign out'}
            disabled={signingOut}
            onPress={() => void onSignOut()}
            style={({ pressed }) => [styles.linkRow, pressed && !signingOut && styles.linkPressed]}
          >
            <Text style={styles.linkLabel}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
          </Pressable>
        </Card>

        <Card style={styles.dangerCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={RESET_ONBOARDING_LABEL}
            onPress={onPressResetOnboarding}
            style={({ pressed }) => [styles.linkRow, pressed && styles.linkPressed]}
          >
            <Text style={[styles.linkLabel, styles.resetLabel]}>{RESET_ONBOARDING_LABEL}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={DELETE_ACCOUNT_LABEL}
            disabled={deleting}
            onPress={onPressDeleteAccount}
            style={({ pressed }) => [
              styles.linkRow,
              styles.linkDivider,
              pressed && !deleting && styles.linkPressed,
            ]}
          >
            <Text style={[styles.linkLabel, styles.deleteLabel]}>{DELETE_ACCOUNT_LABEL}</Text>
          </Pressable>
        </Card>

        <Text style={styles.version}>{version}</Text>
      </ScrollView>
      {editNameOpen ? <EditNameSheet onClose={() => setEditNameOpen(false)} /> : null}
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
  nameRow: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.space.sm,
  },
  namePressed: {
    opacity: 0.7,
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
  statusMuted: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: Theme.type.label,
    fontWeight: '600',
    color: Theme.color.textTertiary,
  },
  settingsHint: {
    flex: 1,
    fontSize: Theme.type.caption,
    lineHeight: 18,
    color: Theme.color.textSecondary,
  },
  rowAction: {
    alignSelf: 'center',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  links: {
    marginTop: Theme.space.lg,
    padding: 0,
    overflow: 'hidden',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Theme.space.md,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  linkDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.color.border,
  },
  linkPressed: {
    backgroundColor: Theme.color.background,
  },
  linkLabel: {
    fontSize: Theme.type.label,
    fontWeight: '600',
    color: Theme.color.text,
  },
  deleteLabel: {
    color: Theme.color.danger,
  },
  resetLabel: {
    color: Theme.color.textSecondary,
  },
  dangerCard: {
    marginTop: Theme.space.xl,
    padding: 0,
    overflow: 'hidden',
  },
  version: {
    marginTop: Theme.space.xxl,
    textAlign: 'center',
    color: Theme.color.textTertiary,
    fontSize: Theme.type.caption,
    lineHeight: 18,
  },
});
