import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { TextButton } from '@/components/ui/text-button';
import { Theme } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: IconSymbolName;
  title?: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      {icon ? (
        <View style={styles.icon}>
          <IconSymbol name={icon} size={26} color={Theme.color.accent} />
        </View>
      ) : null}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Text style={[styles.description, !title && styles.descriptionSolo]}>{description}</Text>
      {actionLabel && onAction ? (
        <TextButton label={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
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
    width: 52,
    height: 52,
    borderRadius: 26,
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
    fontSize: Theme.type.body,
    lineHeight: 24,
    color: Theme.color.textSecondary,
    textAlign: 'center',
  },
  descriptionSolo: {
    marginTop: 0,
    fontSize: 17,
    lineHeight: 26,
  },
  action: {
    marginTop: Theme.space.sm,
  },
});
