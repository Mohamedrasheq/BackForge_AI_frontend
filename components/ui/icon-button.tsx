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
  tone?: 'accent' | 'danger';
  size?: number;
  disabled?: boolean;
}) {
  const danger = tone === 'danger';

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
        danger ? styles.danger : styles.accent,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <IconSymbol
        name={name}
        size={Math.round(size * 0.5)}
        color={danger ? Theme.color.danger : Theme.color.accent}
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
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.45,
  },
});
