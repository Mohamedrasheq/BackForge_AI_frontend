import { CategoryChip } from '@/components/categories/category-chip';
import { CategoryPickerSheet } from '@/components/categories/category-picker-sheet';
import { EditableItemFields } from '@/components/items/editable-item-fields';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Theme } from '@/constants/theme';
import { resolveCategorySuggestion, UNFILED_LABEL } from '@/lib/categories';
import { haptics } from '@/lib/haptics';
import type { Category, ProposedItem } from '@/types/api';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export type DraftItem = {
  key: string;
  text: string;
  dueAt: string | null;
  folderId: string | null;
  categoryName: string | null;
  /** Invented name on the chip. Confirm creates it. Folder id stays null until then. */
  pendingNew: boolean;
  suggestedFolderId: string | null;
  suggestedCategory: string | null;
  suggestedIsNew: boolean;
  /** True after the user picks a category or Unfiled, so a late suggestion cannot overwrite it. */
  categoryChosen: boolean;
};

let draftKeySeq = 0;

export function createDraftItem(
  item?: {
    text?: string;
    dueAt?: string | null;
    folderId?: string | null;
    categoryName?: string | null;
    pendingNew?: boolean;
    suggestedFolderId?: string | null;
    suggestedCategory?: string | null;
    suggestedIsNew?: boolean;
    categoryChosen?: boolean;
  },
  categories: Category[] = []
): DraftItem {
  draftKeySeq += 1;
  const suggestedFolderId = item?.suggestedFolderId ?? null;
  const suggestedCategory = item?.suggestedCategory ?? null;
  const suggestedIsNew = item?.suggestedIsNew ?? false;
  const categoryChosen = item?.categoryChosen ?? false;
  const resolved = categoryChosen
    ? null
    : resolveCategorySuggestion(
        { suggestedFolderId, suggestedCategory, suggestedIsNew },
        categories
      );

  return {
    // Monotonic counter — Date.now() alone collides when mapping a parse result.
    key: `draft-${draftKeySeq}`,
    text: item?.text ?? '',
    dueAt: item?.dueAt ?? null,
    folderId: categoryChosen ? (item?.folderId ?? null) : (resolved?.folderId ?? null),
    categoryName: categoryChosen ? (item?.categoryName ?? null) : (resolved?.categoryName ?? null),
    pendingNew: categoryChosen ? (item?.pendingNew ?? false) : (resolved?.pendingNew ?? false),
    suggestedFolderId,
    suggestedCategory,
    suggestedIsNew,
    categoryChosen,
  };
}

export function patchDraftByKey(
  items: DraftItem[],
  key: string,
  patch: Partial<
    Pick<DraftItem, 'text' | 'dueAt' | 'folderId' | 'categoryName' | 'pendingNew' | 'categoryChosen'>
  >
): DraftItem[] {
  return items.map((item) => (item.key === key ? { ...item, ...patch } : item));
}

/** Fill chips from a matching category, or from an invented name. Never creates one. */
export function applyCategorySuggestions(items: DraftItem[], categories: Category[]): DraftItem[] {
  let changed = false;
  const next = items.map((item) => {
    if (item.categoryChosen) return item;
    const resolved = resolveCategorySuggestion(item, categories);
    if (
      resolved.folderId === item.folderId &&
      resolved.categoryName === item.categoryName &&
      resolved.pendingNew === item.pendingNew
    ) {
      return item;
    }
    changed = true;
    return { ...item, ...resolved };
  });
  return changed ? next : items;
}

export function saveableDraftItems(items: DraftItem[]): ProposedItem[] {
  return items
    .map((item) => ({
      text: item.text.trim(),
      dueAt: item.dueAt,
      folderId: item.folderId,
      suggestedFolderId: null,
      suggestedCategory: null,
      suggestedIsNew: false,
    }))
    .filter((item) => item.text.length > 0);
}

export const EMPTY_PARSE_MESSAGE = 'Nothing to save from that. Try adding a bit more.';

export function ConfirmItems({
  items,
  categories,
  categoriesError,
  onReloadCategories,
  onCreateCategory,
  onChange,
  onConfirm,
  onBack,
  confirming,
  error,
}: {
  items: DraftItem[];
  categories: Category[];
  categoriesError: string | null;
  onReloadCategories: () => void;
  onCreateCategory: (name: string) => Promise<Category>;
  onChange: React.Dispatch<React.SetStateAction<DraftItem[]>>;
  onConfirm: () => void;
  onBack: () => void;
  confirming: boolean;
  error: string | null;
}) {
  const saveable = saveableDraftItems(items);
  const canConfirm = saveable.length > 0 && !confirming;
  // One native DateTimePicker at a time — multiple instances share events on iOS/Android.
  const [activeDueKey, setActiveDueKey] = useState<string | null>(null);
  const [activeCategoryKey, setActiveCategoryKey] = useState<string | null>(null);
  const activeCategory = items.find((item) => item.key === activeCategoryKey) ?? null;

  useEffect(() => {
    onChange((prev) => applyCategorySuggestions(prev, categories));
  }, [categories, onChange]);

  const updateAt = (
    key: string,
    patch: Partial<
      Pick<DraftItem, 'text' | 'dueAt' | 'folderId' | 'categoryName' | 'pendingNew' | 'categoryChosen'>
    >
  ) => {
    onChange((prev) => patchDraftByKey(prev, key, patch));
  };

  const removeAt = (key: string) => {
    haptics.light();
    setActiveDueKey((current) => (current === key ? null : current));
    setActiveCategoryKey((current) => (current === key ? null : current));
    onChange((prev) => prev.filter((item) => item.key !== key));
  };

  const addRow = () => {
    haptics.light();
    onChange((prev) => [...prev, createDraftItem()]);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader
        title="Confirm"
        subtitle="Edit anything before saving."
        right={
          <IconButton name="xmark" accessibilityLabel="Back to dump" onPress={onBack} />
        }
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
      >
        {items.map((item, index) => (
          <Card key={item.key} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.indexWrap}>
                <Text style={styles.index}>{index + 1}</Text>
              </View>
              <IconButton
                name="trash"
                tone="danger"
                size={32}
                accessibilityLabel={`Delete item ${index + 1}`}
                onPress={() => removeAt(item.key)}
              />
            </View>
            <EditableItemFields
              text={item.text}
              onChangeText={(text) => updateAt(item.key, { text })}
              dueAt={item.dueAt}
              onChangeDue={(dueAt) => updateAt(item.key, { dueAt })}
              pickerOpen={activeDueKey === item.key}
              onOpenPicker={() => {
                setActiveCategoryKey(null);
                setActiveDueKey(item.key);
              }}
              onClosePicker={() =>
                setActiveDueKey((current) => (current === item.key ? null : current))
              }
            />
            <CategoryChip
              label={item.categoryName ?? UNFILED_LABEL}
              assigned={Boolean(item.folderId) || item.pendingNew}
              hint={item.pendingNew ? 'New' : undefined}
              onPress={() => {
                setActiveDueKey((current) => (current === item.key ? null : current));
                setActiveCategoryKey(item.key);
                onReloadCategories();
              }}
            />
          </Card>
        ))}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add item"
          onPress={addRow}
          style={({ pressed }) => [styles.add, pressed && styles.pressed]}
        >
          <IconSymbol name="plus" size={18} color={Theme.color.accent} />
          <Text style={styles.addLabel}>Add item</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        {error ? (
          <Text style={[styles.error, error === EMPTY_PARSE_MESSAGE && styles.gentle]}>{error}</Text>
        ) : null}
        <PrimaryButton
          label="Confirm"
          onPress={onConfirm}
          loading={confirming}
          disabled={!canConfirm}
        />
      </View>
      {activeCategory ? (
        <CategoryPickerSheet
          categories={categories}
          selectedId={activeCategory.folderId}
          pendingName={activeCategory.pendingNew ? activeCategory.categoryName : null}
          listError={categories.length === 0 ? categoriesError : null}
          onRetry={onReloadCategories}
          onCreate={onCreateCategory}
          onSelect={(folderId, name) => {
            const trimmed = name?.trim() ?? '';
            updateAt(activeCategory.key, {
              folderId,
              categoryName: trimmed || null,
              categoryChosen: true,
              pendingNew: !folderId && trimmed.length > 0,
            });
            setActiveCategoryKey(null);
          }}
          onClose={() => setActiveCategoryKey(null)}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  list: {
    paddingHorizontal: Theme.space.screenX,
    paddingBottom: Theme.space.md,
    gap: Theme.space.md,
  },
  card: {
    gap: 12,
    padding: 18,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  indexWrap: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: Theme.color.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  index: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.color.textSecondary,
  },
  add: {
    minHeight: 48,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Theme.color.border,
    backgroundColor: Theme.color.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addLabel: {
    fontSize: Theme.type.label,
    fontWeight: '600',
    color: Theme.color.accent,
  },
  footer: {
    paddingHorizontal: Theme.space.screenX,
    paddingBottom: Theme.space.lg,
    paddingTop: Theme.space.sm,
    gap: Theme.space.sm,
  },
  error: {
    textAlign: 'center',
    color: Theme.color.danger,
    fontSize: Theme.type.caption,
  },
  gentle: {
    color: Theme.color.textSecondary,
  },
});
