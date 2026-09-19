import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { Theme } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: IconSymbolName;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <IconSymbol name={icon} size={28} color={Theme.color.accent} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: Theme.space.xl,
    paddingVertical: Theme.space.xxl,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.color.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.space.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.color.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  description: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: Theme.color.textSecondary,
    textAlign: 'center',
  },
});
