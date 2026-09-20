import {
  ConfirmItems,
  createDraftItem,
  EMPTY_PARSE_MESSAGE,
  saveableDraftItems,
  type DraftItem,
} from '@/components/capture/confirm-items';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Theme } from '@/constants/theme';
import { useCaptureRecording } from '@/hooks/use-capture-recording';
import { haptics } from '@/lib/haptics';
import { bulkCreateItems, parseItems } from '@/services/api';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<'compose' | 'confirm'>('compose');
  const [rows, setRows] = useState<DraftItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowAutoFocus, setAllowAutoFocus] = useState(true);

  const { recording, transcribing, error: speechError, start, stop, clearError: clearSpeechError } =
    useCaptureRecording();
  const lockInput = recording || transcribing;
  const canSubmit = text.trim().length > 0 && !submitting && !lockInput;
  const canClear = text.length > 0 && !submitting && !lockInput;

  const goToToday = useCallback(() => {
    Keyboard.dismiss();
    router.navigate('/(tabs)');
  }, [router]);

  const jumpToToday = useCallback(() => {
    Keyboard.dismiss();
    router.replace('/(tabs)');
  }, [router]);

  const leaveCapture = useCallback(() => {
    haptics.light();
    if (phase === 'confirm') {
      setPhase('compose');
      setError(null);
      return;
    }
    goToToday();
  }, [goToToday, phase]);

  const onClear = useCallback(() => {
    haptics.light();
    setText('');
    setError(null);
    clearSpeechError();
  }, [clearSpeechError]);

  const onMicPress = async () => {
    if (transcribing) return;
    haptics.medium();
    setError(null);

    if (recording) {
      const transcript = await stop();
      if (transcript) {
        setText(transcript);
      }
      return;
    }

    setAllowAutoFocus(false);
    Keyboard.dismiss();
    inputRef.current?.blur();
    await start();
  };

  const onBreakDown = async () => {
    if (!canSubmit) return;
    if (recording) {
      await stop();
    }
    setSubmitting(true);
    setError(null);
    try {
      const proposed = await parseItems(text.trim());
      if (proposed.length === 0) {
        haptics.warning();
        setError(EMPTY_PARSE_MESSAGE);
        return;
      }
      haptics.success();
      setRows(proposed.map((item) => createDraftItem(item)));
      setPhase('confirm');
    } catch (err) {
      haptics.error();
      setError(err instanceof Error ? err.message : 'Could not break that down');
    } finally {
      setSubmitting(false);
    }
  };

  const onConfirm = async () => {
    const items = saveableDraftItems(rows);
    if (items.length === 0) {
      setError(EMPTY_PARSE_MESSAGE);
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      await bulkCreateItems(items);
      haptics.success();
      setText('');
      setRows([]);
      setPhase('compose');
      jumpToToday();
    } catch (err) {
      haptics.error();
      setError(err instanceof Error ? err.message : 'Could not save those items');
    } finally {
      setConfirming(false);
    }
  };

  const hint = recording
    ? 'Recording… tap the mic to stop.'
    : transcribing
      ? 'Transcribing…'
      : 'Tap the mic to talk. It stays on until you stop.';

  return (
    <Screen>
      {phase === 'confirm' ? (
        <ConfirmItems
          items={rows}
          onChange={setRows}
          onConfirm={() => void onConfirm()}
          onBack={leaveCapture}
          confirming={confirming}
          error={error}
        />
      ) : (
        <>
          <ScreenHeader
            title="Capture"
            subtitle="A thought or a long dump."
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
                <View style={[styles.composer, recording && styles.composerListening]}>
                  <TextInput
                    ref={inputRef}
                    value={text}
                    onChangeText={(next) => {
                      setText(next);
                      setError(null);
                      clearSpeechError();
                    }}
                    placeholder="What's on your mind?"
                    placeholderTextColor={Theme.color.textTertiary}
                    selectionColor={Theme.color.accent}
                    cursorColor={Theme.color.accent}
                    style={styles.input}
                    multiline
                    textAlignVertical="top"
                    autoFocus={allowAutoFocus && !lockInput}
                    editable={!lockInput}
                    showSoftInputOnFocus={!lockInput}
                  />
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    recording ? 'Stop recording' : transcribing ? 'Transcribing' : 'Talk'
                  }
                  disabled={transcribing}
                  onPress={() => void onMicPress()}
                  style={({ pressed }) => [
                    styles.mic,
                    recording && styles.micActive,
                    (pressed || transcribing) && styles.micPressed,
                  ]}
                >
                  {transcribing ? (
                    <ActivityIndicator color={Theme.color.accent} />
                  ) : (
                    <IconSymbol
                      name="mic.fill"
                      size={26}
                      color={recording ? Theme.color.white : Theme.color.accent}
                    />
                  )}
                </Pressable>

                <Text style={styles.hint}>{hint}</Text>

                {error || speechError ? (
                  <Text style={[styles.error, error === EMPTY_PARSE_MESSAGE && styles.gentle]}>
                    {error || speechError}
                  </Text>
                ) : null}

                {canClear ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Clear"
                    onPress={onClear}
                    style={({ pressed }) => [styles.clear, pressed && styles.clearPressed]}
                  >
                    <Text style={styles.clearLabel}>Clear</Text>
                  </Pressable>
                ) : null}

                <PrimaryButton
                  label="Break down"
                  onPress={() => void onBreakDown()}
                  loading={submitting}
                  disabled={!canSubmit}
                />
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </>
      )}
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
  clear: {
    alignSelf: 'center',
    paddingVertical: Theme.space.sm,
    paddingHorizontal: Theme.space.md,
    marginBottom: Theme.space.md,
  },
  clearPressed: {
    opacity: 0.7,
  },
  clearLabel: {
    color: Theme.color.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  gentle: {
    color: Theme.color.textSecondary,
  },
});
