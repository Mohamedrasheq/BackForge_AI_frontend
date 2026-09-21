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
    <View style={[styles.wrap, large && styles.wrapLarge]}>
      <View style={styles.row}>
        <View style={styles.text}>
          <Text style={[styles.title, large && styles.largeTitle]}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right ? <View style={[styles.right, large && styles.rightLarge]}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Theme.space.screenX,
    paddingTop: Theme.space.sm,
    paddingBottom: Theme.space.md,
  },
  wrapLarge: {
    paddingTop: Theme.space.md,
    paddingBottom: Theme.space.lg,
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
    letterSpacing: Platform.OS === 'web' ? 0 : -0.9,
  },
  subtitle: {
    marginTop: 6,
    fontSize: Theme.type.body,
    lineHeight: 22,
    color: Theme.color.textSecondary,
  },
  right: {
    marginTop: 4,
  },
  rightLarge: {
    marginTop: 4,
  },
});
