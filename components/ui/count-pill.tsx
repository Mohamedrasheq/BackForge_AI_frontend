import { Theme } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function CountPill({ label }: { label: string }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.color.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: Theme.color.accent,
    fontWeight: '700',
    fontSize: Theme.type.caption,
  },
});
