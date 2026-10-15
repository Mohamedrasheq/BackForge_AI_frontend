import {
  ConfirmItems,
  createDraftItem,
  EMPTY_PARSE_MESSAGE,
  saveableDraftItems,
  type DraftItem,
} from '@/components/capture/confirm-items';
import { VoiceWave } from '@/components/capture/voice-wave';
import { AiConsentCard } from '@/components/consent/ai-consent-card';
import { IconButton } from '@/components/ui/icon-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextButton } from '@/components/ui/text-button';
import { cardSurface, Theme } from '@/constants/theme';
import { useAiConsent } from '@/hooks/use-ai-consent';
import { useCaptureRecording } from '@/hooks/use-capture-recording';
import { useCategories } from '@/hooks/use-categories';
import {
  applyCreatedCategories,
  categoryNameKey,
  collectPendingCategoryNames,
  createPendingCategoryNames,
} from '@/lib/categories';
import { haptics } from '@/lib/haptics';
import { ROW_BLEED } from '@/lib/voice-wave';
import { bulkCreateItems, listCategories, parseItems } from '@/services/api';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

export default function CaptureScreen() {
  const router = useRouter();
  const focused = useIsFocused();
  const consent = useAiConsent();
  const { categories, error: categoriesError, reload: reloadCategories, create: createCategory } =
    useCategories();
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<'compose' | 'confirm'>('compose');
  const [rows, setRowsState] = useState<DraftItem[]>([]);
  const rowsRef = useRef(rows);
  const setRows = useCallback((update: React.SetStateAction<DraftItem[]>) => {
    const next = typeof update === 'function' ? update(rowsRef.current) : update;
    rowsRef.current = next;
    setRowsState(next);
  }, []);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allowAutoFocus, setAllowAutoFocus] = useState(true);

  const {
    recording,
    transcribing,
    error: speechError,
    start,
    stop,
    clearError: clearSpeechError,
    meteringDb,
    meteringTick,
  } = useCaptureRecording();
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
      setRows(proposed.map((item) => createDraftItem(item, categories)));
      setPhase('confirm');
    } catch (err) {
      haptics.error();
      setError(err instanceof Error ? err.message : 'Could not break that down');
    } finally {
      setSubmitting(false);
    }
  };

  const onConfirm = async () => {
    const items = saveableDraftItems(rowsRef.current);
    if (items.length === 0) {
      setError(EMPTY_PARSE_MESSAGE);
      return;
    }
    setConfirming(true);
    setError(null);
    try {
      const names = collectPendingCategoryNames(rowsRef.current);
      if (names.length > 0) {
        try {
          await createPendingCategoryNames(names, {
            known: categories,
            create: createCategory,
            list: listCategories,
            onCreated: (key, category) => {
              setRows((current) => applyCreatedCategories(current, new Map([[key, category]])));
            },
            stillPending: (key) =>
              collectPendingCategoryNames(rowsRef.current).some(
                (name) => categoryNameKey(name) === key
              ),
          });
        } finally {
          void reloadCategories();
        }
      }
      const ready = saveableDraftItems(rowsRef.current);
      if (ready.length === 0) {
        setError(EMPTY_PARSE_MESSAGE);
        return;
      }
      await bulkCreateItems(ready, 'capture');
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
          categories={categories}
          categoriesError={categoriesError}
          onReloadCategories={() => void reloadCategories()}
          onCreateCategory={createCategory}
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
            right={
              <IconButton
                name="xmark"
                accessibilityLabel="Close capture and go to Today"
                onPress={leaveCapture}
              />
            }
          />
          {consent.status !== 'agreed' ? (
            consent.status === 'needed' ? (
              <AiConsentCard onAgree={consent.agree} />
            ) : (
              <View style={styles.consentLoading}>
                <ActivityIndicator color={Theme.color.accent} />
              </View>
            )
          ) : (
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

                  <View style={styles.voice}>
                    <VoiceWave
                      recording={recording}
                      transcribing={transcribing}
                      active={focused}
                      meteringDb={meteringDb}
                      meteringTick={meteringTick}
                      onPress={() => void onMicPress()}
                    />
                  </View>
                  <Text style={[styles.hint, recording && styles.hintActive]}>{hint}</Text>

                  {error || speechError ? (
                    <Text style={[styles.error, error === EMPTY_PARSE_MESSAGE && styles.gentle]}>
                      {error || speechError}
                    </Text>
                  ) : null}

                  {canClear ? <TextButton label="Clear" onPress={onClear} tone="secondary" /> : null}

                  <PrimaryButton
                    label="Break down"
                    onPress={() => void onBreakDown()}
                    loading={submitting}
                    disabled={!canSubmit}
                    style={styles.submit}
                  />
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  consentLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: Theme.space.screenX,
    paddingBottom: Theme.space.lg,
  },
  composer: {
    ...cardSurface,
    flex: 1,
    minHeight: 220,
    borderRadius: Theme.radius.xl,
    padding: Theme.space.lg,
  },
  composerListening: {
    borderColor: Theme.color.accent,
  },
  input: {
    flex: 1,
    fontSize: 24,
    lineHeight: 34,
    color: Theme.color.text,
    fontWeight: '500',
  },
  voice: {
    marginTop: Theme.space.md - ROW_BLEED,
  },
  hint: {
    marginTop: Theme.space.sm - ROW_BLEED,
    textAlign: 'center',
    color: Theme.color.text,
    fontSize: Theme.type.label,
    lineHeight: 20,
    fontWeight: '500',
  },
  hintActive: {
    color: Theme.color.accentPressed,
  },
  error: {
    marginTop: Theme.space.sm,
    textAlign: 'center',
    color: Theme.color.danger,
    fontSize: Theme.type.caption,
  },
  gentle: {
    color: Theme.color.textSecondary,
  },
  submit: {
    marginTop: Theme.space.sm,
  },
});
