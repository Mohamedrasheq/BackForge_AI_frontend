import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { CaptureFab } from '@/components/ui/fab';
import { CountPill } from '@/components/ui/count-pill';
import { ItemRow } from '@/components/ui/item-row';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Theme } from '@/constants/theme';
import { formatTodaySubtitle } from '@/lib/format';
import { useTodayItems } from '@/hooks/use-items';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

export default function TodayScreen() {
  const router = useRouter();
  const { items, loading, refreshing, error, reload, markDone, reschedule, movingId } =
    useTodayItems();
  const [datePickerId, setDatePickerId] = useState<string | null>(null);
  const openCount = items.length;

  return (
    <Screen>
      <ScreenHeader
        large
        title="Today"
        subtitle={formatTodaySubtitle()}
        right={openCount > 0 ? <CountPill label={`${openCount} open`} /> : null}
      />

      {error ? <ErrorBanner message={error} onRetry={() => void reload()} /> : null}

      {loading && items.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Theme.color.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          extraData={`${datePickerId ?? ''}:${movingId ?? ''}`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void reload(true)}
              tintColor={Theme.color.accent}
            />
          }
          ListEmptyComponent={
            <EmptyState
              description="Nothing needs you right now."
              actionLabel="Capture"
              onAction={() => router.navigate('/(tabs)/capture')}
            />
          }
          renderItem={({ item }) => (
            <ItemRow
              item={item}
              onDone={(next) => void markDone(next.id)}
              onReschedule={(next, dueAt) => {
                setDatePickerId(null);
                void reschedule(next.id, dueAt);
              }}
              rescheduling={movingId === item.id}
              datePickerOpen={datePickerId === item.id}
              onOpenDatePicker={() => setDatePickerId(item.id)}
              onCloseDatePicker={() =>
                setDatePickerId((current) => (current === item.id ? null : current))
              }
            />
          )}
        />
      )}

      <CaptureFab />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Theme.space.screenX,
    paddingBottom: Theme.space.listBottomFab,
    flexGrow: 1,
  },
  sep: {
    height: Theme.space.listGap,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
