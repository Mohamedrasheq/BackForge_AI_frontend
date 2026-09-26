import { DeleteItemDialog } from '@/components/items/delete-item-dialog';
import { ItemEditor, type ItemDraft } from '@/components/items/item-editor';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { FilterChips } from '@/components/ui/filter-chips';
import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { ItemRow } from '@/components/ui/item-row';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Theme } from '@/constants/theme';
import { useCategories } from '@/hooks/use-categories';
import { useAllItems } from '@/hooks/use-items';
import { categoryLabelForItem, groupItemsByCategory } from '@/lib/categories';
import { haptics } from '@/lib/haptics';
import type { Item, ItemStatus } from '@/types/api';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
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
  const { items, loading, refreshing, error, reload, markDone, saveItem, removeItem, reschedule, movingId } =
    useAllItems(query);
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
    () => items.filter((item) => item.status === status),
    [items, status]
  );
  const doneSections = useMemo(
    () => (status === 'done' ? groupItemsByCategory(visible, categories) : []),
    [status, visible, categories]
  );
  const categoriesSettled = !categoriesLoading || Boolean(categoriesError);

  const empty = emptyCopy(query, status);

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
    } catch {
      haptics.error();
    } finally {
      setDeleting(false);
    }
  };

  const renderItem = ({ item }: { item: Item }) => {
    if (editingId === item.id) {
      return (
        <ItemEditor
          key={item.id}
          item={item}
          saving={saving}
          onSave={(draft) => void onSave(item.id, draft)}
          onCancel={() => {
            if (saving) return;
            setEditingId(null);
          }}
          onDelete={() => {
            if (saving) return;
            haptics.warning();
            setPendingDeleteId(item.id);
          }}
        />
      );
    }

    const open = item.status === 'open';

    return (
      <ItemRow
        item={item}
        categoryLabel={open ? categoryLabelForItem(item, categories) : null}
        onDone={open ? (next) => void markDone(next.id) : undefined}
        onReschedule={
          open
            ? (next, dueAt) => {
                setDatePickerId(null);
                void reschedule(next.id, dueAt);
              }
            : undefined
        }
        rescheduling={movingId === item.id}
        datePickerOpen={datePickerId === item.id}
        onOpenDatePicker={() => setDatePickerId(item.id)}
        onCloseDatePicker={() =>
          setDatePickerId((current) => (current === item.id ? null : current))
        }
        onEdit={(next) => {
          haptics.light();
          setDatePickerId(null);
          setEditingId(next.id);
          setPendingDeleteId(null);
        }}
        onDelete={(next) => {
          haptics.warning();
          setDatePickerId(null);
          setEditingId(null);
          setPendingDeleteId(next.id);
        }}
      />
    );
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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

        <FilterChips
          value={status}
          options={STATUS_OPTIONS}
          onChange={(next) => {
            setStatus(next);
            setEditingId(null);
            setPendingDeleteId(null);
            setDatePickerId(null);
          }}
        />

        {error ? <ErrorBanner message={error} onRetry={() => void reload()} /> : null}

        {loading && items.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Theme.color.accent} />
          </View>
        ) : status === 'done' && !categoriesSettled && visible.length > 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Theme.color.accent} />
          </View>
        ) : status === 'done' ? (
          <SectionList
            sections={doneSections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            stickySectionHeadersEnabled={false}
            extraData={`${editingId ?? ''}:${pendingDeleteId ?? ''}:${saving}:${datePickerId ?? ''}:${movingId ?? ''}:${categories.map((category) => category.id).join(',')}`}
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
              <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />
            }
            renderSectionHeader={({ section }) => (
              <Text
                style={[
                  styles.sectionHeader,
                  section === doneSections[0] && styles.sectionHeaderFirst,
                ]}
              >
                {section.title}
              </Text>
            )}
            renderItem={renderItem}
          />
        ) : (
          <FlatList
            data={visible}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            extraData={`${editingId ?? ''}:${pendingDeleteId ?? ''}:${saving}:${datePickerId ?? ''}:${movingId ?? ''}:${categories.map((category) => category.id).join(',')}`}
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
              <EmptyState icon={empty.icon} title={empty.title} description={empty.description} />
            }
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
  },
  list: {
    paddingHorizontal: Theme.space.screenX,
    paddingBottom: Theme.space.listBottom,
    flexGrow: 1,
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
});
