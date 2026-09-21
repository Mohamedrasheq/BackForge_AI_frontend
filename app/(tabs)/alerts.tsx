import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { ItemRow } from '@/components/ui/item-row';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { TextButton } from '@/components/ui/text-button';
import { Theme } from '@/constants/theme';
import { isUpcoming } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import { getItems, markItemDone, registerDevice } from '@/services/api';
import {
  getExpoPushToken,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  setupNotificationChannel,
} from '@/services/notifications';
import type { Item } from '@/types/api';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function AlertsScreen() {
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>(
    'undetermined'
  );
  const [registering, setRegistering] = useState(false);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [upcoming, setUpcoming] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const status = await getNotificationPermissionStatus();
      setPermission(status);
      const items = await getItems();
      setUpcoming(
        items
          .filter((item) => item.status === 'open' && isUpcoming(item.dueAt))
          .sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)))
      );
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load alerts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const enableAlerts = async () => {
    setRegistering(true);
    setRegisterMessage(null);
    try {
      await setupNotificationChannel();
      const granted = await requestNotificationPermission();
      setPermission(granted ? 'granted' : 'denied');
      if (!granted) {
        setRegisterMessage('Notifications are off. You can enable them in system settings.');
        return;
      }

      if (Platform.OS === 'web') {
        setRegisterMessage('Alerts are ready in this browser. Push registration is for the mobile app.');
        return;
      }

      const token = await getExpoPushToken();
      if (!token) {
        setRegisterMessage('Use a physical device to receive push alerts.');
        return;
      }

      await registerDevice(token);
      haptics.success();
      setRegisterMessage('This device will receive upcoming reminders.');
    } catch (err) {
      haptics.error();
      setRegisterMessage(err instanceof Error ? err.message : 'Could not register this device');
    } finally {
      setRegistering(false);
    }
  };

  const permissionLabel =
    permission === 'granted'
      ? 'Notifications are on'
      : permission === 'denied'
        ? 'Notifications are off'
        : 'Notifications not enabled yet';

  return (
    <Screen>
      <ScreenHeader title="Alerts" subtitle="Reminders for what's coming up." />

      {error ? <ErrorBanner message={error} onRetry={() => void load()} /> : null}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={Theme.color.accent}
          />
        }
      >
        <Card style={styles.permissionCard}>
          <Text style={styles.cardTitle}>{permissionLabel}</Text>
          <Text style={styles.cardBody}>
            {permission === 'granted'
              ? 'We’ll nudge you when something is due.'
              : 'Turn on alerts so timed items can reach you.'}
          </Text>
          {permission !== 'granted' ? (
            <SecondaryButton
              label="Enable alerts"
              onPress={() => void enableAlerts()}
              loading={registering}
              style={styles.button}
            />
          ) : (
            <TextButton
              label={registering ? 'Refreshing…' : 'Refresh this device'}
              onPress={() => void enableAlerts()}
              tone="secondary"
              style={styles.refresh}
            />
          )}
          {registerMessage ? <Text style={styles.message}>{registerMessage}</Text> : null}
        </Card>

        <Text style={styles.section}>Upcoming</Text>
        {loading && upcoming.length === 0 ? (
          <ActivityIndicator color={Theme.color.accent} style={styles.spinner} />
        ) : upcoming.length === 0 ? (
          <EmptyState description="Nothing upcoming right now." />
        ) : (
          <View style={styles.list}>
            {upcoming.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onDone={(next) => void markItemDone(next.id).then(() => load())}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Theme.space.screenX,
    paddingBottom: Theme.space.listBottom,
  },
  permissionCard: {
    paddingVertical: Theme.space.md,
  },
  cardTitle: {
    fontSize: Theme.type.itemTitle,
    fontWeight: '600',
    color: Theme.color.text,
  },
  cardBody: {
    marginTop: 6,
    fontSize: Theme.type.label,
    lineHeight: 22,
    color: Theme.color.textSecondary,
  },
  button: {
    marginTop: Theme.space.md,
  },
  refresh: {
    alignSelf: 'flex-start',
    marginTop: Theme.space.sm,
    paddingHorizontal: 0,
  },
  message: {
    marginTop: Theme.space.sm,
    color: Theme.color.textSecondary,
    fontSize: Theme.type.caption,
    lineHeight: 20,
  },
  section: {
    marginTop: Theme.space.xl,
    marginBottom: Theme.space.md,
    fontSize: Theme.type.label,
    fontWeight: '600',
    color: Theme.color.textSecondary,
  },
  list: {
    gap: Theme.space.listGap,
  },
  spinner: {
    marginTop: Theme.space.lg,
  },
});
