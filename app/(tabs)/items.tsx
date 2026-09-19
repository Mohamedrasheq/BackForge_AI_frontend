import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { ItemRow } from '@/components/ui/item-row';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Theme } from '@/constants/theme';
import { useAllItems } from '@/hooks/use-items';
import { IconSymbol } from '@/components/ui/icon-symbol';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

export default function AllItemsScreen() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const { items, loading, refreshing, error, reload, markDone } = useAllItems(query);

  useEffect(() => {
    const handle = setTimeout(() => setQuery(input.trim()), 300);
    return () => clearTimeout(handle);
  }, [input]);

  return (
    <Screen>
      <ScreenHeader title="All items" subtitle="Everything you've captured." />

      <View style={styles.searchWrap}>
        <IconSymbol name="magnifyingglass" size={20} color={Theme.color.textTertiary} />
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Search"
          placeholderTextColor={Theme.color.textTertiary}
          selectionColor={Theme.color.accent}
          cursorColor={Theme.color.accent}
          style={styles.search}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

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
          keyboardShouldPersistTaps="handled"
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
              icon="tray"
              title={query ? 'No matches' : 'No items yet'}
              description={
                query
                  ? 'Try a different search.'
                  : 'Capture a thought, reminder, or to-do and it will land here.'
              }
            />
          }
          renderItem={({ item }) => (
            <ItemRow
              item={item}
              onDone={item.status === 'open' ? (next) => void markDone(next.id) : undefined}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    marginHorizontal: Theme.space.lg,
    marginBottom: Theme.space.md,
    height: 48,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.color.border,
    backgroundColor: Theme.color.card,
    paddingHorizontal: Theme.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  search: {
    flex: 1,
    fontSize: 16,
    color: Theme.color.text,
  },
  list: {
    paddingHorizontal: Theme.space.lg,
    paddingBottom: Theme.space.xxl,
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
});
