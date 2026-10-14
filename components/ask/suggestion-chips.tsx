import { chipStyles } from '@/components/ui/filter-chips';
import { Theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

export function SuggestionChips({
  suggestions,
  onPick,
  disabled = false,
}: {
  suggestions: readonly string[];
  onPick: (suggestion: string) => void;
  disabled?: boolean;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.row}
    >
      {suggestions.map((suggestion) => (
        <Pressable
          key={suggestion}
          accessibilityRole="button"
          accessibilityLabel={suggestion}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={() => {
            if (disabled) return;
            haptics.selection();
            onPick(suggestion);
          }}
          style={({ pressed }) => [
            chipStyles.chip,
            chipStyles.chipIdle,
            pressed && chipStyles.pressed,
            disabled && styles.disabled,
          ]}
        >
          <Text style={[chipStyles.label, chipStyles.labelIdle]}>{suggestion}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Theme.space.sm,
    paddingHorizontal: Theme.space.screenX,
  },
  disabled: {
    opacity: 0.45,
  },
});
