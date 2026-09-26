import { IconSymbol } from '@/components/ui/icon-symbol';
import { Theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { reviewEntryTitle } from '@/lib/review';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function ReviewEntry({
  count,
  onReview,
  onDismiss,
}: {
  count: number;
  onReview: () => void;
  onDismiss: () => void;
}) {
  const title = reviewEntryTitle(count);

  return (
    <View style={styles.banner}>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {count > 1 ? <Text style={styles.count}>{count}</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={count === 1 ? 'Review 1 quiet item' : `Review ${count} quiet items`}
        onPress={() => {
          haptics.light();
          onReview();
        }}
        style={({ pressed }) => [styles.review, pressed && styles.pressed]}
      >
        <Text style={styles.reviewLabel}>Review</Text>
        <IconSymbol name="chevron.right" size={16} color={Theme.color.accent} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss review"
        hitSlop={8}
        onPress={() => {
          haptics.light();
          onDismiss();
        }}
        style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}
      >
        <IconSymbol name="xmark" size={16} color={Theme.color.textTertiary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: Theme.space.screenX,
    marginBottom: Theme.space.md,
    paddingVertical: 12,
    paddingLeft: Theme.space.md,
    paddingRight: Theme.space.sm,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.color.accentSoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.space.sm,
  },
  copy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.space.sm,
  },
  title: {
    flexShrink: 1,
    fontSize: Theme.type.label,
    lineHeight: 20,
    fontWeight: '600',
    color: Theme.color.text,
  },
  count: {
    fontSize: Theme.type.caption,
    lineHeight: 18,
    fontWeight: '600',
    color: Theme.color.textSecondary,
  },
  review: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 36,
    paddingHorizontal: 4,
  },
  reviewLabel: {
    fontSize: Theme.type.label,
    fontWeight: '600',
    color: Theme.color.accent,
  },
  dismiss: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
