import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { Theme } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  tone = 'accent',
  size = 36,
  disabled = false,
}: {
  name: IconSymbolName;
  onPress: () => void;
  accessibilityLabel: string;
  /** `filled`: solid accent circle with a white icon, solid grey while disabled. */
  tone?: 'accent' | 'danger' | 'filled';
  size?: number;
  disabled?: boolean;
}) {
  const danger = tone === 'danger';
  const filled = tone === 'filled';
  const iconColor = filled
    ? disabled
      ? Theme.color.textTertiary
      : Theme.color.white
    : danger
      ? Theme.color.danger
      : Theme.color.accent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        filled
          ? disabled
            ? styles.filledDisabled
            : pressed
              ? styles.filledPressed
              : styles.filled
          : danger
            ? styles.danger
            : styles.accent,
        disabled && !filled && styles.disabled,
        pressed && !disabled && !filled && styles.pressed,
      ]}
    >
      <IconSymbol
        name={name}
        size={Math.round(size * 0.5)}
        color={iconColor}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  accent: {
    backgroundColor: Theme.color.accentSoft,
  },
  danger: {
    backgroundColor: Theme.color.dangerSoft,
  },
  filled: {
    backgroundColor: Theme.color.accent,
  },
  filledPressed: {
    backgroundColor: Theme.color.accentPressed,
  },
  filledDisabled: {
    backgroundColor: Theme.color.border,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
});
