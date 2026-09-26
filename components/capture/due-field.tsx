import { IconSymbol } from '@/components/ui/icon-symbol';
import { Theme } from '@/constants/theme';
import { formatDue, fromDateTimeLocalValue, toDateTimeLocalValue } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export function DueField({
  value,
  onChange,
  pickerOpen = false,
  onOpenPicker,
  onClosePicker,
  allowClear = true,
  accessory,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
  /** Parent mounts at most one native picker so a change cannot write every row. */
  pickerOpen?: boolean;
  onOpenPicker?: () => void;
  onClosePicker?: () => void;
  /** Review Move always keeps a day, so the clear control stays hidden. */
  allowClear?: boolean;
  /** Confirm: category chip shares the due row when the card is wide enough. */
  accessory?: React.ReactNode;
}) {
  const [picking, setPicking] = useState<'date' | 'time' | null>(null);

  useEffect(() => {
    if (pickerOpen) {
      setPicking((current) => current ?? 'date');
    } else {
      setPicking(null);
    }
  }, [pickerOpen]);

  const parsed = value ? new Date(value) : null;
  const validDate = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  const label = formatDue(value) ?? 'No date';

  const commit = (next: Date) => {
    onChange(next.toISOString());
  };

  const closePicker = () => {
    setPicking(null);
    onClosePicker?.();
  };

  const onNativeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed') {
      closePicker();
      return;
    }
    if (!date) {
      closePicker();
      return;
    }

    if (Platform.OS === 'android') {
      if (picking === 'date') {
        const next = validDate ? new Date(validDate) : new Date();
        next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        commit(next);
        setPicking('time');
        return;
      }
      const next = validDate ? new Date(validDate) : new Date();
      next.setHours(date.getHours(), date.getMinutes(), 0, 0);
      commit(next);
      closePicker();
      return;
    }

    commit(date);
  };

  const onAddOrEdit = () => {
    haptics.light();
    if (Platform.OS === 'web') return;
    if (!value) {
      // Explicit tap to add a date — do not invent one during parse/save.
      commit(new Date());
    }
    setPicking('date');
    onOpenPicker?.();
  };

  const onClear = () => {
    haptics.light();
    closePicker();
    onChange(null);
  };

  const clearControl =
    value && allowClear ? (
      <Pressable accessibilityRole="button" accessibilityLabel="Clear due date" onPress={onClear} hitSlop={8}>
        <Text style={styles.clear}>Clear</Text>
      </Pressable>
    ) : null;

  const accessoryNode = accessory ? <View style={styles.accessory}>{accessory}</View> : null;

  if (Platform.OS === 'web' && !accessory) {
    return (
      <View style={styles.row}>
        <IconSymbol name="calendar" size={16} color={Theme.color.textSecondary} />
        <input
          aria-label="Due date"
          type="datetime-local"
          value={toDateTimeLocalValue(value)}
          onChange={(event) => onChange(fromDateTimeLocalValue(event.target.value))}
          style={webInputStyle}
        />
        {clearControl}
        {!value ? <Text style={styles.hint}>No date</Text> : null}
      </View>
    );
  }

  const dueChip = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `Due ${label}. Edit date` : 'Add due date'}
      onPress={onAddOrEdit}
      style={({ pressed }) => [styles.chip, accessory ? styles.chipCompact : null, pressed && styles.pressed]}
    >
      <IconSymbol name="calendar" size={16} color={Theme.color.accent} />
      <Text style={[styles.chipLabel, !value && styles.undated]} numberOfLines={accessory ? 1 : undefined}>
        {label}
      </Text>
      {Platform.OS === 'web' ? (
        <input
          aria-label="Due date"
          type="datetime-local"
          value={toDateTimeLocalValue(value)}
          onChange={(event) => onChange(fromDateTimeLocalValue(event.target.value))}
          style={webOverlayStyle}
        />
      ) : null}
    </Pressable>
  );

  return (
    <View>
      <View style={[styles.row, accessory ? styles.rowShare : null]}>
        {accessory ? (
          <View style={styles.cluster}>
            {dueChip}
            {clearControl}
          </View>
        ) : (
          <>
            {dueChip}
            {clearControl}
          </>
        )}
        {accessoryNode}
      </View>
      {Platform.OS !== 'web' && pickerOpen ? (
        <View>
          <DateTimePicker
            value={validDate ?? new Date()}
            mode={picking === 'time' ? 'time' : Platform.OS === 'ios' ? 'datetime' : 'date'}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onNativeChange}
          />
          {Platform.OS === 'ios' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Set due date"
              onPress={closePicker}
              style={({ pressed }) => [styles.set, pressed && styles.pressed]}
            >
              <Text style={styles.setLabel}>Set</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const webOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  opacity: 0,
  cursor: 'pointer',
  border: 'none',
  background: 'transparent',
};

const webInputStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: Theme.color.text,
  fontSize: 14,
  fontFamily: 'inherit',
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 32,
  },
  rowShare: {
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  cluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    maxWidth: '100%',
  },
  accessory: {
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.color.accentSoft,
    maxWidth: '100%',
  },
  chipCompact: {
    position: 'relative',
    paddingHorizontal: 8,
    flexShrink: 1,
    minWidth: 0,
  },
  pressed: {
    opacity: 0.7,
  },
  chipLabel: {
    fontSize: Theme.type.caption,
    fontWeight: '600',
    color: Theme.color.accent,
  },
  undated: {
    color: Theme.color.textSecondary,
    fontWeight: '500',
  },
  clear: {
    fontSize: Theme.type.caption,
    fontWeight: '600',
    color: Theme.color.textSecondary,
  },
  hint: {
    fontSize: Theme.type.caption,
    color: Theme.color.textTertiary,
  },
  set: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  setLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.color.accent,
  },
});
