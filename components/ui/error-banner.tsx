import { Theme } from '@/constants/theme';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Pressable onPress={onRetry} style={styles.banner}>
      <Text style={styles.text}>{message}</Text>
      {onRetry ? <Text style={styles.retry}>Try again</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: Theme.space.lg,
    marginBottom: Theme.space.sm,
    padding: Theme.space.md,
    borderRadius: Theme.radius.md,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 4,
  },
  text: {
    color: Theme.color.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  retry: {
    color: Theme.color.danger,
    fontSize: 13,
    fontWeight: '600',
  },
});
