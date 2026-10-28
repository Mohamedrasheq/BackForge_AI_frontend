import { ErrorBanner } from '@/components/ui/error-banner';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextButton } from '@/components/ui/text-button';
import { Theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import {
  PROFILE_NAME_MAX_LENGTH,
  PROFILE_NAME_REQUIRED,
  canSaveProfileName,
  isFirstNameMissing,
  profileNamePayload,
  profileNameSaveError,
} from '@/lib/profile-name';
import { useUser } from '@clerk/clerk-expo';
import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function EditNameSheet({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const lastNameRef = useRef<TextInput>(null);
  const [originalFirstName] = useState(user?.firstName ?? '');
  const [originalLastName] = useState(user?.lastName ?? '');
  const [firstName, setFirstName] = useState(originalFirstName);
  const [lastName, setLastName] = useState(originalLastName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canSave = canSaveProfileName(firstName, lastName, originalFirstName, originalLastName);
  const firstNameMissing = isFirstNameMissing(firstName);

  const close = () => {
    if (saving) return;
    onClose();
  };

  const onChangeFirst = (next: string) => {
    setFirstName(next);
    setError(null);
  };

  const onChangeLast = (next: string) => {
    setLastName(next);
    setError(null);
  };

  const onSave = async () => {
    if (!canSave || saving || !user) return;
    setError(null);
    setSaving(true);
    try {
      await user.update(profileNamePayload(firstName, lastName));
      onClose();
    } catch (err) {
      haptics.error();
      setError(profileNameSaveError(err));
      setSaving(false);
    }
  };

  return (
    <Modal transparent animationType="slide" visible onRequestClose={saving ? undefined : close}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss edit name"
          style={styles.backdrop}
          onPress={close}
        >
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Theme.space.md) }]}
            onPress={() => undefined}
          >
            <View style={styles.handle} />
            <Text style={styles.title}>Edit name</Text>

            {error ? (
              <View style={styles.bannerWrap}>
                <ErrorBanner message={error} />
              </View>
            ) : null}

            <View style={styles.fields}>
              <View>
                <Text style={styles.label}>First name</Text>
                <TextInput
                  value={firstName}
                  onChangeText={onChangeFirst}
                  accessibilityLabel="First name"
                  autoFocus
                  textContentType="givenName"
                  autoComplete="given-name"
                  autoCapitalize="words"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  maxLength={PROFILE_NAME_MAX_LENGTH}
                  editable={!saving}
                  selectionColor={Theme.color.accent}
                  cursorColor={Theme.color.accent}
                  placeholderTextColor={Theme.color.textTertiary}
                  style={styles.input}
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                />
                {firstNameMissing ? <Text style={styles.helper}>{PROFILE_NAME_REQUIRED}</Text> : null}
              </View>
              <View>
                <Text style={styles.label}>Last name</Text>
                <TextInput
                  ref={lastNameRef}
                  value={lastName}
                  onChangeText={onChangeLast}
                  accessibilityLabel="Last name"
                  textContentType="familyName"
                  autoComplete="family-name"
                  autoCapitalize="words"
                  returnKeyType="done"
                  maxLength={PROFILE_NAME_MAX_LENGTH}
                  editable={!saving}
                  selectionColor={Theme.color.accent}
                  cursorColor={Theme.color.accent}
                  placeholderTextColor={Theme.color.textTertiary}
                  style={styles.input}
                  onSubmitEditing={() => {
                    if (canSave) void onSave();
                  }}
                />
              </View>
            </View>

            <PrimaryButton
              label={saving ? 'Saving…' : 'Save'}
              disabled={!canSave || saving}
              onPress={() => void onSave()}
            />
            <TextButton label="Cancel" tone="secondary" onPress={close} disabled={saving} />
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
  title: {
    fontSize: Theme.type.screenTitle,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: Theme.color.text,
  },
  bannerWrap: {
    marginHorizontal: -Theme.space.screenX,
  },
  fields: {
    gap: 12,
    paddingVertical: Theme.space.xs,
  },
  label: {
    fontSize: Theme.type.caption,
    fontWeight: '600',
    color: Theme.color.textSecondary,
    marginLeft: 2,
  },
  input: {
    minHeight: 26,
    fontSize: 18,
    lineHeight: 26,
    color: Theme.color.text,
    fontWeight: '600',
    letterSpacing: -0.2,
    padding: 0,
  },
  helper: {
    marginTop: 4,
    fontSize: Theme.type.caption,
    lineHeight: 18,
    color: Theme.color.textTertiary,
  },
});
