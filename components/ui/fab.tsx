import { IconSymbol } from '@/components/ui/icon-symbol';
import { Theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

export function CaptureFab() {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Capture"
      onPress={() => {
        haptics.medium();
        router.push('/(tabs)/capture');
      }}
      style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
    >
      <IconSymbol name="plus" size={28} color={Theme.color.white} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: Theme.space.lg,
    bottom: Theme.space.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.fab,
  },
  pressed: {
    backgroundColor: Theme.color.accentPressed,
  },
});
