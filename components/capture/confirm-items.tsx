import { DueField } from '@/components/capture/due-field';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import type { ProposedItem } from '@/types/api';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export type DraftItem = {
  key: string;
  text: string;
  dueAt: string | null;
};

let draftKeySeq = 0;

export function createDraftItem(item?: { text?: string; dueAt?: string | null }): DraftItem {
  draftKeySeq += 1;
  return {
    // Monotonic counter — Date.now() alone collides when mapping a parse result.
    key: `draft-${draftKeySeq}`,
    text: item?.text ?? '',
    dueAt: item?.dueAt ?? null,
  };
}

export function patchDraftByKey(
  items: DraftItem[],
  key: string,
  patch: Partial<Pick<DraftItem, 'text' | 'dueAt'>>
): DraftItem[] {
  return items.map((item) => (item.key === key ? { ...item, ...patch } : item));
}

export function saveableDraftItems(items: DraftItem[]): ProposedItem[] {
  return items
    .map((item) => ({ text: item.text.trim(), dueAt: item.dueAt }))
    .filter((item) => item.text.length > 0);
}

export const EMPTY_PARSE_MESSAGE = 'Nothing to save from that. Try adding a bit more.';

export function ConfirmItems({
  items,
  onChange,
  onConfirm,
  onBack,
  confirming,
  error,
}: {
  items: DraftItem[];
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

  const updateAt = (key: string, patch: Partial<Pick<DraftItem, 'text' | 'dueAt'>>) => {
    onChange((prev) => patchDraftByKey(prev, key, patch));
  };

  const removeAt = (key: string) => {
    haptics.light();
    setActiveDueKey((current) => (current === key ? null : current));
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to dump"
            onPress={onBack}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          >
            <IconSymbol name="xmark" size={16} color={Theme.color.accent} />
          </Pressable>
        }
      />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
      >
        {items.map((item, index) => (
          <View key={item.key} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.index}>{index + 1}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete item ${index + 1}`}
                onPress={() => removeAt(item.key)}
                hitSlop={8}
                style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
              >
                <IconSymbol name="trash" size={18} color={Theme.color.danger} />
              </Pressable>
            </View>
            <TextInput
              value={item.text}
              onChangeText={(text) => updateAt(item.key, { text })}
              placeholder="Item"
              placeholderTextColor={Theme.color.textTertiary}
              selectionColor={Theme.color.accent}
              cursorColor={Theme.color.accent}
              style={styles.body}
              multiline
              textAlignVertical="top"
            />
            <DueField
              value={item.dueAt}
              pickerOpen={activeDueKey === item.key}
              onOpenPicker={() => setActiveDueKey(item.key)}
              onClosePicker={() =>
                setActiveDueKey((current) => (current === item.key ? null : current))
              }
              onChange={(dueAt) => updateAt(item.key, { dueAt })}
            />
          </View>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  back: {
    marginTop: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.color.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  list: {
    paddingHorizontal: Theme.space.lg,
    paddingBottom: Theme.space.md,
    gap: 12,
  },
  card: {
    backgroundColor: Theme.color.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.color.border,
    padding: Theme.space.md,
    gap: 10,
    ...Theme.shadow.card,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  index: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.color.textTertiary,
  },
  delete: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.color.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    minHeight: 52,
    fontSize: 16,
    lineHeight: 24,
    color: Theme.color.text,
    fontWeight: '500',
    padding: 0,
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
    fontSize: 15,
    fontWeight: '600',
    color: Theme.color.accent,
  },
  footer: {
    paddingHorizontal: Theme.space.lg,
    paddingBottom: Theme.space.lg,
    paddingTop: Theme.space.sm,
    gap: Theme.space.sm,
  },
  error: {
    textAlign: 'center',
    color: Theme.color.danger,
    fontSize: 14,
  },
  gentle: {
    color: Theme.color.textSecondary,
  },
});
