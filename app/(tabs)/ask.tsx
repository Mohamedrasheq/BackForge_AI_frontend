import {
  ConfirmItems,
  createDraftItem,
  EMPTY_PARSE_MESSAGE,
  type DraftItem,
} from '@/components/capture/confirm-items';
import { ReplyText } from '@/components/ask/reply-text';
import { SuggestionChips } from '@/components/ask/suggestion-chips';
import { TypingIndicator } from '@/components/ask/typing-indicator';
import { ErrorBanner } from '@/components/ui/error-banner';
import { IconButton } from '@/components/ui/icon-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ItemRow } from '@/components/ui/item-row';
import { Screen } from '@/components/ui/screen';
import { SecondaryButton } from '@/components/ui/secondary-button';
import { TextButton } from '@/components/ui/text-button';
import { cardSurface, Theme } from '@/constants/theme';
import { useCategories } from '@/hooks/use-categories';
import { useAllItems } from '@/hooks/use-items';
import {
  applyPlannedWrites,
  askWriteHandlers,
  candidateAccessibilityLabel,
  candidateFollowUp,
  planAskWrites,
  proposalToDraftSeed,
} from '@/lib/ask-drafts';
import {
  ASK_CLEAR,
  ASK_COUNTER_FROM,
  ASK_EMPTY_ACCOUNT,
  ASK_EMPTY_DESCRIPTION,
  ASK_FAILURE,
  ASK_GO_CAPTURE,
  ASK_GREETING,
  ASK_MESSAGE_MAX,
  ASK_NO_MATCH_HINT,
  ASK_OPEN_ALL,
  ASK_RETRY,
  ASK_SAMPLES,
  ASK_SAVED_BUTTON,
  ASK_SEE_ALL,
  ASK_SEND,
  ASK_THINKING,
  deviceTimeZone,
  isCandidateChoice,
  reviewChangesLabel,
  showingLabel,
  type AskCandidate,
} from '@/lib/ask-contract';
import {
  emptyAskStreamProgress,
  isAbortError,
  shouldAbortAskStream,
  shouldFallbackAskStream,
  type AskStreamProgress,
} from '@/lib/ask-stream';
import {
  askInputBlocked,
  canSend,
  composerPlaceholder,
  dispatchAskSession,
  getAskSession,
  historyFromMessages,
  lastUserMessage,
  rateLimitCaption,
  showAskSuggestionChips,
  subscribeAskSession,
  type AskAssistantMessage,
  type AskMessage,
} from '@/lib/ask-session';
import {
  applyCreatedCategories,
  categoryNameKey,
  collectPendingCategoryNames,
  createPendingCategoryNames,
} from '@/lib/categories';
import { haptics } from '@/lib/haptics';
import { replyPlainText } from '@/lib/reply-markdown';
import {
  AskRateLimitError,
  askQuestion,
  askQuestionStream,
  bulkCreateItems,
  listCategories,
  markItemDone,
  updateItem,
} from '@/services/api';
import type { Item } from '@/types/api';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore, type SetStateAction } from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

let askSeq = 0;

function nextAskId(prefix: string): string {
  askSeq += 1;
  return `${prefix}-${askSeq}`;
}

function useReduceMotionEnabled(): boolean {
  const reducedAtLaunch = useReducedMotion();
  const [live, setLive] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const apply = (enabled: boolean) => {
      if (mounted) setLive(enabled);
    };
    AccessibilityInfo.isReduceMotionEnabled()
      .then(apply)
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', apply);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return live ?? Boolean(reducedAtLaunch);
}

function candidateItem(candidate: AskCandidate): Item {
  return {
    id: candidate.id,
    text: candidate.text,
    status: candidate.status,
    dueAt: candidate.dueAt,
    createdAt: null,
    updatedAt: null,
    folderId: candidate.folderId,
  };
}

function AnswerTurn({
  message,
  onReview,
  onOpenItems,
  onPick,
}: {
  message: AskAssistantMessage;
  onReview: (message: AskAssistantMessage) => void;
  onOpenItems: () => void;
  onPick: (message: AskAssistantMessage, candidate: AskCandidate) => void;
}) {
  const choice = isCandidateChoice(message);
  const picked = message.pickedCandidateId;
  return (
    <View accessibilityLiveRegion="polite" style={styles.turn}>
      {message.text ? <ReplyText text={message.text} /> : null}
      {message.candidates.length > 0 ? (
        <View style={styles.group}>
          {message.candidates.map((candidate, index) => (
            <View key={candidate.id} style={index > 0 && styles.divider}>
              {choice ? (
                <CandidateRow
                  candidate={candidate}
                  dimmed={picked != null && picked !== candidate.id}
                  disabled={picked != null}
                  onPress={() => onPick(message, candidate)}
                />
              ) : (
                <ItemRow item={candidateItem(candidate)} categoryLabel={candidate.categoryName} grouped />
              )}
            </View>
          ))}
        </View>
      ) : null}
      {message.showing ? <Text style={styles.muted}>{showingLabel(message.showing)}</Text> : null}
      {message.variant === 'no-match' ? <Text style={styles.muted}>{ASK_NO_MATCH_HINT}</Text> : null}
      {message.variant === 'no-match' || message.variant === 'delete' ? (
        <TextButton label={ASK_OPEN_ALL} onPress={onOpenItems} style={styles.turnAction} />
      ) : null}
      {message.showing ? (
        <TextButton label={ASK_SEE_ALL} onPress={onOpenItems} style={styles.turnAction} />
      ) : null}
      {message.review !== 'none' ? (
        <SecondaryButton
          label={message.review === 'saved' ? ASK_SAVED_BUTTON : reviewChangesLabel(message.proposals.length)}
          disabled={message.review === 'saved'}
          onPress={() => onReview(message)}
        />
      ) : null}
    </View>
  );
}

function CandidateRow({
  candidate,
  dimmed,
  disabled,
  onPress,
}: {
  candidate: AskCandidate;
  dimmed: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={candidateAccessibilityLabel(candidate)}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.candidate, dimmed && styles.dimmed]}
    >
      <View
        style={styles.candidateBody}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <ItemRow item={candidateItem(candidate)} categoryLabel={candidate.categoryName} grouped />
      </View>
      <IconSymbol name="chevron.right" size={18} color={Theme.color.textTertiary} />
    </Pressable>
  );
}

function ChatMessage({
  message,
  onReview,
  onOpenItems,
  onPick,
}: {
  message: AskMessage;
  onReview: (message: AskAssistantMessage) => void;
  onOpenItems: () => void;
  onPick: (message: AskAssistantMessage, candidate: AskCandidate) => void;
}) {
  if (message.role === 'user') {
    return (
      <View style={styles.userBubble}>
        <Text style={styles.body}>{message.text}</Text>
      </View>
    );
  }
  return (
    <AnswerTurn message={message} onReview={onReview} onOpenItems={onOpenItems} onPick={onPick} />
  );
}

export default function AskScreen() {
  const router = useRouter();
  const state = useSyncExternalStore(subscribeAskSession, getAskSession, getAskSession);
  const reduceMotion = useReduceMotionEnabled();
  const { items, loading: itemsLoading, error: itemsError, reload: reloadItems } = useAllItems();
  const {
    categories,
    error: categoriesError,
    reload: reloadCategories,
    create: createCategory,
  } = useCategories();
  const [draft, setDraft] = useState('');
  const [accountEmpty, setAccountEmpty] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<'chat' | 'confirm'>('chat');
  const [rows, setRowsState] = useState<DraftItem[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const rowsRef = useRef(rows);
  const itemsRef = useRef(items);
  const confirmMessageId = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const announcedId = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamProgressRef = useRef<AskStreamProgress>(emptyAskStreamProgress);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [streamText, setStreamText] = useState('');

  const clearLiveReply = useCallback(() => {
    setStreamStatus(null);
    setStreamText('');
  }, []);

  const setRows = useCallback((update: SetStateAction<DraftItem[]>) => {
    const next = typeof update === 'function' ? update(rowsRef.current) : update;
    rowsRef.current = next;
    setRowsState(next);
  }, []);

  itemsRef.current = items;

  const now = Date.now();
  const blocked = askInputBlocked(state, now);
  const placeholder = composerPlaceholder(state, now);
  const caption = rateLimitCaption(state, now);
  const showEmpty = state.messages.length === 0 && !state.pending;
  const showSuggestions = showAskSuggestionChips(showEmpty, accountEmpty);

  useEffect(() => {
    if (itemsLoading) return;
    setAccountEmpty(itemsError == null && items.length === 0);
  }, [itemsLoading, itemsError, items.length]);

  useEffect(() => {
    if (state.minuteLockedUntil == null) return;
    const delay = Math.max(0, state.minuteLockedUntil - Date.now());
    const timer = setTimeout(() => {
      dispatchAskSession({ type: 'tick', now: Date.now() });
    }, delay);
    return () => clearTimeout(timer);
  }, [state.minuteLockedUntil]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: !reduceMotion });
    });
    return () => cancelAnimationFrame(frame);
  }, [state.messages, state.pending, caption, streamStatus, streamText, reduceMotion]);

  useEffect(() => {
    return () => {
      if (shouldAbortAskStream('unmount')) abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const latest = [...state.messages].reverse().find((message) => message.role === 'assistant');
    if (!latest || latest.id === announcedId.current) return;
    announcedId.current = latest.id;
    if (Platform.OS === 'ios' && latest.text.trim()) {
      AccessibilityInfo.announceForAccessibility(replyPlainText(latest.text));
    }
  }, [state.messages]);

  const runAsk = useCallback(async (requestId: number, message: string, history: ReturnType<typeof historyFromMessages>) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    streamProgressRef.current = { receivedStatus: false, receivedDelta: false };
    clearLiveReply();

    const input = { message, timezone: deviceTimeZone(), history };
    const stillCurrent = () => getAskSession().requestId === requestId && !controller.signal.aborted;

    const finish = (response: Awaited<ReturnType<typeof askQuestion>>) => {
      if (getAskSession().requestId !== requestId) return;
      clearLiveReply();
      const next = dispatchAskSession({
        type: 'answered',
        requestId,
        id: nextAskId('answer'),
        response,
      });
      if (next.error) haptics.error();
    };

    const fail = (err: unknown, haptic: boolean) => {
      if (getAskSession().requestId !== requestId) return;
      clearLiveReply();
      if (err instanceof AskRateLimitError) {
        if (haptic) haptics.warning();
        dispatchAskSession({
          type: 'rate-limited',
          requestId,
          scope: err.scope,
          now: Date.now(),
        });
        return;
      }
      if (haptic) haptics.error();
      dispatchAskSession({ type: 'failed', requestId });
    };

    try {
      const response = await askQuestionStream(
        input,
        {
          onStatus: (status) => {
            streamProgressRef.current = { ...streamProgressRef.current, receivedStatus: true };
            if (!stillCurrent()) return;
            setStreamStatus(status);
          },
          onDelta: (text) => {
            streamProgressRef.current = { ...streamProgressRef.current, receivedDelta: true };
            if (!stillCurrent()) return;
            setStreamText((current) => current + text);
          },
        },
        controller.signal
      );
      finish(response);
    } catch (err) {
      if (getAskSession().requestId !== requestId) return;
      clearLiveReply();
      if (controller.signal.aborted || isAbortError(err)) {
        fail(err, false);
        return;
      }
      if (!shouldFallbackAskStream(err, streamProgressRef.current)) {
        fail(err, true);
        return;
      }
      try {
        const response = await askQuestion(input, controller.signal);
        finish(response);
      } catch (fallbackErr) {
        if (controller.signal.aborted || isAbortError(fallbackErr)) {
          fail(fallbackErr, false);
          return;
        }
        fail(fallbackErr, true);
      }
    }
  }, [clearLiveReply]);

  const submit = useCallback(
    (raw: string) => {
      const current = getAskSession();
      const sentAt = Date.now();
      if (!canSend(current, raw, sentAt)) return false;
      const history = historyFromMessages(current.messages);
      const next = dispatchAskSession({
        type: 'send',
        id: nextAskId('user'),
        text: raw,
        now: sentAt,
      });
      if (next.requestId === current.requestId) return false;
      const message = lastUserMessage(next.messages)?.text ?? raw.trim();
      void runAsk(next.requestId, message, history);
      return true;
    },
    [runAsk]
  );

  const retry = useCallback(async () => {
    const current = getAskSession();
    const last = lastUserMessage(current.messages);
    if (!last || current.messages[current.messages.length - 1]?.id !== last.id) return;
    const sentAt = Date.now();
    if (askInputBlocked(current, sentAt)) return;
    const history = historyFromMessages(current.messages.slice(0, -1));
    const next = dispatchAskSession({ type: 'retry', now: sentAt });
    if (next.requestId === current.requestId) return;
    await runAsk(next.requestId, last.text, history);
  }, [runAsk]);

  const onPick = useCallback(
    async (message: AskAssistantMessage, candidate: AskCandidate) => {
      const current = getAskSession();
      const sentAt = Date.now();
      if (askInputBlocked(current, sentAt)) return;
      const text = candidateFollowUp(candidate);
      const history = historyFromMessages(current.messages);
      const next = dispatchAskSession({
        type: 'pick',
        messageId: message.id,
        candidateId: candidate.id,
        text,
        id: nextAskId('user'),
        now: sentAt,
      });
      if (next.requestId === current.requestId) return;
      await runAsk(next.requestId, text, history);
    },
    [runAsk]
  );

  const openItems = useCallback(() => {
    router.navigate('/(tabs)/items');
  }, [router]);

  const openCapture = useCallback(() => {
    router.navigate('/(tabs)/capture');
  }, [router]);

  const openReview = useCallback(
    (message: AskAssistantMessage) => {
      if (message.review !== 'open') return;
      const seeds = message.proposals.map((proposal) =>
        proposalToDraftSeed(proposal, itemsRef.current, categories)
      );
      const drafts = seeds.map((seed) => createDraftItem(seed, categories));
      confirmMessageId.current = message.id;
      setConfirmError(null);
      setRows(drafts);
      setPhase('confirm');
    },
    [categories, setRows]
  );

  const closeReview = useCallback(() => {
    haptics.light();
    setPhase('chat');
    setConfirmError(null);
    setRows([]);
    confirmMessageId.current = null;
  }, [setRows]);

  const onConfirm = useCallback(async () => {
    const messageId = confirmMessageId.current;
    if (!messageId) return;
    setConfirming(true);
    setConfirmError(null);
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
              collectPendingCategoryNames(rowsRef.current).some((name) => categoryNameKey(name) === key),
          });
        } finally {
          void reloadCategories();
        }
      }
      const originals = new Map(itemsRef.current.map((item) => [item.id, item]));
      const writes = planAskWrites(rowsRef.current, originals);
      if (writes.length === 0) {
        setConfirmError(EMPTY_PARSE_MESSAGE);
        return;
      }
      const result = await applyPlannedWrites(
        writes,
        askWriteHandlers({
          add: (batch, source) => bulkCreateItems(batch, source),
          edit: (id, patch, source) => updateItem(id, patch, source),
          done: (id, source) => markItemDone(id, source),
        })
      );
      if (result.savedKeys.length > 0) {
        const saved = new Set(result.savedKeys);
        setRows((current) => current.filter((row) => !saved.has(row.key)));
      }
      if (result.error) {
        haptics.error();
        setConfirmError(result.error);
        return;
      }
      haptics.success();
      dispatchAskSession({
        type: 'saved',
        messageId,
        count: result.savedKeys.length,
        id: nextAskId('saved'),
      });
      setPhase('chat');
      setRows([]);
      confirmMessageId.current = null;
      void reloadItems(false, true);
      void reloadCategories();
    } catch (err) {
      haptics.error();
      setConfirmError(err instanceof Error ? err.message : 'Could not save those changes');
    } finally {
      setConfirming(false);
    }
  }, [categories, createCategory, reloadCategories, reloadItems, setRows]);

  const counter = draft.length >= ASK_COUNTER_FROM ? `${draft.length}/${ASK_MESSAGE_MAX}` : null;

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
          onBack={closeReview}
          confirming={confirming}
          error={confirmError}
        />
      ) : (
        <>
          <View style={styles.topBar}>
            {state.messages.length > 0 ? (
              <TextButton
                label={ASK_CLEAR}
                tone="secondary"
                onPress={() => {
                  if (shouldAbortAskStream('clear')) abortRef.current?.abort();
                  clearLiveReply();
                  dispatchAskSession({ type: 'clear' });
                }}
              />
            ) : null}
          </View>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              ref={scrollRef}
              style={styles.flex}
              contentContainerStyle={[styles.messages, showEmpty && styles.messagesEmpty]}
              keyboardShouldPersistTaps="handled"
            >
              {showEmpty ? (
                <View style={styles.empty}>
                  <Text style={styles.greeting} accessibilityRole="header">
                    {ASK_GREETING}
                  </Text>
                  <Text style={styles.trust}>{accountEmpty ? ASK_EMPTY_ACCOUNT : ASK_EMPTY_DESCRIPTION}</Text>
                  {accountEmpty ? (
                    <TextButton label={ASK_GO_CAPTURE} onPress={openCapture} style={styles.emptyAction} />
                  ) : null}
                </View>
              ) : (
                state.messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onReview={openReview}
                    onOpenItems={openItems}
                    onPick={(card, candidate) => void onPick(card, candidate)}
                  />
                ))
              )}
              {state.pending && streamText ? (
                <View style={styles.turn} accessibilityLiveRegion="polite">
                  <ReplyText text={streamText} />
                </View>
              ) : null}
              {state.pending && !streamText ? (
                <View style={styles.turn}>
                  <TypingIndicator reduceMotion={reduceMotion} label={streamStatus ?? ASK_THINKING} />
                </View>
              ) : null}
              {caption ? <Text style={styles.caption}>{caption}</Text> : null}
            </ScrollView>
            {state.error ? (
              <ErrorBanner message={ASK_FAILURE} retryLabel={ASK_RETRY} onRetry={() => void retry()} />
            ) : null}
            {showSuggestions ? (
              <View style={styles.suggestions}>
                <SuggestionChips suggestions={ASK_SAMPLES} disabled={blocked} onPick={submit} />
              </View>
            ) : null}
            <View style={styles.composerWrap}>
              <View style={styles.composer}>
                <TextInput
                  value={draft}
                  onChangeText={(next) => setDraft(next.slice(0, ASK_MESSAGE_MAX))}
                  placeholder={placeholder}
                  placeholderTextColor={Theme.color.textTertiary}
                  selectionColor={Theme.color.accent}
                  cursorColor={Theme.color.accent}
                  style={styles.input}
                  multiline
                  maxLength={ASK_MESSAGE_MAX}
                  textAlignVertical="top"
                  editable={!state.dayLocked}
                />
                <View style={styles.send}>
                  <IconButton
                    name="arrow.up"
                    tone="filled"
                    size={34}
                    accessibilityLabel={ASK_SEND}
                    disabled={!canSend(state, draft, now) || state.dayLocked}
                    onPress={() => {
                      if (submit(draft)) setDraft('');
                    }}
                  />
                </View>
              </View>
              {counter ? <Text style={styles.counter}>{counter}</Text> : null}
            </View>
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
  topBar: {
    minHeight: 36,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: Theme.space.screenX,
  },
  messages: {
    paddingHorizontal: Theme.space.screenX,
    paddingTop: Theme.space.sm,
    paddingBottom: Theme.space.md,
    gap: Theme.space.lg,
  },
  messagesEmpty: {
    flexGrow: 1,
  },
  empty: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.space.xl,
  },
  greeting: {
    maxWidth: 320,
    fontSize: Theme.type.screenTitle,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: Theme.color.text,
    textAlign: 'center',
  },
  trust: {
    marginTop: Theme.space.sm,
    maxWidth: 300,
    fontSize: Theme.type.caption,
    lineHeight: 18,
    color: Theme.color.textSecondary,
    textAlign: 'center',
  },
  emptyAction: {
    marginTop: Theme.space.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Theme.radius.lg,
    backgroundColor: 'rgba(180, 83, 9, 0.08)',
  },
  turn: {
    alignSelf: 'stretch',
    gap: Theme.space.listGap,
  },
  group: {
    ...cardSurface,
    overflow: 'hidden',
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.color.border,
  },
  body: {
    fontSize: Theme.type.body,
    lineHeight: 22,
    color: Theme.color.text,
  },
  muted: {
    fontSize: Theme.type.caption,
    lineHeight: 18,
    color: Theme.color.textSecondary,
  },
  turnAction: {
    alignSelf: 'flex-start',
    paddingHorizontal: 0,
  },
  candidate: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: Theme.space.md,
  },
  candidateBody: {
    flex: 1,
    minWidth: 0,
  },
  dimmed: {
    opacity: 0.5,
  },
  caption: {
    textAlign: 'center',
    fontSize: Theme.type.caption,
    lineHeight: 18,
    color: Theme.color.textSecondary,
    paddingVertical: Theme.space.sm,
  },
  suggestions: {
    paddingTop: Theme.space.sm,
  },
  composerWrap: {
    paddingHorizontal: Theme.space.screenX,
    paddingTop: Theme.space.sm,
    paddingBottom: Theme.space.md,
    gap: 4,
  },
  composer: {
    ...cardSurface,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    minHeight: 48,
    paddingVertical: 6,
    paddingLeft: 18,
    paddingRight: 7,
  },
  send: {
    marginBottom: 1,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 88,
    paddingTop: 7,
    paddingBottom: 7,
    fontSize: Theme.type.body,
    lineHeight: 22,
    color: Theme.color.text,
  },
  counter: {
    alignSelf: 'flex-end',
    fontSize: Theme.type.caption,
    lineHeight: 18,
    color: Theme.color.textTertiary,
  },
});
