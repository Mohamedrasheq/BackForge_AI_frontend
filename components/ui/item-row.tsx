import { IconSymbol } from '@/components/ui/icon-symbol';
import { cardSurface, Theme } from '@/constants/theme';
import {
  isBeforeLocalToday,
  localDayFromDateInput,
  moveDueToLocalDay,
  toLocalDateInputValue,
} from '@/lib/due';
import { formatDue } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import type { Item } from '@/types/api';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export function ItemRow({
  item,
  onDone,
  onReschedule,
  rescheduling = false,
  datePickerOpen = false,
  onOpenDatePicker,
  onCloseDatePicker,
}: {
  item: Item;
  onDone?: (item: Item) => void;
  /** Incomplete items only. Parent should omit this on done rows. */
  onReschedule?: (item: Item, dueAt: string) => void;
  rescheduling?: boolean;
  datePickerOpen?: boolean;
  onOpenDatePicker?: () => void;
  onCloseDatePicker?: () => void;
}) {
  const done = item.status === 'done';
  const due = formatDue(item.dueAt);
  const overdue = item.status === 'open' && isBeforeLocalToday(item.dueAt);
  const canMove = !done && Boolean(onReschedule);
  const [draft, setDraft] = useState<Date | null>(null);

  useEffect(() => {
    if (!datePickerOpen) {
      setDraft(null);
      return;
    }
    const parsed = item.dueAt ? new Date(item.dueAt) : new Date();
    setDraft(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
  }, [datePickerOpen, item.dueAt]);

  const commitDay = (day: Date) => {
    if (!onReschedule || rescheduling) return;
    const next = moveDueToLocalDay(item.dueAt, day);
    onCloseDatePicker?.();
    if (item.dueAt && new Date(item.dueAt).getTime() === new Date(next).getTime()) return;
    haptics.light();
    onReschedule(item, next);
  };

  const onNativeChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed' || !date) {
      onCloseDatePicker?.();
      return;
    }
    if (Platform.OS === 'android') {
      commitDay(date);
      return;
    }
    setDraft(date);
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={done ? 'Completed' : 'Mark done'}
        disabled={done || !onDone || rescheduling}
        onPress={() => {
          if (done || !onDone || rescheduling) return;
          haptics.success();
          onDone(item);
        }}
        hitSlop={8}
        style={({ pressed }) => [styles.checkWrap, pressed && !done && styles.pressed]}
      >
        <IconSymbol
          name={done ? 'checkmark.circle.fill' : 'circle'}
          size={26}
          color={done ? Theme.color.success : Theme.color.textTertiary}
        />
      </Pressable>
      <View style={styles.body}>
        <Text style={[styles.title, done && styles.titleDone]}>{item.text}</Text>
        {due ? <Text style={styles.due}>{due}</Text> : null}
        {canMove ? (
          <View style={styles.actions}>
            {overdue ? <Text style={styles.overdue}>Overdue</Text> : null}
            {Platform.OS === 'web' ? (
              <View style={[styles.dateChip, rescheduling && styles.disabled]}>
                <IconSymbol name="calendar" size={14} color={Theme.color.textTertiary} />
                <input
                  aria-label="Choose date"
                  type="date"
                  disabled={rescheduling}
                  value={item.dueAt ? toLocalDateInputValue(item.dueAt) : ''}
                  onChange={(event) => {
                    const day = localDayFromDateInput(event.target.value);
                    if (day) commitDay(day);
                  }}
                  style={webDateStyle}
                />
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose date"
                disabled={rescheduling}
                onPress={() => {
                  if (rescheduling) return;
                  haptics.light();
                  onOpenDatePicker?.();
                }}
                style={({ pressed }) => [
                  styles.dateChip,
                  rescheduling && styles.disabled,
                  pressed && !rescheduling && styles.pressed,
                ]}
              >
                <IconSymbol name="calendar" size={14} color={Theme.color.textTertiary} />
                <Text style={styles.dateLabel}>Date</Text>
              </Pressable>
            )}
          </View>
        ) : null}
        {canMove && datePickerOpen && Platform.OS !== 'web' ? (
          <View style={styles.picker}>
            <DateTimePicker
              value={draft ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onNativeChange}
            />
            {Platform.OS === 'ios' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Done choosing date"
                onPress={() => {
                  const selected = draft ?? (item.dueAt ? new Date(item.dueAt) : new Date());
                  commitDay(Number.isNaN(selected.getTime()) ? new Date() : selected);
                }}
                style={({ pressed }) => [styles.done, pressed && styles.pressed]}
              >
                <Text style={styles.doneLabel}>Done</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const webDateStyle: React.CSSProperties = {
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: Theme.color.textSecondary,
  fontSize: 13,
  fontWeight: '500',
  fontFamily: 'inherit',
};

const styles = StyleSheet.create({
  row: {
    ...cardSurface,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: Theme.space.md,
  },
  checkWrap: {
    paddingTop: 1,
  },
  pressed: {
    opacity: 0.6,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: Theme.type.itemTitle,
    lineHeight: 24,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: Theme.color.text,
  },
  titleDone: {
    color: Theme.color.textTertiary,
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  due: {
    marginTop: 4,
    fontSize: Theme.type.caption,
    lineHeight: 18,
    fontWeight: '400',
    color: Theme.color.textSecondary,
  },
  actions: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  overdue: {
    overflow: 'hidden',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.color.dangerSoft,
    fontSize: Theme.type.caption,
    lineHeight: 18,
    fontWeight: '600',
    color: Theme.color.danger,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Theme.radius.full,
    borderWidth: 1,
    borderColor: Theme.color.border,
    backgroundColor: 'transparent',
  },
  dateLabel: {
    fontSize: Theme.type.caption,
    fontWeight: '500',
    color: Theme.color.textSecondary,
  },
  disabled: {
    opacity: 0.45,
  },
  picker: {
    marginTop: 8,
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
