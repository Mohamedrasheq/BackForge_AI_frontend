import { cardSurface, Theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
            onPress={() => {
              if (active) return;
              haptics.selection();
              onChange(option.value);
            }}
            style={({ pressed }) => [
              styles.segment,
              active && styles.segmentActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, active ? styles.labelActive : styles.labelIdle]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    ...cardSurface,
    flexDirection: 'row',
    marginHorizontal: Theme.space.screenX,
    marginBottom: Theme.space.md,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 36,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: Theme.color.accentSoft,
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
