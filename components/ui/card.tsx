import { cardSurface, Theme } from '@/constants/theme';
import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export function Card({
  children,
  style,
  accessibilityLiveRegion,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Android announces new answer cards. */
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
  accessibilityLabel?: string;
}) {
  return (
    <View
      style={[styles.card, style]}
      accessibilityLiveRegion={accessibilityLiveRegion}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardSurface,
    padding: Theme.space.md,
  },
});
