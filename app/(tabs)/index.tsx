import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { CaptureFab } from '@/components/ui/fab';
import { ItemRow } from '@/components/ui/item-row';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Theme } from '@/constants/theme';
import { formatTodaySubtitle } from '@/lib/format';
import { useTodayItems } from '@/hooks/use-items';
import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';

export default function TodayScreen() {
  const { items, loading, refreshing, error, reload, markDone } = useTodayItems();

  return (
    <Screen>
      <ScreenHeader
        large
        title="Today"
        subtitle={formatTodaySubtitle()}
        right={
          items.length > 0 ? (
            <View style={styles.countPill}>
              <Text style={styles.countText}>{items.length}</Text>
            </View>
          ) : null
        }
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void reload(true)}
              tintColor={Theme.color.accent}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="checkmark.circle.fill"
              title="You're clear"
              description="Nothing needs you right now. Capture something when it comes up."
            />
          }
          renderItem={({ item }) => (
            <ItemRow item={item} onDone={(next) => void markDone(next.id)} />
          )}
        />
      )}

      <CaptureFab />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Theme.space.lg,
    paddingBottom: 96,
    flexGrow: 1,
  },
  sep: {
    height: 12,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countPill: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: Theme.color.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  countText: {
    color: Theme.color.accent,
    fontWeight: '700',
    fontSize: 15,
  },
});
