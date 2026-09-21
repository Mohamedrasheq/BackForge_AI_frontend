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
    marginHorizontal: Theme.space.screenX,
    marginBottom: Theme.space.sm,
    padding: Theme.space.md,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.color.dangerSoft,
    borderWidth: 1,
    borderColor: Theme.color.dangerBorder,
    gap: 4,
  },
  text: {
    color: Theme.color.danger,
    fontSize: Theme.type.caption,
    lineHeight: 20,
  },
  retry: {
    color: Theme.color.danger,
    fontSize: Theme.type.caption,
    fontWeight: '600',
  },
});
