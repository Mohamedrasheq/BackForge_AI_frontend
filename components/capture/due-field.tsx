import { IconSymbol } from '@/components/ui/icon-symbol';
import { Theme } from '@/constants/theme';
import { formatDue, fromDateTimeLocalValue, toDateTimeLocalValue } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export function DueField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
}) {
  const [picking, setPicking] = useState<'date' | 'time' | null>(null);

  const parsed = value ? new Date(value) : null;
  const validDate = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  const label = formatDue(value) ?? 'No date';

  const commit = (next: Date) => {
    onChange(next.toISOString());
  };

  const onNativeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed') {
      setPicking(null);
      return;
    }
    if (!date) {
      setPicking(null);
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
      setPicking(null);
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
  };

  const onClear = () => {
    haptics.light();
    setPicking(null);
    onChange(null);
  };

  if (Platform.OS === 'web') {
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
        {value ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear due date" onPress={onClear} hitSlop={8}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        ) : (
          <Text style={styles.hint}>No date</Text>
        )}
      </View>
    );
  }

  return (
    <View>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={value ? `Due ${label}. Edit date` : 'Add due date'}
          onPress={onAddOrEdit}
          style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
        >
          <IconSymbol name="calendar" size={16} color={Theme.color.accent} />
          <Text style={[styles.chipLabel, !value && styles.undated]}>{label}</Text>
        </Pressable>
        {value ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear due date" onPress={onClear} hitSlop={8}>
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      {picking ? (
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
              accessibilityLabel="Done editing due date"
              onPress={() => setPicking(null)}
              style={({ pressed }) => [styles.done, pressed && styles.pressed]}
            >
              <Text style={styles.doneLabel}>Done</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

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
  pressed: {
    opacity: 0.7,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.color.accent,
  },
  undated: {
    color: Theme.color.textSecondary,
    fontWeight: '500',
  },
  clear: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.color.textSecondary,
  },
  hint: {
    fontSize: 13,
    color: Theme.color.textTertiary,
  },
  done: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  doneLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.color.accent,
  },
});
