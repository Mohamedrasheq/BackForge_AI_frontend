import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { FilterChips } from '@/components/ui/filter-chips';
import { ItemRow } from '@/components/ui/item-row';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Theme } from '@/constants/theme';
import { useAllItems } from '@/hooks/use-items';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import type { ItemStatus } from '@/types/api';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

const STATUS_OPTIONS: { value: ItemStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'done', label: 'Done' },
];

function emptyCopy(
  query: string,
  status: ItemStatus
): { icon: IconSymbolName; title: string; description: string } {
  if (query) {
    return {
      icon: 'magnifyingglass',
      title: 'No matches',
      description: status === 'done' ? 'No done items match that.' : 'No open items match that.',
    };
  }
  if (status === 'done') {
    return {
      icon: 'checkmark',
      title: 'Nothing done',
      description: 'Nothing marked done yet.',
    };
  }
  return {
    icon: 'tray',
    title: 'Nothing open',
    description: 'Nothing open right now.',
  };
}

export default function AllItemsScreen() {
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ItemStatus>('open');
  const { items, loading, refreshing, error, reload, markDone } = useAllItems(query);

  useEffect(() => {
    const handle = setTimeout(() => setQuery(input.trim()), 300);
    return () => clearTimeout(handle);
  }, [input]);

  const visible = useMemo(
    () => items.filter((item) => item.status === status),
    [items, status]
  );

  const empty = emptyCopy(query, status);

  return (
    <Screen>
      <ScreenHeader title="All items" />

      <View style={styles.searchWrap}>
        <IconSymbol name="magnifyingglass" size={18} color={Theme.color.textSecondary} />
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

      <FilterChips value={status} options={STATUS_OPTIONS} onChange={setStatus} />

      {error ? <ErrorBanner message={error} onRetry={() => void reload()} /> : null}

      {loading && items.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Theme.color.accent} />
        </View>
      ) : (
        <FlatList
          data={visible}
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
            <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />
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
    marginHorizontal: Theme.space.screenX,
    marginBottom: Theme.space.sm,
    height: 44,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.color.border,
    backgroundColor: Theme.color.card,
    paddingHorizontal: Theme.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  search: {
    flex: 1,
    fontSize: Theme.type.body,
    lineHeight: 22,
    color: Theme.color.text,
    paddingVertical: 0,
  },
  list: {
    paddingHorizontal: Theme.space.screenX,
    paddingBottom: Theme.space.listBottom,
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
