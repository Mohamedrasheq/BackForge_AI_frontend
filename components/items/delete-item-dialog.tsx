import { Card } from '@/components/ui/card';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { Theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import type { Item } from '@/types/api';
import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

/**
 * Saved items are already on the server. Capture Confirm deletes drafts with no prompt;
 * this dialog is the confirmation step, since the app has no other confirm sheet.
 */
export function DeleteItemDialog({
  item,
  deleting,
  onConfirm,
  onCancel,
}: {
  item: Item;
  deleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible onRequestClose={deleting ? undefined : onCancel}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss delete confirmation"
        style={styles.backdrop}
        onPress={() => {
          if (!deleting) onCancel();
        }}
      >
        <Pressable style={styles.sheetWrap} onPress={() => undefined}>
          <Card style={styles.card}>
            <Text style={styles.title}>Delete this item?</Text>
            <Text style={styles.body} numberOfLines={3}>
              {item.text}
            </Text>
            <Text style={styles.note}>This removes it from your list.</Text>
            <View style={styles.actions}>
              <View style={styles.action}>
                <SecondaryButton label="Cancel" onPress={onCancel} disabled={deleting} />
              </View>
              <View style={styles.action}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Delete"
                  disabled={deleting}
                  onPress={() => {
                    if (deleting) return;
                    haptics.heavy();
                    onConfirm();
                  }}
                  style={({ pressed }) => [
                    styles.delete,
                    pressed && !deleting && styles.deletePressed,
                    deleting && styles.disabled,
                  ]}
                >
                  {deleting ? (
                    <ActivityIndicator color={Theme.color.white} />
                  ) : (
                    <Text style={styles.deleteLabel}>Delete</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Theme.color.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.space.lg,
  },
  sheetWrap: {
    width: '100%',
    maxWidth: 360,
  },
  card: {
    gap: 8,
  },
  title: {
    fontSize: Theme.type.label,
    lineHeight: 22,
    fontWeight: '700',
    color: Theme.color.text,
  },
  body: {
    fontSize: Theme.type.body,
    lineHeight: 22,
    fontWeight: '500',
    color: Theme.color.text,
  },
  note: {
    fontSize: Theme.type.caption,
    lineHeight: 18,
    color: Theme.color.textSecondary,
  },
  actions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
  },
  delete: {
    height: 48,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.color.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.45,
  },
  deleteLabel: {
    color: Theme.color.white,
    fontSize: Theme.type.label,
    fontWeight: '600',
  },
});
