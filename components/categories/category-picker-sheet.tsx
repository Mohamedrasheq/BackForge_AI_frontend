import { IconSymbol } from '@/components/ui/icon-symbol';
import { TextButton } from '@/components/ui/text-button';
import { Theme } from '@/constants/theme';
import { UNFILED_LABEL } from '@/lib/categories';
import { haptics } from '@/lib/haptics';
import type { Category } from '@/types/api';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function CategoryPickerSheet({
  categories,
  selectedId,
  listError,
  onRetry,
  onSelect,
  onCreate,
  onClose,
}: {
  categories: Category[];
  selectedId: string | null;
  listError: string | null;
  onRetry?: () => void;
  onSelect: (folderId: string | null, name: string | null) => void;
  onCreate: (name: string) => Promise<Category>;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const trimmed = draft.trim();
  const canAdd = trimmed.length > 0 && !creating;

  const close = () => {
    if (creating) return;
    onClose();
  };

  const choose = (folderId: string | null, name: string | null) => {
    if (creating) return;
    haptics.selection();
    onSelect(folderId, name);
  };

  const onAdd = async () => {
    if (!canAdd) return;
    const existing = categories.find(
      (category) => category.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) {
      choose(existing.id, existing.name);
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const created = await onCreate(trimmed);
      haptics.success();
      onSelect(created.id, created.name);
    } catch (err) {
      haptics.error();
      setCreateError(err instanceof Error ? err.message : 'Could not add that category');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal transparent animationType="slide" visible onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss category picker"
          style={styles.backdrop}
          onPress={close}
        >
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Theme.space.md) }]}
            onPress={() => undefined}
          >
            <View style={styles.handle} />
            <Text style={styles.title}>Category</Text>

            {listError ? (
              <View style={styles.listError}>
                <Text style={styles.listErrorText}>{listError}</Text>
                {onRetry ? <TextButton label="Try again" onPress={onRetry} /> : null}
              </View>
            ) : null}

            <ScrollView
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
            >
              <CategoryOption
                label={UNFILED_LABEL}
                selected={selectedId === null}
                onPress={() => choose(null, null)}
              />
              {categories.map((category) => (
                <CategoryOption
                  key={category.id}
                  label={category.name}
                  selected={category.id === selectedId}
                  onPress={() => choose(category.id, category.name)}
                />
              ))}
            </ScrollView>

            <View style={styles.createRow}>
              <TextInput
                value={draft}
                onChangeText={(next) => {
                  setDraft(next);
                  setCreateError(null);
                }}
                placeholder="New category"
                placeholderTextColor={Theme.color.textTertiary}
                selectionColor={Theme.color.accent}
                cursorColor={Theme.color.accent}
                style={styles.input}
                autoCapitalize="sentences"
                autoCorrect
                maxLength={80}
                editable={!creating}
                returnKeyType="done"
                onSubmitEditing={() => void onAdd()}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add category"
                disabled={!canAdd}
                onPress={() => void onAdd()}
                style={({ pressed }) => [styles.add, !canAdd && styles.addDisabled, pressed && canAdd && styles.pressed]}
              >
                {creating ? (
                  <ActivityIndicator color={Theme.color.white} />
                ) : (
                  <Text style={styles.addLabel}>Add</Text>
                )}
              </Pressable>
            </View>
            {createError ? <Text style={styles.createError}>{createError}</Text> : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CategoryOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
    >
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]} numberOfLines={1}>
        {label}
      </Text>
      {selected ? <IconSymbol name="checkmark" size={18} color={Theme.color.accent} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: Theme.color.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    backgroundColor: Theme.color.card,
    borderTopLeftRadius: Theme.radius.xl,
    borderTopRightRadius: Theme.radius.xl,
    paddingTop: Theme.space.sm,
    paddingHorizontal: Theme.space.screenX,
    gap: Theme.space.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.color.border,
    marginBottom: Theme.space.xs,
  },
  title: {
    fontSize: Theme.type.screenTitle,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: Theme.color.text,
  },
  listError: {
    gap: 2,
  },
  listErrorText: {
    fontSize: Theme.type.caption,
    lineHeight: 18,
    color: Theme.color.danger,
  },
  list: {
    maxHeight: 320,
  },
  listContent: {
    gap: 4,
    paddingBottom: Theme.space.xs,
  },
  option: {
    minHeight: 48,
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  optionSelected: {
    backgroundColor: Theme.color.accentSoft,
  },
  optionLabel: {
    flex: 1,
    fontSize: Theme.type.body,
    lineHeight: 22,
    fontWeight: '500',
    color: Theme.color.text,
  },
  optionLabelSelected: {
    fontWeight: '600',
    color: Theme.color.accent,
  },
  pressed: {
    opacity: 0.7,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.color.border,
    paddingLeft: Theme.space.md,
    paddingRight: 6,
  },
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: Theme.type.body,
    lineHeight: 22,
    color: Theme.color.text,
    paddingVertical: 10,
  },
  add: {
    minWidth: 64,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addDisabled: {
    opacity: 0.45,
  },
  addLabel: {
    color: Theme.color.white,
    fontSize: Theme.type.label,
    fontWeight: '600',
  },
  createError: {
    fontSize: Theme.type.caption,
    lineHeight: 18,
    color: Theme.color.danger,
  },
});
