import { Theme } from '@/constants/theme';
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Shared CategoryPickerSheet chrome: overlay, handle, and bottom card. */
export function BottomSheet({
  onClose,
  dismissLabel,
  closeDisabled,
  children,
}: {
  onClose: () => void;
  dismissLabel: string;
  closeDisabled?: boolean;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const close = () => {
    if (closeDisabled) return;
    onClose();
  };

  return (
    <Modal transparent animationType="slide" visible onRequestClose={close}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={dismissLabel}
          style={styles.backdrop}
          onPress={close}
        >
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Theme.space.md) }]}
            onPress={() => undefined}
          >
            <View style={styles.handle} />
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: Theme.color.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    backgroundColor: Theme.color.card,
    borderTopLeftRadius: Theme.radius.xl,
    borderTopRightRadius: Theme.radius.xl,
    paddingTop: Theme.space.sm,
    paddingHorizontal: Theme.space.screenX,
    gap: Theme.space.sm,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.color.border,
    marginBottom: Theme.space.xs,
  },
});
