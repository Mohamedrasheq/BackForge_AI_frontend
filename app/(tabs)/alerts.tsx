import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { ItemRow } from '@/components/ui/item-row';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Theme } from '@/constants/theme';
import { useNotificationEnable } from '@/hooks/use-notification-enable';
import { isUpcoming } from '@/lib/format';
import { getItems, markItemDone } from '@/services/api';
import type { Item } from '@/types/api';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function AlertsScreen() {
  const router = useRouter();
  const { permission, refreshPermission } = useNotificationEnable();
  const [upcoming, setUpcoming] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        await refreshPermission();
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
    },
    [refreshPermission]
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const showPermissionTip = permission !== null && permission !== 'granted';

  return (
    <Screen>
      <ScreenHeader title="Alerts" subtitle="What's coming up. Push delivery is not live yet." />

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
        {showPermissionTip ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Turn on notifications in Account"
            onPress={() => router.navigate('/(tabs)/account')}
            hitSlop={8}
            style={({ pressed }) => [styles.tip, pressed && styles.tipPressed]}
          >
            <Text style={styles.tipText}>Turn on notifications in Account</Text>
          </Pressable>
        ) : null}

        <Text style={styles.section}>Upcoming</Text>
        {loading && upcoming.length === 0 ? (
          <ActivityIndicator color={Theme.color.accent} style={styles.spinner} />
        ) : upcoming.length === 0 ? (
          <EmptyState
            icon="bell.fill"
            title="Nothing upcoming"
            description="Nothing upcoming right now."
          />
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
  tip: {
    alignSelf: 'flex-start',
    marginBottom: Theme.space.md,
  },
  tipPressed: {
    opacity: 0.7,
  },
  tipText: {
    fontSize: Theme.type.label,
    lineHeight: 20,
    fontWeight: '600',
    color: Theme.color.accent,
  },
  section: {
    marginBottom: Theme.space.md,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: Theme.color.text,
  },
  list: {
    gap: Theme.space.listGap,
  },
  spinner: {
    marginTop: Theme.space.lg,
  },
});
