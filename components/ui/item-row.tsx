import { IconSymbol } from '@/components/ui/icon-symbol';
import { cardSurface, Theme } from '@/constants/theme';
import { formatDue } from '@/lib/format';
import { haptics } from '@/lib/haptics';
import type { Item } from '@/types/api';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function ItemRow({
  item,
  onDone,
}: {
  item: Item;
  onDone?: (item: Item) => void;
}) {
  const done = item.status === 'done';
  const due = formatDue(item.dueAt);

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={done ? 'Completed' : 'Mark done'}
        disabled={done || !onDone}
        onPress={() => {
          if (done || !onDone) return;
          haptics.success();
          onDone(item);
        }}
        hitSlop={8}
        style={({ pressed }) => [styles.checkWrap, pressed && !done && styles.pressed]}
      >
        <IconSymbol
          name={done ? 'checkmark.circle.fill' : 'circle'}
          size={26}
          color={done ? Theme.color.success : Theme.color.textTertiary}
        />
      </Pressable>
      <View style={styles.body}>
        <Text style={[styles.title, done && styles.titleDone]}>{item.text}</Text>
        {due ? <Text style={styles.due}>{due}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    ...cardSurface,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: Theme.space.md,
  },
  checkWrap: {
    paddingTop: 1,
  },
  pressed: {
    opacity: 0.6,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: Theme.type.itemTitle,
    lineHeight: 24,
    fontWeight: '600',
    color: Theme.color.text,
  },
  titleDone: {
    color: Theme.color.textTertiary,
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  due: {
    marginTop: 6,
    fontSize: Theme.type.caption,
    lineHeight: 18,
    color: Theme.color.textSecondary,
  },
});
