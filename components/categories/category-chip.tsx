import { IconSymbol } from '@/components/ui/icon-symbol';
import { Theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function CategoryChip({
  label,
  assigned = true,
  onPress,
}: {
  label: string;
  /** False when the row is Unfiled and the chip is there so it can be changed. */
  assigned?: boolean;
  onPress?: () => void;
}) {
  const quiet = !assigned;
  const color = quiet ? Theme.color.textSecondary : Theme.color.accent;

  const content = (
    <>
      <IconSymbol name="tag" size={14} color={quiet ? Theme.color.textTertiary : Theme.color.accent} />
      <Text style={[styles.label, quiet ? styles.labelQuiet : styles.labelSet]} numberOfLines={1}>
        {label}
      </Text>
      {onPress ? <IconSymbol name="chevron.down" size={14} color={color} /> : null}
    </>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={`Category ${label}`} style={[styles.chip, styles.chipSet]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Category ${label}. Change category`}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={({ pressed }) => [
        styles.chip,
        quiet ? styles.chipQuiet : styles.chipSet,
        pressed && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '100%',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Theme.radius.full,
    borderWidth: 1,
  },
  chipSet: {
    backgroundColor: Theme.color.accentSoft,
    borderColor: 'transparent',
  },
  chipQuiet: {
    backgroundColor: 'transparent',
    borderColor: Theme.color.border,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    flexShrink: 1,
    fontSize: Theme.type.caption,
    lineHeight: 18,
    fontWeight: '600',
  },
  labelSet: {
    color: Theme.color.accent,
  },
  labelQuiet: {
    color: Theme.color.textSecondary,
    fontWeight: '500',
  },
});
