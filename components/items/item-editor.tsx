import { EditableItemFields } from '@/components/items/editable-item-fields';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextButton } from '@/components/ui/text-button';
import type { Item } from '@/types/api';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

export type ItemDraft = {
  text: string;
  dueAt: string | null;
};

export function ItemEditor({
  item,
  saving,
  onSave,
  onCancel,
  onDelete,
}: {
  item: Item;
  saving: boolean;
  onSave: (draft: ItemDraft) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [text, setText] = useState(item.text);
  const [dueAt, setDueAt] = useState<string | null>(item.dueAt);
  const [pickerOpen, setPickerOpen] = useState(false);
  const canSave = text.trim().length > 0 && !saving;

  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <IconButton
          name="trash"
          tone="danger"
          size={32}
          accessibilityLabel="Delete item"
          onPress={() => {
            if (saving) return;
            onDelete();
          }}
        />
      </View>
      <EditableItemFields
        text={text}
        onChangeText={setText}
        dueAt={dueAt}
        onChangeDue={setDueAt}
        pickerOpen={pickerOpen}
        onOpenPicker={() => setPickerOpen(true)}
        onClosePicker={() => setPickerOpen(false)}
        autoFocus
      />
      <PrimaryButton
        label="Save"
        loading={saving}
        disabled={!canSave}
        onPress={() => onSave({ text: text.trim(), dueAt })}
      />
      <TextButton label="Cancel" tone="secondary" onPress={onCancel} disabled={saving} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 18,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
