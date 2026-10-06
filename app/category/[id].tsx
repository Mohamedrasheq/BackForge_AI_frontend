import { DeleteItemDialog } from '@/components/items/delete-item-dialog';
import { EditableItemRow } from '@/components/items/editable-item-row';
import { type ItemDraft } from '@/components/items/item-editor';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Theme } from '@/constants/theme';
import { useCategories } from '@/hooks/use-categories';
import { useAllItems } from '@/hooks/use-items';
import {
  UNFILED_ROUTE_ID,
  categoryBrowseTitle,
  categoryCountLabel,
  itemsInCategory,
  sortDoneByCompleted,
  sortOpenByDue,
} from '@/lib/category-browse';
import { haptics } from '@/lib/haptics';
import type { Item } from '@/types/api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default function CategoryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[]; name?: string | string[] }>();
  const categoryId = firstParam(params.id);
  const hintedName = firstParam(params.name);
  const isUnfiled = categoryId === UNFILED_ROUTE_ID;

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
  } = useAllItems('');
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

  const categoriesSettled = !categoriesLoading || Boolean(categoriesError);
  const categoriesKnown = !categoriesLoading && !categoriesError;
  const title = categoryBrowseTitle(categoryId, categories) ?? (hintedName || 'Category');

  const scoped = useMemo(
    () =>
      itemsInCategory(items, categoryId, categories, {
        unknownFolderIsUnfiled: categoriesKnown,
      }),
    [items, categoryId, categories, categoriesKnown]
  );
  const openItems = useMemo(
    () => sortOpenByDue(scoped.filter((item) => item.status === 'open')),
    [scoped]
  );
  const doneItems = useMemo(
    () => sortDoneByCompleted(scoped.filter((item) => item.status === 'done')),
    [scoped]
  );
  const sections = useMemo(() => {
    const next: { title: string; data: Item[] }[] = [];
    if (openItems.length > 0) next.push({ title: 'Open', data: openItems });
    if (doneItems.length > 0) next.push({ title: 'Done', data: doneItems });
    return next;
  }, [openItems, doneItems]);

  const blockList = (loading && items.length === 0) || (isUnfiled && !categoriesSettled);
  const subtitle = categoryCountLabel(openItems.length, doneItems.length);

  const pendingDelete = useMemo(
    () => items.find((item) => item.id === pendingDeleteId) ?? null,
    [items, pendingDeleteId]
  );

  const goBack = () => {
    haptics.light();
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/items');
  };

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

  const renderItem = ({ item }: { item: Item }) => (
    <EditableItemRow
      item={item}
      categories={categories}
      editing={editingId === item.id}
      saving={saving}
      movingId={movingId}
      datePickerId={datePickerId}
      onDone={(next) => {
        void markDone(next.id);
      }}
      onReschedule={(next, dueAt) => {
        setDatePickerId(null);
        void reschedule(next.id, dueAt);
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

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScreenHeader
          title={title}
          subtitle={blockList ? undefined : subtitle}
          left={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={goBack}
              hitSlop={8}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            >
              <IconSymbol name="chevron.left" size={24} color={Theme.color.text} />
            </Pressable>
          }
        />

        {error ? <ErrorBanner message={error} onRetry={() => void reload()} /> : null}
        {categoriesError && !error ? (
          <ErrorBanner message={categoriesError} onRetry={() => void reloadCategories()} />
        ) : null}

        {blockList ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Theme.color.accent} />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.list, sections.length === 0 && styles.emptyList]}
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
              error && items.length === 0 ? null : (
                <EmptyState
                  mark="list"
                  title="Nothing in this category"
                  description="Tasks filed here will show up"
                />
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
  back: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  pressed: {
    opacity: 0.6,
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
});
