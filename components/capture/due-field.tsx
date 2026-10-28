import { TimeChips } from '@/components/capture/time-chips';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Theme } from '@/constants/theme';
import {
  applyPickedLocalTime,
  applyPresetLocalTime,
  defaultDueOnLocalDay,
  localDayFromDateInput,
  moveDueToLocalDay,
  pickerDateForDue,
  toLocalDateInputValue,
  type TimePresetId,
} from '@/lib/due';
import { categoryChipSharesDueRow } from '@/lib/due-layout';
import {
  formatDue,
  formatDueDay,
  formatDueTime,
  fromDateTimeLocalValue,
  fromLocalTimeInputValue,
  toDateTimeLocalValue,
  toLocalTimeInputValue,
} from '@/lib/format';
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
  timeChips = 'off',
  chipsOpen = false,
  onToggleChips,
  suggested = false,
  showSuggested = false,
  onCommitTime,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
  /** Parent mounts at most one native picker so a change cannot write every row. */
  pickerOpen?: boolean;
  onOpenPicker?: () => void;
  onClosePicker?: () => void;
  /** Review Move always keeps a day, so the clear control stays hidden. */
  allowClear?: boolean;
  /** Confirm / Ask: category chip sits on its own line under the date row. */
  accessory?: React.ReactNode;
  /** Confirm toggles a chip row; the edit sheet keeps it expanded. */
  timeChips?: 'off' | 'toggle' | 'always';
  chipsOpen?: boolean;
  onToggleChips?: () => void;
  suggested?: boolean;
  /** Capture confirm and Ask edit cards. Not Today, All items, or Ask done. */
  showSuggested?: boolean;
  onCommitTime?: () => void;
}) {
  const [picking, setPicking] = useState<'date' | 'time' | null>(null);
  const [timeDraft, setTimeDraft] = useState<Date | null>(null);
  const chipsEnabled = timeChips !== 'off';

  useEffect(() => {
    if (pickerOpen) {
      setPicking((current) => current ?? 'date');
    } else {
      setPicking(null);
      setTimeDraft(null);
    }
  }, [pickerOpen]);

  const pickerValue = timeDraft ?? pickerDateForDue(value);
  const label = formatDue(value) ?? 'No date';
  const dayLabel = formatDueDay(value) ?? 'No date';
  const timeLabel = formatDueTime(value);
  const showTime = Boolean(value && chipsEnabled);
  const showSuggestedLabel = Boolean(showSuggested && suggested && timeLabel);
  const showChipRow = Boolean(value && chipsEnabled);

  const commitTime = (next: string) => {
    onChange(next);
    onCommitTime?.();
  };

  const closePicker = () => {
    setPicking(null);
    setTimeDraft(null);
    onClosePicker?.();
  };

  const openPicker = (mode: 'date' | 'time') => {
    setPicking(mode);
    if (mode === 'time') setTimeDraft(pickerDateForDue(value));
    onOpenPicker?.();
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

    if (chipsEnabled && picking === 'time') {
      if (Platform.OS === 'android') {
        commitTime(applyPickedLocalTime(value, date));
        closePicker();
        return;
      }
      setTimeDraft(date);
      return;
    }

    if (Platform.OS === 'android') {
      if (picking === 'date') {
        onChange(moveDueToLocalDay(value, date));
        if (chipsEnabled) {
          closePicker();
          return;
        }
        setPicking('time');
        return;
      }
      onChange(applyPickedLocalTime(value, date));
      closePicker();
      return;
    }

    if (chipsEnabled && picking === 'date') {
      onChange(moveDueToLocalDay(value, date));
      return;
    }

    onChange(date.toISOString());
  };

  const onAddOrEdit = () => {
    haptics.light();
    if (Platform.OS === 'web') return;
    if (!value) {
      // Explicit tap to add a date. 11:59 PM until they pick a time.
      onChange(defaultDueOnLocalDay(new Date()));
    }
    setPicking('date');
    onOpenPicker?.();
  };

  const onToggleTime = () => {
    if (timeChips !== 'toggle' || !value) return;
    haptics.light();
    if (pickerOpen) closePicker();
    onToggleChips?.();
  };

  const onSelectPreset = (preset: { id: TimePresetId; hours: number; minutes: number }) => {
    commitTime(applyPresetLocalTime(value, preset.hours, preset.minutes));
    if (timeChips === 'toggle') onToggleChips?.();
  };

  const onPickTime = () => {
    if (Platform.OS === 'web') {
      setPicking('time');
      onOpenPicker?.();
      return;
    }
    openPicker('time');
  };

  const onClear = () => {
    haptics.light();
    closePicker();
    if (timeChips === 'toggle' && chipsOpen) onToggleChips?.();
    onChange(null);
  };

  const onSetTime = () => {
    if (timeDraft) commitTime(applyPickedLocalTime(value, timeDraft));
    else onCommitTime?.();
    closePicker();
  };

  const timeAccessibilityLabel = showSuggestedLabel
    ? `${timeLabel}, suggested time. Double-tap to change.`
    : `${timeLabel}. Double-tap to change.`;

  const clearControl =
    value && allowClear ? (
      <Pressable accessibilityRole="button" accessibilityLabel="Clear due date" onPress={onClear} hitSlop={8}>
        <Text style={styles.clear}>Clear</Text>
      </Pressable>
    ) : null;

  const accessoryNode = accessory ? <View style={styles.accessory}>{accessory}</View> : null;
  const stackAccessory = Boolean(accessory) && !categoryChipSharesDueRow();

  const suggestedMarks =
    showSuggestedLabel && timeLabel ? (
      <>
        <Text style={styles.metaSep}> · </Text>
        <Text style={styles.suggested}>Suggested</Text>
      </>
    ) : null;

  if (Platform.OS === 'web' && !accessory && !chipsEnabled) {
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

  const dueChip = chipsEnabled ? (
    <View style={[styles.chip, accessory ? styles.chipCompact : null, styles.chipSplit]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value ? `Due ${dayLabel}. Edit date` : 'Add due date'}
        onPress={onAddOrEdit}
        style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
      >
        <IconSymbol name="calendar" size={16} color={Theme.color.accent} />
        {Platform.OS === 'web' ? (
          <input
            aria-label="Due date"
            type="date"
            value={toLocalDateInputValue(value)}
            onChange={(event) => {
              const day = localDayFromDateInput(event.target.value);
              if (day) onChange(moveDueToLocalDay(value, day));
            }}
            style={webOverlayStyle}
          />
        ) : null}
      </Pressable>
      {showTime && timeLabel ? (
        timeChips === 'toggle' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={timeAccessibilityLabel}
            onPress={onToggleTime}
            style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
          >
            <Text style={styles.chipLabel} numberOfLines={1}>
              {dayLabel}
              <Text style={styles.chipLabel}> · </Text>
              {timeLabel}
            </Text>
            {suggestedMarks}
          </Pressable>
        ) : (
          <View style={[styles.hit, styles.hitStatic]}>
            <Text style={styles.chipLabel} numberOfLines={1}>
              {dayLabel}
              <Text style={styles.chipLabel}> · </Text>
              {timeLabel}
            </Text>
          </View>
        )
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add due date"
          onPress={onAddOrEdit}
          style={({ pressed }) => [styles.hit, pressed && styles.pressed]}
        >
          <Text style={[styles.chipLabel, styles.undated]}>No date</Text>
        </Pressable>
      )}
    </View>
  ) : (
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

  const nativePicker =
    Platform.OS !== 'web' && pickerOpen ? (
      <View>
        <DateTimePicker
          value={pickerValue}
          mode={
            picking === 'time'
              ? 'time'
              : chipsEnabled || Platform.OS !== 'ios'
                ? 'date'
                : 'datetime'
          }
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onNativeChange}
        />
        {Platform.OS === 'ios' ? (
          <View style={styles.pickerActions}>
            {chipsEnabled && picking === 'time' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                onPress={closePicker}
                style={({ pressed }) => [styles.set, pressed && styles.pressed]}
              >
                <Text style={styles.clear}>Cancel</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={picking === 'time' ? 'Set time' : 'Set due date'}
              onPress={picking === 'time' && chipsEnabled ? onSetTime : closePicker}
              style={({ pressed }) => [styles.set, pressed && styles.pressed]}
            >
              <Text style={styles.setLabel}>Set</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    ) : null;

  const webTimePicker =
    Platform.OS === 'web' && pickerOpen && picking === 'time' ? (
      <input
        aria-label="Due time"
        type="time"
        value={toLocalTimeInputValue(value)}
        onChange={(event) => {
          const next = fromLocalTimeInputValue(value, event.target.value);
          if (next) commitTime(next);
        }}
        style={webTimeInputStyle}
      />
    ) : null;

  return (
    <View>
      <View style={[styles.row, stackAccessory ? styles.rowShare : null]}>
        {stackAccessory ? (
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
      {showChipRow ? (
        <TimeChips
          dueAt={value}
          open={chipsOpen}
          always={timeChips === 'always'}
          onSelectPreset={onSelectPreset}
          onPickTime={onPickTime}
        />
      ) : null}
      {nativePicker}
      {webTimePicker}
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

const webTimeInputStyle: React.CSSProperties = {
  marginTop: 8,
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
    flexDirection: 'column',
    alignItems: 'flex-start',
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
  chipSplit: {
    gap: 0,
    paddingVertical: 0,
    paddingHorizontal: 4,
  },
  hit: {
    position: 'relative',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  hitStatic: {
    paddingHorizontal: 4,
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
  metaSep: {
    fontSize: Theme.type.caption,
    fontWeight: '400',
    color: Theme.color.textSecondary,
  },
  suggested: {
    fontSize: 12,
    fontWeight: '500',
    color: Theme.color.accent,
    opacity: 0.75,
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
  pickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
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
