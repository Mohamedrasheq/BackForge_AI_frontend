import { DueField } from '@/components/capture/due-field';
import { Theme } from '@/constants/theme';
import React from 'react';
import { Platform, StyleSheet, TextInput, type TextStyle } from 'react-native';

/**
 * The text + due controls from Capture Confirm, shared so saved-item edit feels the same.
 */
export function EditableItemFields({
  text,
  onChangeText,
  dueAt,
  onChangeDue,
  pickerOpen,
  onOpenPicker,
  onClosePicker,
  autoFocus = false,
  compact = false,
  dueAccessory,
}: {
  text: string;
  onChangeText: (text: string) => void;
  dueAt: string | null;
  onChangeDue: (dueAt: string | null) => void;
  pickerOpen: boolean;
  onOpenPicker: () => void;
  onClosePicker: () => void;
  autoFocus?: boolean;
  /** Confirm cards: title hugs one line so metadata can sit 12pt below. */
  compact?: boolean;
  /** Sits on the due row (category chip on Confirm). */
  dueAccessory?: React.ReactNode;
}) {
  return (
    <>
      <TextInput
        value={text}
        onChangeText={onChangeText}
        placeholder="Item"
        placeholderTextColor={Theme.color.textTertiary}
        selectionColor={Theme.color.accent}
        cursorColor={Theme.color.accent}
        style={[
          styles.body,
          compact && styles.bodyCompact,
          compact && Platform.OS === 'web' ? webCompactInput : null,
        ]}
        multiline
        numberOfLines={compact && Platform.OS === 'web' ? 1 : undefined}
        scrollEnabled={!compact}
        textAlignVertical="top"
        autoFocus={autoFocus}
      />
      <DueField
        value={dueAt}
        pickerOpen={pickerOpen}
        onOpenPicker={onOpenPicker}
        onClosePicker={onClosePicker}
        onChange={onChangeDue}
        accessory={dueAccessory}
      />
    </>
  );
}

const webCompactInput = {
  fieldSizing: 'content',
  height: 'auto',
} as TextStyle;

const styles = StyleSheet.create({
  body: {
    minHeight: 72,
    fontSize: 18,
    lineHeight: 26,
    color: Theme.color.text,
    fontWeight: '600',
    letterSpacing: -0.2,
    padding: 0,
  },
  bodyCompact: {
    minHeight: 26,
  },
});
