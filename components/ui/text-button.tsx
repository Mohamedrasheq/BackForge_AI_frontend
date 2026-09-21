import { Theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

export function TextButton({
  label,
  onPress,
  disabled,
  tone = 'accent',
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'accent' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
}) {
  const color =
    tone === 'danger'
      ? Theme.color.danger
      : tone === 'secondary'
        ? Theme.color.textSecondary
        : Theme.color.accent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        if (disabled) return;
        haptics.light();
        onPress();
      }}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    paddingVertical: Theme.space.sm,
    paddingHorizontal: Theme.space.md,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: Theme.type.label,
    fontWeight: '600',
  },
});
