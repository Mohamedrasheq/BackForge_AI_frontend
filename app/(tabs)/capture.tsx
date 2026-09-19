import { IconSymbol } from '@/components/ui/icon-symbol';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Theme } from '@/constants/theme';
import { useSpeechCapture } from '@/hooks/use-speech-capture';
import { haptics } from '@/lib/haptics';
import { captureItem } from '@/services/api';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
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

  const goToToday = useCallback(() => {
    Keyboard.dismiss();
    router.navigate('/(tabs)');
  }, [router]);

  const leaveCapture = useCallback(() => {
    haptics.light();
    goToToday();
  }, [goToToday]);

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await captureItem(text.trim());
      haptics.success();
      setText('');
      goToToday();
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
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close capture and go to Today"
            onPress={leaveCapture}
            style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
          >
            <IconSymbol name="xmark" size={16} color={Theme.color.accent} />
          </Pressable>
        }
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.body}>
            <View style={[styles.composer, listening && styles.composerListening]}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="What's on your mind?"
                placeholderTextColor={Theme.color.textTertiary}
                style={styles.input}
                multiline
                textAlignVertical="top"
                autoFocus
              />
            </View>

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
                size={26}
                color={listening ? Theme.color.white : Theme.color.accent}
              />
            </Pressable>

            <Text style={styles.hint}>{listening ? 'Listening…' : ' '}</Text>

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
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  close: {
    marginTop: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.color.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePressed: {
    opacity: 0.7,
  },
  body: {
    flex: 1,
    paddingHorizontal: Theme.space.lg,
    paddingBottom: Theme.space.lg,
  },
  composer: {
    flex: 1,
    minHeight: 180,
    backgroundColor: Theme.color.card,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.color.border,
    padding: Theme.space.lg,
    ...Theme.shadow.card,
  },
  composerListening: {
    borderColor: Theme.color.accent,
  },
  input: {
    flex: 1,
    fontSize: 22,
    lineHeight: 32,
    color: Theme.color.text,
    fontWeight: '500',
  },
  mic: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    marginTop: Theme.space.lg,
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
    marginTop: Theme.space.sm,
    marginBottom: Theme.space.md,
    minHeight: 20,
    textAlign: 'center',
    color: Theme.color.textSecondary,
    fontSize: 14,
  },
  error: {
    marginBottom: Theme.space.md,
    textAlign: 'center',
    color: Theme.color.danger,
    fontSize: 14,
  },
});
