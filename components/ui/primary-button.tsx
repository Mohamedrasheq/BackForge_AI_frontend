import { Theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export function PrimaryButton({
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
        <View style={styles.loading}>
          <ActivityIndicator color={Theme.color.white} />
          <Text style={styles.label}>{label}</Text>
        </View>
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: Theme.color.accentPressed,
  },
  disabled: {
    opacity: 0.45,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    color: Theme.color.white,
    fontSize: Theme.type.body,
    fontWeight: '600',
  },
});
