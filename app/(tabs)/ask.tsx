import {
  ConfirmItems,
  createDraftItem,
  EMPTY_PARSE_MESSAGE,
  type DraftItem,
} from '@/components/capture/confirm-items';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorBanner } from '@/components/ui/error-banner';
import { IconButton } from '@/components/ui/icon-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ItemRow } from '@/components/ui/item-row';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/screen-header';
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
  ASK_EMPTY_TITLE,
  ASK_FAILURE,
  ASK_GO_CAPTURE,
  ASK_MESSAGE_MAX,
  ASK_NO_MATCH_HINT,
  ASK_OPEN_ALL,
  ASK_RETRY,
  ASK_SAMPLES,
  ASK_SAVED_BUTTON,
  ASK_SEE_ALL,
  ASK_SEND,
  ASK_SUBTITLE,
  ASK_THINKING,
  ASK_TITLE,
  deviceTimeZone,
  isCandidateChoice,
  reviewChangesLabel,
  showingLabel,
  type AskCandidate,
} from '@/lib/ask-contract';
import {
  askInputBlocked,
  canSend,
  composerPlaceholder,
  dispatchAskSession,
  getAskSession,
  historyFromMessages,
  lastUserMessage,
  rateLimitCaption,
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
import {
  AskRateLimitError,
  askQuestion,
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
  Animated,
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

function ThinkingCard({ reduceMotion }: { reduceMotion: boolean }) {
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0.5)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View style={{ opacity }}>
      <Card>
        <Text style={styles.thinking}>{ASK_THINKING}</Text>
      </Card>
    </Animated.View>
  );
}

function AnswerCard({
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
    <Card accessibilityLiveRegion="polite" accessibilityLabel={message.text} style={styles.answer}>
      {message.text ? <Text style={styles.body}>{message.text}</Text> : null}
      {message.variant === 'no-match' ? <Text style={styles.muted}>{ASK_NO_MATCH_HINT}</Text> : null}
      {message.candidates.map((candidate) =>
        choice ? (
          <CandidateRow
            key={candidate.id}
            candidate={candidate}
            dimmed={picked != null && picked !== candidate.id}
            disabled={picked != null}
            onPress={() => onPick(message, candidate)}
          />
        ) : (
          <ItemRow
            key={candidate.id}
            item={candidateItem(candidate)}
            categoryLabel={candidate.categoryName}
          />
        )
      )}
      {message.variant === 'no-match' || message.variant === 'delete' ? (
        <TextButton label={ASK_OPEN_ALL} onPress={onOpenItems} style={styles.cardAction} />
      ) : null}
      {message.showing ? (
        <>
          <Text style={styles.muted}>{showingLabel(message.showing)}</Text>
          <TextButton label={ASK_SEE_ALL} onPress={onOpenItems} style={styles.cardAction} />
        </>
      ) : null}
      {message.review !== 'none' ? (
        <SecondaryButton
          label={message.review === 'saved' ? ASK_SAVED_BUTTON : reviewChangesLabel(message.proposals.length)}
          disabled={message.review === 'saved'}
          onPress={() => onReview(message)}
        />
      ) : null}
    </Card>
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
        <ItemRow item={candidateItem(candidate)} categoryLabel={candidate.categoryName} />
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
      <View style={styles.userWrap}>
        <Card style={styles.userCard}>
          <Text style={styles.body}>{message.text}</Text>
        </Card>
      </View>
    );
  }
  return (
    <AnswerCard message={message} onReview={onReview} onOpenItems={onOpenItems} onPick={onPick} />
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
  }, [state.messages, state.pending, caption, reduceMotion]);

  useEffect(() => {
    const latest = [...state.messages].reverse().find((message) => message.role === 'assistant');
    if (!latest || latest.id === announcedId.current) return;
    announcedId.current = latest.id;
    if (Platform.OS === 'ios' && latest.text.trim()) {
      AccessibilityInfo.announceForAccessibility(latest.text);
    }
  }, [state.messages]);

  const runAsk = useCallback(async (requestId: number, message: string, history: ReturnType<typeof historyFromMessages>) => {
    try {
      const response = await askQuestion({ message, timezone: deviceTimeZone(), history });
      if (getAskSession().requestId !== requestId) return;
      const next = dispatchAskSession({
        type: 'answered',
        requestId,
        id: nextAskId('answer'),
        response,
      });
      if (next.error) haptics.error();
    } catch (err) {
      if (getAskSession().requestId !== requestId) return;
      if (err instanceof AskRateLimitError) {
        haptics.warning();
        dispatchAskSession({
          type: 'rate-limited',
          requestId,
          scope: err.scope,
          now: Date.now(),
        });
        return;
      }
      haptics.error();
      dispatchAskSession({ type: 'failed', requestId });
    }
  }, []);

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
          <ScreenHeader
            title={ASK_TITLE}
            subtitle={ASK_SUBTITLE}
            right={
              state.messages.length > 0 ? (
                <TextButton
                  label={ASK_CLEAR}
                  tone="secondary"
                  onPress={() => dispatchAskSession({ type: 'clear' })}
                />
              ) : null
            }
          />
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
                  <EmptyState
                    title={ASK_EMPTY_TITLE}
                    description={accountEmpty ? ASK_EMPTY_ACCOUNT : ASK_EMPTY_DESCRIPTION}
                  />
                  {accountEmpty ? (
                    <TextButton label={ASK_GO_CAPTURE} onPress={openCapture} />
                  ) : accountEmpty === false ? (
                    <View style={styles.samples}>
                      {ASK_SAMPLES.map((sample) => (
                        <TextButton
                          key={sample}
                          label={sample}
                          disabled={blocked}
                          onPress={() => submit(sample)}
                        />
                      ))}
                    </View>
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
              {state.pending ? <ThinkingCard reduceMotion={reduceMotion} /> : null}
              {caption ? <Text style={styles.caption}>{caption}</Text> : null}
            </ScrollView>
            {state.error ? (
              <ErrorBanner message={ASK_FAILURE} retryLabel={ASK_RETRY} onRetry={() => void retry()} />
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
                <IconButton
                  name="arrow.up.circle.fill"
                  accessibilityLabel={ASK_SEND}
                  disabled={!canSend(state, draft, now) || state.dayLocked}
                  onPress={() => {
                    if (submit(draft)) setDraft('');
                  }}
                />
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
  messages: {
    paddingHorizontal: Theme.space.screenX,
    paddingBottom: Theme.space.md,
    gap: 12,
  },
  messagesEmpty: {
    flexGrow: 1,
  },
  empty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  samples: {
    alignItems: 'center',
  },
  userWrap: {
    alignItems: 'flex-end',
  },
  userCard: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    backgroundColor: 'rgba(180, 83, 9, 0.08)',
    borderColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    boxShadow: 'none',
  },
  answer: {
    alignSelf: 'stretch',
    gap: 12,
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
  thinking: {
    fontSize: Theme.type.body,
    lineHeight: 22,
    color: Theme.color.textSecondary,
  },
  cardAction: {
    alignSelf: 'flex-start',
    paddingHorizontal: 0,
  },
  candidate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  composerWrap: {
    paddingHorizontal: Theme.space.screenX,
    paddingTop: Theme.space.sm,
    paddingBottom: Theme.space.md,
    gap: 4,
  },
  composer: {
    ...cardSurface,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    minHeight: 24,
    maxHeight: 88,
    paddingTop: 6,
    paddingBottom: 6,
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
