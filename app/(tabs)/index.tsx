import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { CaptureFab } from '@/components/ui/fab';
import { CountPill } from '@/components/ui/count-pill';
import { ItemRow } from '@/components/ui/item-row';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Theme } from '@/constants/theme';
import { useCategories } from '@/hooks/use-categories';
import { formatTodaySubtitle } from '@/lib/format';
import { categoryLabelForItem } from '@/lib/categories';
import { useTodayItems } from '@/hooks/use-items';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

export default function TodayScreen() {
  const router = useRouter();
  const { items, loading, refreshing, error, reload, markDone } = useTodayItems();
  const { categories, reload: reloadCategories } = useCategories();
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
          extraData={categories}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
              void reload(true);
              void reloadCategories();
            }}
              tintColor={Theme.color.accent}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar"
              title="Nothing needs you right now."
              description="Capture it when something comes up."
              actionLabel="Capture"
              onAction={() => router.navigate('/(tabs)/capture')}
            />
          }
          renderItem={({ item }) => (
            <ItemRow
              item={item}
              categoryLabel={categoryLabelForItem(item, categories)}
              onDone={(next) => void markDone(next.id)}
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
