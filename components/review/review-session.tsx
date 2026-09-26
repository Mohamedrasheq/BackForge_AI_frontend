import { DueField } from '@/components/capture/due-field';
import { CategoryChip } from '@/components/categories/category-chip';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { IconButton } from '@/components/ui/icon-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Theme } from '@/constants/theme';
import { categoryLabelForItem } from '@/lib/categories';
import { haptics } from '@/lib/haptics';
import type { ReviewAction, ReviewDraft } from '@/lib/review';
import type { Category } from '@/types/api';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ACTIONS: { value: ReviewAction; label: string }[] = [
  { value: 'keep', label: 'Keep' },
  { value: 'move', label: 'Move' },
  { value: 'drop', label: 'Drop' },
];

export function ReviewSession({
  drafts,
  categories,
  loading,
  loadError,
  onRetry,
  onChange,
  onConfirm,
  onClose,
  onEmptyClose,
  confirming,
  error,
}: {
  /** Null while the first load is in flight. */
  drafts: ReviewDraft[] | null;
  categories: Category[];
  loading: boolean;
  loadError: string | null;
  onRetry: () => void;
  onChange: (update: (current: ReviewDraft[]) => ReviewDraft[]) => void;
  onConfirm: () => void;
  /** X / Back. Discards the session. */
  onClose: () => void;
  /** Empty-state Close. Returns to Today. */
  onEmptyClose: () => void;
  confirming: boolean;
  error: string | null;
}) {
  const insets = useSafeAreaInsets();
  const [activeDueId, setActiveDueId] = useState<string | null>(null);
  const rows = drafts ?? [];
  const empty = drafts !== null && rows.length === 0 && !loadError;
  const showList = rows.length > 0;

  const update = (id: string, patch: Partial<Pick<ReviewDraft, 'text' | 'action' | 'dueAt'>>) => {
    onChange((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const setAction = (row: ReviewDraft, action: ReviewAction) => {
    if (confirming || row.action === action) return;
    haptics.selection();
    if (action !== 'move') {
      setActiveDueId((current) => (current === row.id ? null : current));
    }
    update(row.id, {
      action,
      dueAt: action === 'move' && !row.dueAt ? row.suggestedDueAt : row.dueAt,
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title="Review"
        subtitle="Keep, move, or drop — nothing changes until you confirm."
        left={
          <IconButton
            name="xmark"
            accessibilityLabel="Close"
            onPress={() => {
              if (confirming) return;
              onClose();
            }}
          />
        }
      />

      {loading && drafts === null ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Theme.color.accent} />
        </View>
      ) : null}

      {loadError && drafts === null ? (
        <ErrorBanner message={loadError} onRetry={onRetry} />
      ) : null}

      {empty ? (
        <View style={styles.centered}>
          <EmptyState
            icon="checkmark"
            title="You're clear"
            description="Nothing quiet to review."
            actionLabel="Close"
            onAction={onEmptyClose}
          />
        </View>
      ) : null}

      {showList ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        >
          {rows.map((row, index) => {
            const dropping = row.action === 'drop';
            const categoryLabel = categoryLabelForItem(row, categories);
            return (
              <Card key={row.id} style={[styles.card, dropping && styles.cardDrop]}>
                <View style={[styles.indexWrap, dropping && styles.indexWrapDrop]}>
                  <Text style={styles.index}>{index + 1}</Text>
                </View>
                <TextInput
                  value={row.text}
                  onChangeText={(text) => update(row.id, { text })}
                  placeholder="Item"
                  placeholderTextColor={Theme.color.textTertiary}
                  selectionColor={Theme.color.accent}
                  cursorColor={Theme.color.accent}
                  style={[styles.body, dropping && styles.bodyDrop]}
                  multiline
                  textAlignVertical="top"
                  editable={!confirming}
                  accessibilityLabel={`Title ${index + 1}`}
                />
                <View
                  accessibilityRole="radiogroup"
                  style={styles.actions}
                >
                  {ACTIONS.map((option) => {
                    const selected = row.action === option.value;
                    const dropSelected = selected && option.value === 'drop';
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={option.label}
                        onPress={() => setAction(row, option.value)}
                        style={({ pressed }) => [
                          styles.action,
                          selected && !dropSelected && styles.actionSelected,
                          dropSelected && styles.actionDrop,
                          !selected && styles.actionIdle,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.actionLabel,
                            selected && !dropSelected && styles.actionLabelSelected,
                            dropSelected && styles.actionLabelDrop,
                            !selected && styles.actionLabelIdle,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {row.action === 'move' ? (
                  <DueField
                    value={row.dueAt}
                    allowClear={false}
                    pickerOpen={activeDueId === row.id}
                    onOpenPicker={() => setActiveDueId(row.id)}
                    onClosePicker={() =>
                      setActiveDueId((current) => (current === row.id ? null : current))
                    }
                    onChange={(dueAt) => update(row.id, { dueAt: dueAt ?? row.suggestedDueAt })}
                  />
                ) : null}
                {categoryLabel ? <CategoryChip label={categoryLabel} /> : null}
              </Card>
            );
          })}
        </ScrollView>
      ) : null}

      {showList ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Theme.space.lg) }]}>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <PrimaryButton
            label="Confirm"
            onPress={onConfirm}
            loading={confirming}
            disabled={rows.length === 0}
          />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  cardDrop: {
    backgroundColor: Theme.color.background,
  },
  indexWrap: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: Theme.color.background,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexWrapDrop: {
    backgroundColor: Theme.color.card,
  },
  index: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.color.textSecondary,
  },
  body: {
    minHeight: 52,
    fontSize: 18,
    lineHeight: 26,
    color: Theme.color.text,
    fontWeight: '600',
    letterSpacing: -0.2,
    padding: 0,
  },
  bodyDrop: {
    color: Theme.color.textSecondary,
    textDecorationLine: 'line-through',
  },
  actions: {
    flexDirection: 'row',
    gap: Theme.space.sm,
  },
  action: {
    flex: 1,
    height: 36,
    borderRadius: Theme.radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSelected: {
    backgroundColor: Theme.color.accentSoft,
    borderColor: Theme.color.accent,
  },
  actionDrop: {
    backgroundColor: Theme.color.background,
    borderColor: Theme.color.border,
  },
  actionIdle: {
    backgroundColor: Theme.color.card,
    borderColor: Theme.color.border,
  },
  actionLabel: {
    fontSize: Theme.type.label,
    fontWeight: '600',
  },
  actionLabelSelected: {
    color: Theme.color.accent,
  },
  actionLabelDrop: {
    color: Theme.color.textSecondary,
  },
  actionLabelIdle: {
    color: Theme.color.textSecondary,
  },
  pressed: {
    opacity: 0.75,
  },
  footer: {
    paddingHorizontal: Theme.space.screenX,
    paddingTop: Theme.space.sm,
    gap: Theme.space.sm,
  },
  error: {
    textAlign: 'center',
    color: Theme.color.danger,
    fontSize: Theme.type.caption,
    lineHeight: 18,
  },
});
