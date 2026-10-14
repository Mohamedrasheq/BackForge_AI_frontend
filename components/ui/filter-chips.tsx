import { Theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            onPress={() => {
              if (active) return;
              haptics.selection();
              onChange(option.value);
            }}
            style={({ pressed }) => [
              chipStyles.chip,
              active ? chipStyles.chipActive : chipStyles.chipIdle,
              pressed && chipStyles.pressed,
            ]}
          >
            <Text style={[chipStyles.label, active ? chipStyles.labelActive : chipStyles.labelIdle]}>
              {option.label}
            </Text>
          </Pressable>
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
  },
  chipActive: {
    backgroundColor: Theme.color.accentSoft,
    borderColor: Theme.color.accent,
  },
  chipIdle: {
    backgroundColor: Theme.color.card,
    borderColor: Theme.color.border,
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
