import { Theme } from '@/constants/theme';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

export function ScreenHeader({
  title,
  subtitle,
  large = false,
  right,
}: {
  title: string;
  subtitle?: string;
  large?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.text}>
          <Text style={[styles.title, large && styles.largeTitle]}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Theme.space.lg,
    paddingTop: Theme.space.sm,
    paddingBottom: Theme.space.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Theme.space.md,
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: Theme.type.screenTitle,
    fontWeight: '700',
    color: Theme.color.text,
    letterSpacing: Platform.OS === 'web' ? 0 : -0.6,
  },
  largeTitle: {
    fontSize: Theme.type.todayTitle,
    letterSpacing: Platform.OS === 'web' ? 0 : -0.8,
  },
  subtitle: {
    marginTop: 6,
    fontSize: Theme.type.body,
    lineHeight: 22,
    color: Theme.color.textSecondary,
  },
});
