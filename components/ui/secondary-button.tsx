import { Theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export function SecondaryButton({
  label,
  onPress,
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        if (disabled || loading) return;
        haptics.light();
        onPress();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled ? styles.pressed : null,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={Theme.color.accent} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.color.card,
    borderWidth: 1,
    borderColor: Theme.color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: Theme.color.accentSoft,
    borderColor: Theme.color.accent,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    color: Theme.color.accent,
    fontSize: Theme.type.label,
    fontWeight: '600',
  },
});
