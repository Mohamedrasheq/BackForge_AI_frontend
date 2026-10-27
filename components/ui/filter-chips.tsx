import { Theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function FilterChip({
  label,
  active,
  disabled = false,
  allowReselect = false,
  onPress,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  /** Time chips still fire when the preset already matches. */
  allowReselect?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        if (active && !allowReselect) return;
        haptics.selection();
        onPress();
      }}
      style={({ pressed }) => [
        chipStyles.chip,
        active ? chipStyles.chipActive : chipStyles.chipIdle,
        disabled && chipStyles.chipDisabled,
        pressed && !disabled && chipStyles.pressed,
      ]}
    >
      <Text style={[chipStyles.label, active ? chipStyles.labelActive : chipStyles.labelIdle]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function FilterChips<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={chipStyles.row}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <FilterChip
            key={option.value}
            label={option.label}
            active={active}
            onPress={() => onChange(option.value)}
          />
        );
      })}
    </View>
  );
}

export const chipStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Theme.space.sm,
    marginBottom: Theme.space.md,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: Theme.radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  chipActive: {
    backgroundColor: Theme.color.accentSoft,
    borderColor: Theme.color.accent,
  },
  chipIdle: {
    backgroundColor: Theme.color.card,
    borderColor: Theme.color.border,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    fontSize: Theme.type.label,
    fontWeight: '600',
  },
  labelActive: {
    color: Theme.color.accent,
  },
  labelIdle: {
    color: Theme.color.textSecondary,
  },
});
