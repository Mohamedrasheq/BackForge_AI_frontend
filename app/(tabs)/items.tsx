import { EditableItemRow } from '@/components/items/editable-item-row';
import { DeleteItemDialog } from '@/components/items/delete-item-dialog';
import { ReviewEntry } from '@/components/review/review-entry';
import { type ItemDraft } from '@/components/items/item-editor';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { FilterChips } from '@/components/ui/filter-chips';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { cardSurface, Theme } from '@/constants/theme';
import { useCategories } from '@/hooks/use-categories';
import { useAllItems } from '@/hooks/use-items';
import { useReviewEntry } from '@/hooks/use-review-entry';
import { REVIEW_HREF } from '@/lib/review-push';
import {
  buildCategoryBrowseRows,
  categoryBrowseAccessibilityLabel,
  categoryCountParts,
  type CategoryBrowseRow,
} from '@/lib/category-browse';
import { groupItemsByCategory } from '@/lib/categories';
import { haptics } from '@/lib/haptics';
import type { Item, ItemStatus } from '@/types/api';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type ItemsFilter = ItemStatus | 'category';

const FILTER_OPTIONS: { value: ItemsFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'done', label: 'Done' },
  { value: 'category', label: 'Category' },
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
  return {
    icon: 'checkmark',
    title: 'Nothing done',
    description: 'Nothing marked done yet.',
  };
}

function CategoryCountText({ openCount, doneCount }: { openCount: number; doneCount: number }) {
  const parts = categoryCountParts(openCount, doneCount);
  return (
    <Text style={styles.count} numberOfLines={1}>
      {parts.map((part, index) => (
        <Text key={`${part.tone}-${index}`} style={part.tone === 'open' ? styles.countOpen : undefined}>
          {index > 0 ? ' · ' : null}
          {part.text}
        </Text>
      ))}
    </Text>
  );
}

function CategoryRow({
  row,
  onPress,
}: {
  row: CategoryBrowseRow;
  onPress: (row: CategoryBrowseRow) => void;
}) {
  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel={categoryBrowseAccessibilityLabel(row.name, row.openCount, row.doneCount)}
      onPress={() => onPress(row)}
      style={({ pressed }) => [styles.categoryRow, pressed && styles.pressed]}
    >
      <Text style={[styles.categoryName, row.unfiled && styles.categoryNameMuted]} numberOfLines={1}>
        {row.name}
      </Text>
      <View style={styles.categoryTrailing}>
        <CategoryCountText openCount={row.openCount} doneCount={row.doneCount} />
        <IconSymbol name="chevron.right" size={18} color={Theme.color.textTertiary} />
      </View>
    </Pressable>
  );
}

export default function AllItemsScreen() {
  const router = useRouter();
  const review = useReviewEntry('items');
  const [input, setInput] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ItemsFilter>('open');
  const itemsQuery = filter === 'category' ? '' : query;
  const {
    items,
    loading,
    refreshing,
    error,
    reload,
    markDone,
    saveItem,
    removeItem,
    reschedule,
    movingId,
    loadedQuery,
  } = useAllItems(itemsQuery);
  const {
    categories,
    loading: categoriesLoading,
    error: categoriesError,
    reload: reloadCategories,
  } = useCategories();
  const [datePickerId, setDatePickerId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setQuery(input.trim()), 300);
    return () => clearTimeout(handle);
  }, [input]);

  const visible = useMemo(
    () => (filter === 'category' ? [] : items.filter((item) => item.status === filter)),
    [items, filter]
  );
  const sections = useMemo(
    () => groupItemsByCategory(visible, categories),
    [visible, categories]
  );
  const categoryRows = useMemo(
    () => (filter === 'category' ? buildCategoryBrowseRows(categories, items, query) : []),
    [filter, categories, items, query]
  );
  const anyCategoryRows = useMemo(() => {
    if (filter !== 'category') return false;
    if (!query) return categoryRows.length > 0;
    return buildCategoryBrowseRows(categories, items, '').length > 0;
  }, [filter, categories, items, query, categoryRows.length]);
  const categoriesSettled = !categoriesLoading || Boolean(categoriesError);
  const categoryBlocking =
    filter === 'category' && (loadedQuery !== '' || (!categoriesSettled && !categoriesError));
  const hideCategoryRows = Boolean(error) && items.length === 0;
  const shownCategoryRows = hideCategoryRows ? [] : categoryRows;

  const empty = emptyCopy(query, filter === 'done' ? 'done' : 'open');
  const openEmpty = !query && filter === 'open';

  const pendingDelete = useMemo(
    () => items.find((item) => item.id === pendingDeleteId) ?? null,
    [items, pendingDeleteId]
  );

  const onSave = async (id: string, draft: ItemDraft) => {
    setSaving(true);
    try {
      await saveItem(id, draft);
      setEditingId(null);
      haptics.success();
      void review.reload();
    } catch {
      haptics.error();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    setDeleting(true);
    try {
      await removeItem(id);
      setPendingDeleteId(null);
      setEditingId((current) => (current === id ? null : current));
      haptics.success();
      void review.reload();
    } catch {
      haptics.error();
    } finally {
      setDeleting(false);
    }
  };

  const openCategory = (row: CategoryBrowseRow) => {
    haptics.light();
    router.push({
      pathname: '/category/[id]',
      params: { id: row.id, name: row.name },
    });
  };

  const renderItem = ({ item }: { item: Item }) => (
    <EditableItemRow
      item={item}
      categories={categories}
      editing={editingId === item.id}
      saving={saving}
      movingId={movingId}
      datePickerId={datePickerId}
      onDone={(next) => {
        void markDone(next.id).finally(() => {
          void review.reload();
        });
      }}
      onReschedule={(next, dueAt) => {
        setDatePickerId(null);
        void reschedule(next.id, dueAt).finally(() => {
          void review.reload();
        });
      }}
      onOpenDatePicker={setDatePickerId}
      onCloseDatePicker={(id) => setDatePickerId((current) => (current === id ? null : current))}
      onEdit={(next) => {
        haptics.light();
        setDatePickerId(null);
        setEditingId(next.id);
        setPendingDeleteId(null);
      }}
      onSave={(id, draft) => void onSave(id, draft)}
      onCancelEdit={() => setEditingId(null)}
      onEditorDelete={() => {
        haptics.warning();
        setPendingDeleteId(item.id);
      }}
      onRowDelete={(next) => {
        haptics.warning();
        setDatePickerId(null);
        setEditingId(null);
        setPendingDeleteId(next.id);
      }}
    />
  );

  const refresh = () => {
    void reload(true);
    void reloadCategories();
    void review.reload();
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader title="All items" />

        {review.show ? (
          <ReviewEntry
            count={review.count}
            onReview={() => router.push(REVIEW_HREF)}
            onDismiss={review.dismiss}
          />
        ) : null}

        <View style={styles.searchWrap}>
          <IconSymbol name="magnifyingglass" size={18} color={Theme.color.textSecondary} />
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={filter === 'category' ? 'Search categories' : 'Search'}
            placeholderTextColor={Theme.color.textTertiary}
            selectionColor={Theme.color.accent}
            cursorColor={Theme.color.accent}
            style={styles.search}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
        </View>

        <FilterChips
          value={filter}
          options={FILTER_OPTIONS}
          onChange={(next) => {
            setFilter(next);
            setEditingId(null);
            setPendingDeleteId(null);
            setDatePickerId(null);
          }}
        />

        {error ? <ErrorBanner message={error} onRetry={() => void reload()} /> : null}
        {filter === 'category' && categoriesError && !error ? (
          <ErrorBanner message={categoriesError} onRetry={() => void reloadCategories()} />
        ) : null}

        {filter === 'category' ? (
          categoryBlocking ? (
            error ? (
              <View style={styles.flex} />
            ) : (
              <View style={styles.centered}>
                <ActivityIndicator color={Theme.color.accent} />
              </View>
            )
          ) : (
            <FlatList
              data={shownCategoryRows}
              keyExtractor={(row) => row.id}
              contentContainerStyle={[
                styles.list,
                shownCategoryRows.length === 0 && !anyCategoryRows && styles.emptyList,
              ]}
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={refresh}
                  tintColor={Theme.color.accent}
                />
              }
              ListEmptyComponent={
                hideCategoryRows || (categoriesError && categories.length === 0 && !anyCategoryRows) ? null : !anyCategoryRows ? (
                  <EmptyState
                    mark="list"
                    title="No categories yet"
                    description="Categories are added when you confirm a capture"
                    actionLabel="Go to Capture"
                    onAction={() => router.navigate('/(tabs)/capture')}
                  />
                ) : (
                  <Text style={styles.noMatch}>No categories match</Text>
                )
              }
              renderItem={({ item: row }) => <CategoryRow row={row} onPress={openCategory} />}
            />
          )
        ) : loading && items.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Theme.color.accent} />
          </View>
        ) : !categoriesSettled && visible.length > 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Theme.color.accent} />
          </View>
        ) : (
          <SectionList
            key={filter}
            sections={sections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.list,
              openEmpty && visible.length === 0 && styles.emptyList,
            ]}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            stickySectionHeadersEnabled={false}
            extraData={`${editingId ?? ''}:${pendingDeleteId ?? ''}:${saving}:${datePickerId ?? ''}:${movingId ?? ''}:${categories.map((category) => category.id).join(',')}`}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={Theme.color.accent}
              />
            }
            ListEmptyComponent={
              openEmpty ? (
                <EmptyState
                  mark="list"
                  title="Nothing open"
                  description="Capture a plan to fill this list"
                  actionLabel="Go to Capture"
                  onAction={() => router.navigate('/(tabs)/capture')}
                />
              ) : (
                <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />
              )
            }
            renderSectionHeader={({ section }) => (
              <Text
                style={[
                  styles.sectionHeader,
                  section === sections[0] && styles.sectionHeaderFirst,
                ]}
              >
                {section.title}
              </Text>
            )}
            renderItem={renderItem}
          />
        )}
        {pendingDelete ? (
          <DeleteItemDialog
            item={pendingDelete}
            deleting={deleting}
            onCancel={() => {
              if (deleting) return;
              setPendingDeleteId(null);
            }}
            onConfirm={() => void onDelete(pendingDelete.id)}
          />
        ) : null}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
    textDecorationLine: 'none', // iOS can carry a done row's line-through into a recycled TextInput placeholder.
  },
  list: {
    paddingHorizontal: Theme.space.screenX,
    paddingBottom: Theme.space.listBottom,
    flexGrow: 1,
  },
  emptyList: {
    justifyContent: 'center',
  },
  sep: {
    height: Theme.space.listGap,
  },
  sectionHeader: {
    marginTop: Theme.space.lg,
    marginBottom: Theme.space.sm,
    fontSize: Theme.type.caption,
    lineHeight: 18,
    fontWeight: '600',
    color: Theme.color.textSecondary,
  },
  sectionHeaderFirst: {
    marginTop: 0,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryRow: {
    ...cardSurface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: Theme.space.md,
  },
  pressed: {
    opacity: 0.7,
  },
  categoryName: {
    flex: 1,
    fontSize: Theme.type.body,
    lineHeight: 22,
    fontWeight: '400',
    color: Theme.color.text,
  },
  categoryNameMuted: {
    color: Theme.color.textSecondary,
  },
  categoryTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 4,
  },
  count: {
    fontSize: Theme.type.caption,
    lineHeight: 18,
    color: Theme.color.textSecondary,
  },
  countOpen: {
    color: Theme.color.accent,
  },
  noMatch: {
    paddingTop: Theme.space.sm,
    fontSize: Theme.type.body,
    lineHeight: 22,
    color: Theme.color.textSecondary,
  },
});
