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
    paddingHorizontal: Theme.space.lg,
    paddingVertical: Theme.space.xl,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.color.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.space.md,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: Theme.color.text,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  description: {
    marginTop: 6,
    maxWidth: 280,
    fontSize: Theme.type.body,
    lineHeight: 22,
    color: Theme.color.textSecondary,
    textAlign: 'center',
  },
  descriptionSolo: {
    marginTop: 0,
    fontSize: Theme.type.itemTitle,
    lineHeight: 24,
  },
  action: {
    marginTop: Theme.space.sm,
  },
});
