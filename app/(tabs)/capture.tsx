import { IconSymbol } from '@/components/ui/icon-symbol';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Theme } from '@/constants/theme';
import { useSpeechCapture } from '@/hooks/use-speech-capture';
import { haptics } from '@/lib/haptics';
import { captureItem } from '@/services/api';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function CaptureScreen() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { listening, error: speechError, start, stop } = useSpeechCapture((transcript) => {
    setText(transcript);
  });

  const canSubmit = text.trim().length > 0 && !submitting;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await captureItem(text.trim());
      haptics.success();
      setText('');
      router.replace('/(tabs)');
    } catch (err) {
      haptics.error();
      setError(err instanceof Error ? err.message : 'Could not capture that');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScreenHeader
        title="Capture"
        subtitle="Type or talk anything in. One thought is enough."
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.body}>
          <View style={[styles.composer, listening && styles.composerListening]}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Remind me to call Alex tomorrow at 3…"
              placeholderTextColor={Theme.color.textTertiary}
              style={styles.input}
              multiline
              textAlignVertical="top"
              autoFocus
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={listening ? 'Stop listening' : 'Talk'}
              onPress={() => {
                haptics.medium();
                if (listening) stop();
                else void start();
              }}
              style={({ pressed }) => [
                styles.mic,
                listening && styles.micActive,
                pressed && styles.micPressed,
              ]}
            >
              <IconSymbol
                name="mic.fill"
                size={22}
                color={listening ? Theme.color.white : Theme.color.accent}
              />
            </Pressable>
          </View>

          <Text style={styles.hint}>
            {listening ? 'Listening… tap the mic when you’re done.' : 'Talk or type. Then add it.'}
          </Text>

          {error || speechError ? (
            <Text style={styles.error}>{error || speechError}</Text>
          ) : null}

          <PrimaryButton
            label="Add"
            onPress={() => void onSubmit()}
            loading={submitting}
            disabled={!canSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: Theme.space.lg,
    paddingBottom: Theme.space.lg,
  },
  composer: {
    minHeight: 180,
    backgroundColor: Theme.color.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.color.border,
    padding: Theme.space.md,
    ...Theme.shadow.card,
  },
  composerListening: {
    borderColor: Theme.color.accent,
  },
  input: {
    flex: 1,
    minHeight: 120,
    fontSize: 20,
    lineHeight: 28,
    color: Theme.color.text,
    fontWeight: '500',
  },
  mic: {
    alignSelf: 'flex-end',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.color.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micActive: {
    backgroundColor: Theme.color.accent,
  },
  micPressed: {
    opacity: 0.8,
  },
  hint: {
    marginTop: Theme.space.md,
    marginBottom: Theme.space.lg,
    color: Theme.color.textSecondary,
    fontSize: 15,
  },
  error: {
    marginBottom: Theme.space.md,
    color: Theme.color.danger,
    fontSize: 14,
  },
});
