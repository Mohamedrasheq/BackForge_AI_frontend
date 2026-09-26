import { IconSymbol } from '@/components/ui/icon-symbol';
import { Theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function CategoryChip({
  label,
  assigned = true,
  hint,
  onPress,
}: {
  label: string;
  /** False when the row is Unfiled and the chip is there so it can be changed. */
  assigned?: boolean;
  /** Short suffix such as "New" for a category that will be created on confirm. */
  hint?: string;
  onPress?: () => void;
}) {
  const quiet = !assigned;
  const color = quiet ? Theme.color.textSecondary : Theme.color.accent;
  const accessibleName = hint ? `Category ${label}, ${hint}` : `Category ${label}`;

  const content = (
    <>
      <IconSymbol name="tag" size={14} color={quiet ? Theme.color.textTertiary : Theme.color.accent} />
      <Text style={[styles.label, quiet ? styles.labelQuiet : styles.labelSet]} numberOfLines={1}>
        {label}
      </Text>
      {hint ? <Text style={[styles.hint, quiet ? styles.hintQuiet : styles.hintSet]}>{hint}</Text> : null}
      {onPress ? <IconSymbol name="chevron.down" size={14} color={color} /> : null}
    </>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={accessibleName} style={[styles.chip, styles.chipSet]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${accessibleName}. Change category`}
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
  hint: {
    flexShrink: 0,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  hintSet: {
    color: Theme.color.accent,
  },
  hintQuiet: {
    color: Theme.color.textSecondary,
    fontWeight: '600',
  },
});
