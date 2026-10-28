import {
  ConfirmItems,
  createDraftItem,
  EMPTY_PARSE_MESSAGE,
  saveableDraftItems,
  type DraftItem,
} from '@/components/capture/confirm-items';
import { ParseSkeleton } from '@/components/capture/parse-skeleton';
import { VoiceWave } from '@/components/capture/voice-wave';
import { ErrorBanner } from '@/components/ui/error-banner';
import { IconButton } from '@/components/ui/icon-button';
import { PrimaryButton } from '@/components/ui/primary-button';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
import { TextButton } from '@/components/ui/text-button';
import { cardSurface, Theme } from '@/constants/theme';
import { useCaptureRecording } from '@/hooks/use-capture-recording';
import { useCategories } from '@/hooks/use-categories';
import {
  applyCreatedCategories,
  categoryNameKey,
  collectPendingCategoryNames,
  createPendingCategoryNames,
} from '@/lib/categories';
import {
  CONFIRM_SAVE_FAILED_MESSAGE,
  PARSE_TIMEOUT_MS,
  captureParseFailureMessage,
  captureParseStatus,
} from '@/lib/capture-status';
import { haptics } from '@/lib/haptics';
import { notifySavedDues } from '@/lib/reminder-nudge';
import { showSavedFlash } from '@/lib/saved-flash';
import { isAbortError } from '@/lib/ask-stream';
import { ROW_BLEED } from '@/lib/voice-wave';
import { bulkCreateItems, listCategories, parseItems } from '@/services/api';
import { useIsFocused } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
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
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [parseStatus, setParseStatus] = useState<string | null>(null);
  const [allowAutoFocus, setAllowAutoFocus] = useState(true);
  const parseAbortRef = useRef<AbortController | null>(null);
  const parseStartedAtRef = useRef(0);

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
  const lockInput = recording || transcribing || submitting;
  const canSubmit = text.trim().length > 0 && !lockInput;
  const canClear = text.length > 0 && !lockInput;

  const goToToday = useCallback(() => {
    Keyboard.dismiss();
    router.navigate('/(tabs)');
  }, [router]);

  const jumpToToday = useCallback(() => {
    Keyboard.dismiss();
    router.replace('/(tabs)');
  }, [router]);

  const backToCompose = useCallback(() => {
    haptics.light();
    setPhase('compose');
    setError(null);
  }, []);

  const leaveCapture = useCallback(() => {
    haptics.light();
    parseAbortRef.current?.abort();
    setText('');
    setRows([]);
    setPhase('compose');
    setError(null);
    setBannerError(null);
    clearSpeechError();
    goToToday();
  }, [clearSpeechError, goToToday]);

  const onClear = useCallback(() => {
    setText('');
    setError(null);
    setBannerError(null);
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

  const cancelParse = useCallback(() => {
    parseAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!submitting) {
      setParseStatus(null);
      return;
    }
    parseStartedAtRef.current = Date.now();
    setParseStatus(captureParseStatus(0));
    const tick = setInterval(() => {
      setParseStatus(captureParseStatus(Date.now() - parseStartedAtRef.current));
    }, 250);
    return () => clearInterval(tick);
  }, [submitting]);

  const onBreakDown = async () => {
    if (!canSubmit) return;
    if (recording) {
      await stop();
    }
    parseAbortRef.current?.abort();
    const controller = new AbortController();
    parseAbortRef.current = controller;
    setSubmitting(true);
    setError(null);
    setBannerError(null);
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, PARSE_TIMEOUT_MS);
    try {
      const proposed = await parseItems(text.trim(), controller.signal);
      if (proposed.length === 0) {
        haptics.warning();
        setError(EMPTY_PARSE_MESSAGE);
        return;
      }
      haptics.success();
      setRows(proposed.map((item) => createDraftItem(item, categories)));
      setPhase('confirm');
    } catch (err) {
      if (controller.signal.aborted && !timedOut) return;
      if (isAbortError(err) && !timedOut) return;
      haptics.error();
      setBannerError(captureParseFailureMessage(err, timedOut));
    } finally {
      clearTimeout(timeout);
      if (parseAbortRef.current === controller) parseAbortRef.current = null;
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
      showSavedFlash(ready.length);
      notifySavedDues(ready.map((item) => item.dueAt));
      setText('');
      setRows([]);
      setPhase('compose');
      jumpToToday();
    } catch {
      haptics.error();
      setError(CONFIRM_SAVE_FAILED_MESSAGE);
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
          onBack={backToCompose}
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
                      setBannerError(null);
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

                {submitting ? (
                  <View style={styles.parse}>
                    <ParseSkeleton />
                    {parseStatus ? <Text style={styles.parseStatus}>{parseStatus}</Text> : null}
                    <TextButton label="Cancel" onPress={cancelParse} tone="secondary" />
                  </View>
                ) : (
                  <>
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
                  </>
                )}

                {bannerError ? (
                  <View style={styles.banner}>
                    <ErrorBanner message={bannerError} />
                  </View>
                ) : null}

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
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
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
  parse: {
    marginTop: Theme.space.md,
    gap: Theme.space.sm,
  },
  parseStatus: {
    textAlign: 'center',
    color: Theme.color.textSecondary,
    fontSize: Theme.type.caption,
    lineHeight: 18,
  },
  banner: {
    marginHorizontal: -Theme.space.screenX,
    marginTop: Theme.space.sm,
  },
});
