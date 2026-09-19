import { Theme } from '@/constants/theme';
import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.color.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.color.border,
    padding: Theme.space.md,
    ...Theme.shadow.card,
  },
});
