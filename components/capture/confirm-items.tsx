import { CategoryChip } from '@/components/categories/category-chip';
import { CategoryPickerSheet } from '@/components/categories/category-picker-sheet';
import { EditableItemFields } from '@/components/items/editable-item-fields';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Theme } from '@/constants/theme';
import { wasLine } from '@/lib/ask-drafts';
import { CONFIRM_STILL_SAVING_MESSAGE, CONFIRM_STILL_SAVING_MS, confirmSavingLabel } from '@/lib/capture-status';
import { resolveCategorySuggestion, UNFILED_LABEL } from '@/lib/categories';
import {
  doneMetaLine,
  draftKindLabel,
  draftRemoveControl,
  saveableDraftItems,
  type DraftKind,
  type DraftWas,
} from '@/lib/confirm-drafts';
import { formatDue } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import type { Category } from '@/types/api';
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
  /** True when the model picked the clock time. Cleared as soon as the user sets a time. */
  suggested: boolean;
  /** True after the user picks a category or Unfiled, so a late suggestion cannot overwrite it. */
  categoryChosen: boolean;
  /** Absent on Capture drafts, which stay adds. */
  kind?: DraftKind;
  /** Required for an edit or done proposal. */
  itemId?: string;
  /** Edit only. The client fills this from the saved item before Confirm opens. */
  was?: DraftWas;
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
    suggested?: boolean;
    categoryChosen?: boolean;
    kind?: DraftKind;
    itemId?: string;
    was?: DraftWas;
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
    suggested: item?.suggested === true,
    categoryChosen,
    kind: item?.kind,
    itemId: item?.itemId,
    was: item?.was,
  };
}

export { saveableDraftItems };

function patchDraftByKey(
  items: DraftItem[],
  key: string,
  patch: Partial<
    Pick<
      DraftItem,
      'text' | 'dueAt' | 'folderId' | 'categoryName' | 'pendingNew' | 'categoryChosen' | 'suggested'
    >
  >
): DraftItem[] {
  return items.map((item) => (item.key === key ? { ...item, ...patch } : item));
}

/** Fill chips from a matching category, or from an invented name. Never creates one. */
function applyCategorySuggestions(items: DraftItem[], categories: Category[]): DraftItem[] {
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
  const [activeTimeKey, setActiveTimeKey] = useState<string | null>(null);
  const [activeCategoryKey, setActiveCategoryKey] = useState<string | null>(null);
  const [stillSaving, setStillSaving] = useState(false);
  const activeCategory = items.find((item) => item.key === activeCategoryKey) ?? null;

  useEffect(() => {
    onChange((prev) => applyCategorySuggestions(prev, categories));
  }, [categories, onChange]);

  useEffect(() => {
    if (!confirming) {
      setStillSaving(false);
      return;
    }
    setActiveDueKey(null);
    setActiveTimeKey(null);
    setActiveCategoryKey(null);
    const timer = setTimeout(() => setStillSaving(true), CONFIRM_STILL_SAVING_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  const updateAt = (
    key: string,
    patch: Partial<
      Pick<
        DraftItem,
        'text' | 'dueAt' | 'folderId' | 'categoryName' | 'pendingNew' | 'categoryChosen' | 'suggested'
      >
    >
  ) => {
    onChange((prev) => patchDraftByKey(prev, key, patch));
  };

  const removeAt = (key: string) => {
    haptics.light();
    setActiveDueKey((current) => (current === key ? null : current));
    setActiveTimeKey((current) => (current === key ? null : current));
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
          <IconButton
            name="xmark"
            accessibilityLabel="Back to dump"
            disabled={confirming}
            onPress={onBack}
          />
        }
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
      >
        {items.map((item, index) => {
          const remove = draftRemoveControl(item.kind, index);
          const kindLabel = draftKindLabel(item.kind);
          const previous = wasLine(item);
          return (
            <Card key={item.key} style={[styles.card, confirming && styles.cardSaving]}>
              <View pointerEvents={confirming ? 'none' : 'auto'} style={styles.cardBody}>
              <View style={styles.cardTop}>
                <View style={styles.cardTopLeft}>
                  <View style={styles.indexWrap}>
                    <Text style={styles.index}>{index + 1}</Text>
                  </View>
                  {kindLabel ? <Text style={styles.kindLabel}>{kindLabel}</Text> : null}
                </View>
                <IconButton
                  name={remove.name}
                  tone={remove.tone}
                  size={32}
                  accessibilityLabel={remove.accessibilityLabel}
                  disabled={confirming}
                  onPress={() => removeAt(item.key)}
                />
              </View>
              {item.kind === 'done' ? (
                <View style={styles.doneRow}>
                  <IconSymbol name="checkmark.circle.fill" size={20} color={Theme.color.accent} />
                  <View style={styles.doneBody}>
                    <Text style={styles.doneText}>{item.text}</Text>
                    <Text style={styles.doneMeta}>
                      {doneMetaLine(formatDue(item.dueAt), item.categoryName)}
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  <EditableItemFields
                    compact
                    text={item.text}
                    onChangeText={(text) => updateAt(item.key, { text })}
                    dueAt={item.dueAt}
                    onChangeDue={(dueAt) =>
                      updateAt(item.key, { dueAt, ...(dueAt == null ? { suggested: false } : {}) })
                    }
                    pickerOpen={activeDueKey === item.key}
                    onOpenPicker={() => {
                      setActiveCategoryKey(null);
                      setActiveTimeKey(null);
                      setActiveDueKey(item.key);
                    }}
                    onClosePicker={() =>
                      setActiveDueKey((current) => (current === item.key ? null : current))
                    }
                    timeChips="toggle"
                    chipsOpen={activeTimeKey === item.key}
                    onToggleChips={() => {
                      setActiveCategoryKey(null);
                      setActiveDueKey((current) => (current === item.key ? null : current));
                      setActiveTimeKey((current) => (current === item.key ? null : item.key));
                    }}
                    suggested={item.suggested}
                    showSuggested
                    onCommitTime={() => updateAt(item.key, { suggested: false })}
                    dueAccessory={
                      <CategoryChip
                        label={item.categoryName ?? UNFILED_LABEL}
                        assigned={Boolean(item.folderId) || item.pendingNew}
                        hint={item.pendingNew ? 'New' : undefined}
                        onPress={() => {
                          setActiveDueKey((current) => (current === item.key ? null : current));
                          setActiveTimeKey(null);
                          setActiveCategoryKey(item.key);
                          onReloadCategories();
                        }}
                      />
                    }
                  />
                  {previous ? <Text style={styles.was}>{previous}</Text> : null}
                </>
              )}
              </View>
            </Card>
          );
        })}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add item"
          disabled={confirming}
          onPress={addRow}
          style={({ pressed }) => [styles.add, confirming && styles.cardSaving, pressed && !confirming && styles.pressed]}
        >
          <IconSymbol name="plus" size={18} color={Theme.color.accent} />
          <Text style={styles.addLabel}>Add item</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        {error ? (
          <Text style={[styles.error, error === EMPTY_PARSE_MESSAGE && styles.gentle]}>{error}</Text>
        ) : stillSaving && confirming ? (
          <Text style={styles.gentle}>{CONFIRM_STILL_SAVING_MESSAGE}</Text>
        ) : null}
        <PrimaryButton
          label={confirming ? confirmSavingLabel(saveable.length) : 'Confirm'}
          onPress={onConfirm}
          loading={confirming}
          disabled={!canConfirm}
        />
      </View>
      {activeCategory && !confirming ? (
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
    gap: 12,
  },
  card: {
    gap: 12,
    padding: 14,
  },
  cardBody: {
    gap: 12,
  },
  cardSaving: {
    opacity: 0.6,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTopLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kindLabel: {
    fontSize: Theme.type.caption,
    lineHeight: 18,
    fontWeight: '600',
    color: Theme.color.accent,
  },
  doneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  doneBody: {
    flex: 1,
    minWidth: 0,
  },
  doneText: {
    fontSize: Theme.type.body,
    lineHeight: 22,
    fontWeight: '600',
    color: Theme.color.text,
  },
  doneMeta: {
    marginTop: 4,
    fontSize: Theme.type.caption,
    lineHeight: 18,
    color: Theme.color.textSecondary,
  },
  was: {
    fontSize: Theme.type.caption,
    lineHeight: 18,
    color: Theme.color.textSecondary,
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
