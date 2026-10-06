import { ItemEditor, type ItemDraft } from '@/components/items/item-editor';
import { ItemRow } from '@/components/ui/item-row';
import { categoryLabelForItem } from '@/lib/categories';
import type { Category, Item } from '@/types/api';
import React from 'react';

/**
 * All-items row: editor, or ItemRow with the same done / date / edit / delete wiring.
 * Category detail uses this so Open and Done behave like All items.
 */
export function EditableItemRow({
  item,
  categories,
  editing,
  saving,
  movingId,
  datePickerId,
  onDone,
  onReschedule,
  onOpenDatePicker,
  onCloseDatePicker,
  onEdit,
  onSave,
  onCancelEdit,
  onEditorDelete,
  onRowDelete,
}: {
  item: Item;
  categories: Category[];
  editing: boolean;
  saving: boolean;
  movingId: string | null;
  datePickerId: string | null;
  onDone: (item: Item) => void;
  onReschedule: (item: Item, dueAt: string) => void;
  onOpenDatePicker: (id: string) => void;
  onCloseDatePicker: (id: string) => void;
  onEdit: (item: Item) => void;
  onSave: (id: string, draft: ItemDraft) => void;
  onCancelEdit: () => void;
  /** Trash inside the editor. Does not clear the edit session. */
  onEditorDelete: () => void;
  onRowDelete: (item: Item) => void;
}) {
  if (editing) {
    return (
      <ItemEditor
        key={item.id}
        item={item}
        saving={saving}
        onSave={(draft) => onSave(item.id, draft)}
        onCancel={() => {
          if (saving) return;
          onCancelEdit();
        }}
        onDelete={() => {
          if (saving) return;
          onEditorDelete();
        }}
      />
    );
  }

  const open = item.status === 'open';

  return (
    <ItemRow
      item={item}
      categoryLabel={open ? categoryLabelForItem(item, categories) : null}
      onDone={open ? onDone : undefined}
      onReschedule={open ? onReschedule : undefined}
      rescheduling={movingId === item.id}
      datePickerOpen={datePickerId === item.id}
      onOpenDatePicker={() => onOpenDatePicker(item.id)}
      onCloseDatePicker={() => onCloseDatePicker(item.id)}
      onEdit={onEdit}
      onDelete={onRowDelete}
    />
  );
}
