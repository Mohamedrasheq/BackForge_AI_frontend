/**
 * Ask chat for this JS session. It survives tab switches and clears on relaunch.
 */

import {
  ASK_FAILURE,
  ASK_HISTORY_TURNS,
  ASK_MESSAGE_MAX,
  ASK_MINUTE_COOLDOWN_MS,
  ASK_PLACEHOLDER,
  ASK_PLACEHOLDER_DAY,
  ASK_PLACEHOLDER_MINUTE,
  ASK_RATE_DAY,
  ASK_RATE_MINUTE,
  askHistory,
  classifyAskReply,
  isAskFailureReply,
  savedChangesLabel,
  type AskCandidate,
  type AskProposal,
  type AskRateLimitScope,
  type AskReplyVariant,
  type AskResponse,
  type AskShowing,
} from '@/lib/ask-contract';
import type { AskHistoryTurn } from '@/types/api';

export type AskUserMessage = {
  id: string;
  role: 'user';
  text: string;
};

export type AskAssistantMessage = {
  id: string;
  role: 'assistant';
  text: string;
  proposals: AskProposal[];
  candidates: AskCandidate[];
  showing: AskShowing | null;
  review: 'open' | 'saved' | 'none';
  pickedCandidateId: string | null;
  variant: AskReplyVariant;
};

export type AskMessage = AskUserMessage | AskAssistantMessage;

export type AskSessionState = {
  messages: AskMessage[];
  pending: boolean;
  error: string | null;
  minuteLockedUntil: number | null;
  dayLocked: boolean;
  requestId: number;
};

export const initialAskSession: AskSessionState = {
  messages: [],
  pending: false,
  error: null,
  minuteLockedUntil: null,
  dayLocked: false,
  requestId: 0,
};

export type AskAction =
  | { type: 'clear' }
  | { type: 'send'; id: string; text: string; now: number }
  | { type: 'retry'; now: number }
  | { type: 'answered'; requestId: number; id: string; response: AskResponse }
  | { type: 'failed'; requestId: number }
  | { type: 'rate-limited'; requestId: number; scope: AskRateLimitScope; now: number }
  | { type: 'tick'; now: number }
  | {
      type: 'pick';
      messageId: string;
      candidateId: string;
      text: string;
      id: string;
      now: number;
    }
  | { type: 'saved'; messageId: string; count: number; id: string };

export function askInputBlocked(state: AskSessionState, now: number): boolean {
  if (state.pending || state.dayLocked) return true;
  if (state.minuteLockedUntil != null && now < state.minuteLockedUntil) return true;
  return false;
}

export function canSend(state: AskSessionState, text: string, now: number): boolean {
  return !askInputBlocked(state, now) && text.trim().length > 0;
}

export function composerPlaceholder(state: AskSessionState, now: number): string {
  if (state.dayLocked) return ASK_PLACEHOLDER_DAY;
  if (state.minuteLockedUntil != null && now < state.minuteLockedUntil) return ASK_PLACEHOLDER_MINUTE;
  return ASK_PLACEHOLDER;
}

export function rateLimitCaption(state: AskSessionState, now: number): string | null {
  if (state.dayLocked) return ASK_RATE_DAY;
  if (state.minuteLockedUntil != null && now < state.minuteLockedUntil) return ASK_RATE_MINUTE;
  return null;
}

/**
 * Suggestion chips on an empty Ask chat. Hidden only once we know the account
 * has no items (`accountEmpty === true`). Unknown (`null`, still loading) and
 * a failed items fetch (`false`) keep the chips visible.
 */
export function showAskSuggestionChips(
  emptyChat: boolean,
  accountEmpty: boolean | null
): boolean {
  return emptyChat && accountEmpty !== true;
}

export function lastUserMessage(messages: readonly AskMessage[]): AskUserMessage | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === 'user') return message;
  }
  return null;
}

export function historyFromMessages(messages: readonly AskMessage[], limit = ASK_HISTORY_TURNS): AskHistoryTurn[] {
  const turns: AskHistoryTurn[] = [];
  for (const message of messages) {
    if (message.role === 'user') {
      turns.push({ role: 'user', content: message.text });
      continue;
    }
    if (message.variant === 'saved') continue;
    turns.push({ role: 'assistant', content: message.text });
  }
  return askHistory(turns, limit);
}

function assistantFrom(id: string, response: AskResponse): AskAssistantMessage {
  const variant = classifyAskReply(response);
  return {
    id,
    role: 'assistant',
    text: response.reply,
    proposals: response.proposals,
    candidates: response.candidates,
    showing: response.showing,
    review: response.proposals.length > 0 ? 'open' : 'none',
    pickedCandidateId: null,
    variant,
  };
}

function withUser(
  state: AskSessionState,
  id: string,
  text: string
): AskSessionState {
  const trimmed = text.trim().slice(0, ASK_MESSAGE_MAX);
  return {
    ...state,
    messages: [...state.messages, { id, role: 'user', text: trimmed }],
    pending: true,
    error: null,
    requestId: state.requestId + 1,
  };
}

export function askReducer(state: AskSessionState, action: AskAction): AskSessionState {
  switch (action.type) {
    case 'clear':
      return {
        ...initialAskSession,
        dayLocked: state.dayLocked,
        minuteLockedUntil: state.minuteLockedUntil,
        requestId: state.requestId + 1,
      };
    case 'send': {
      if (!canSend(state, action.text, action.now)) return state;
      return withUser(state, action.id, action.text);
    }
    case 'retry': {
      const last = lastUserMessage(state.messages);
      if (!last || askInputBlocked(state, action.now)) return state;
      return {
        ...state,
        pending: true,
        error: null,
        requestId: state.requestId + 1,
      };
    }
    case 'answered': {
      if (action.requestId !== state.requestId || !state.pending) return state;
      if (isAskFailureReply(action.response.reply)) {
        return { ...state, pending: false, error: ASK_FAILURE };
      }
      return {
        ...state,
        pending: false,
        error: null,
        messages: [...state.messages, assistantFrom(action.id, action.response)],
      };
    }
    case 'failed': {
      if (action.requestId !== state.requestId || !state.pending) return state;
      return { ...state, pending: false, error: ASK_FAILURE };
    }
    case 'rate-limited': {
      if (action.requestId !== state.requestId || !state.pending) return state;
      if (action.scope === 'day') {
        return { ...state, pending: false, error: null, dayLocked: true, minuteLockedUntil: null };
      }
      return {
        ...state,
        pending: false,
        error: null,
        minuteLockedUntil: action.now + ASK_MINUTE_COOLDOWN_MS,
      };
    }
    case 'tick': {
      if (state.minuteLockedUntil == null || action.now < state.minuteLockedUntil) return state;
      return { ...state, minuteLockedUntil: null };
    }
    case 'pick': {
      if (askInputBlocked(state, action.now)) return state;
      const target = state.messages.find((message) => message.id === action.messageId);
      if (!target || target.role !== 'assistant' || target.pickedCandidateId) return state;
      const candidate = target.candidates.find((item) => item.id === action.candidateId);
      if (!candidate) return state;
      const messages = state.messages.map((message) =>
        message.id === action.messageId && message.role === 'assistant'
          ? { ...message, pickedCandidateId: action.candidateId }
          : message
      );
      return withUser({ ...state, messages }, action.id, action.text);
    }
    case 'saved': {
      const count = Math.max(0, action.count);
      if (count === 0) return state;
      return {
        ...state,
        messages: [
          ...state.messages.map((message) =>
            message.id === action.messageId && message.role === 'assistant'
              ? { ...message, review: 'saved' as const }
              : message
          ),
          {
            id: action.id,
            role: 'assistant' as const,
            text: savedChangesLabel(count),
            proposals: [],
            candidates: [],
            showing: null,
            review: 'none' as const,
            pickedCandidateId: null,
            variant: 'saved' as const,
          },
        ],
      };
    }
    default:
      return state;
  }
}

let snapshot: AskSessionState = initialAskSession;
const listeners = new Set<() => void>();

export function getAskSession(): AskSessionState {
  return snapshot;
}

export function subscribeAskSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function dispatchAskSession(action: AskAction): AskSessionState {
  const next = askReducer(snapshot, action);
  if (next !== snapshot) {
    snapshot = next;
    for (const listener of listeners) listener();
  }
  return snapshot;
}
