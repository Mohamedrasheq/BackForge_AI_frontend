/**
 * POST /ask contract.
 * Request: `{ message, timezone, history? }` with at most 6 history turns.
 * Response: `{ reply, proposals, candidates }`.
 * 429 body: `{ error, scope: 'minute' | 'day' }` (message is optional).
 * Field names are also accepted in snake_case, matching the rest of the API client.
 */

import type { AskHistoryTurn } from '@/types/api';

export type { AskHistoryTurn };

export const ASK_MESSAGE_MAX = 500;
export const ASK_COUNTER_FROM = 450;
export const ASK_HISTORY_TURNS = 6;
export const ASK_CANDIDATE_LIMIT = 5;
export const ASK_MINUTE_COOLDOWN_MS = 60_000;

export const ASK_TITLE = 'Ask';
export const ASK_SUBTITLE = 'About your tasks';
export const ASK_PLACEHOLDER = 'Ask about your tasks';
export const ASK_PLACEHOLDER_MINUTE = 'Back in a minute';
export const ASK_PLACEHOLDER_DAY = 'Back tomorrow';
export const ASK_EMPTY_ACCOUNT = 'Capture a few tasks first, then ask about them.';
export const ASK_SAMPLES = ["What's due this week?", 'Anything overdue?', 'Plan my day'] as const;
export const ASK_GO_CAPTURE = 'Go to Capture';
export const ASK_THINKING = 'Thinking…';
export const ASK_NO_MATCH_HINT = 'Try other words, or check All items.';
export const ASK_OPEN_ALL = 'Open All items';
export const ASK_SEE_ALL = 'See in All items';
export const ASK_FAILURE = "Couldn't answer that right now.";
export const ASK_RETRY = 'Retry';
export const ASK_RATE_MINUTE = "Give it a minute. You've asked a lot just now.";
export const ASK_RATE_DAY = "That's today's limit. Ask again tomorrow.";
export const ASK_CLEAR = 'Clear';
export const ASK_SEND = 'Send';
export const ASK_SAVED_BUTTON = 'Saved';
export const ASK_OFF_TOPIC = 'I can only help with your tasks.';
export const ASK_DONE_UNKNOWN =
  "It's done, but it was finished before dates were tracked, so I don't know when.";

export type AskProposal =
  | {
      kind: 'add';
      text: string;
      dueAt: string | null;
      folderId: string | null;
      categoryName: string | null;
    }
  | {
      kind: 'edit';
      itemId: string;
      text?: string;
      dueAt?: string | null;
      folderId?: string | null;
    }
  | { kind: 'done'; itemId: string };

export type AskCandidate = {
  id: string;
  text: string;
  status: 'open' | 'done';
  dueAt: string | null;
  folderId: string | null;
  categoryName: string | null;
};

export type AskShowing = {
  shown: number;
  total: number;
};

export type AskResponse = {
  reply: string;
  proposals: AskProposal[];
  candidates: AskCandidate[];
  showing: AskShowing | null;
};

export type AskRateLimitScope = 'minute' | 'day';

export type AskReplyVariant = 'answer' | 'no-match' | 'delete' | 'saved';

const MINUTE_SCOPES = new Set([
  'minute',
  'min',
  'per_minute',
  'per-minute',
  'rate_limit_minute',
  'minute_limit',
]);

const DAY_SCOPES = new Set([
  'day',
  'daily',
  'per_day',
  'per-day',
  'rate_limit_day',
  'day_limit',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function owned(raw: Record<string, unknown>, keys: string[]): { present: boolean; value: unknown } {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      return { present: true, value: raw[key] };
    }
  }
  return { present: false, value: undefined };
}

function readId(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function readDue(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function readCategoryName(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (isRecord(value)) return readString(value.name, value.title, value.label);
  return null;
}

function readStatus(value: unknown): 'open' | 'done' {
  const status = String(value ?? '').toLowerCase();
  if (status === 'done' || status === 'closed' || status === 'completed' || status === 'complete') {
    return 'done';
  }
  return 'open';
}

function normalizeAdd(raw: Record<string, unknown>): AskProposal | null {
  const text = readString(raw.text, raw.title, raw.body, raw.content);
  if (!text) return null;
  const folder = owned(raw, ['folderId', 'folder_id']);
  const category = owned(raw, ['categoryName', 'category_name', 'category']);
  return {
    kind: 'add',
    text,
    dueAt: readDue(owned(raw, ['dueAt', 'due_at']).value),
    folderId: folder.present ? readId(folder.value) : null,
    categoryName: category.present ? readCategoryName(category.value) : null,
  };
}

function normalizeEdit(raw: Record<string, unknown>): AskProposal | null {
  const itemId = readId(raw.itemId) ?? readId(raw.item_id) ?? readId(raw.id);
  if (!itemId) return null;
  const proposal: Extract<AskProposal, { kind: 'edit' }> = { kind: 'edit', itemId };
  const text = owned(raw, ['text', 'title', 'body']);
  if (text.present) {
    const value = readString(text.value);
    if (value) proposal.text = value;
  }
  const due = owned(raw, ['dueAt', 'due_at']);
  if (due.present) proposal.dueAt = readDue(due.value);
  const folder = owned(raw, ['folderId', 'folder_id']);
  if (folder.present) proposal.folderId = readId(folder.value);
  return proposal;
}

function normalizeDone(raw: Record<string, unknown>): AskProposal | null {
  const itemId = readId(raw.itemId) ?? readId(raw.item_id) ?? readId(raw.id);
  if (!itemId) return null;
  return { kind: 'done', itemId };
}

export function normalizeAskProposal(raw: unknown): AskProposal | null {
  if (!isRecord(raw)) return null;
  const kind = readString(raw.kind, raw.type)?.toLowerCase() ?? '';
  if (kind === 'delete' || kind === 'drop' || kind === 'remove') return null;
  if (kind === 'add' || kind === 'create') return normalizeAdd(raw);
  if (kind === 'edit' || kind === 'move' || kind === 'update') return normalizeEdit(raw);
  if (kind === 'done' || kind === 'complete') return normalizeDone(raw);
  return null;
}

export function normalizeAskCandidate(raw: unknown): AskCandidate | null {
  if (!isRecord(raw)) return null;
  const id = readId(raw.id) ?? readId(raw.item_id) ?? readId(raw.itemId);
  const text = readString(raw.text, raw.title, raw.body, raw.content);
  if (!id || !text) return null;
  const folder = owned(raw, ['folderId', 'folder_id']);
  const category = owned(raw, ['categoryName', 'category_name', 'category']);
  return {
    id,
    text,
    status: readStatus(raw.status ?? raw.done),
    dueAt: readDue(owned(raw, ['dueAt', 'due_at']).value),
    folderId: folder.present ? readId(folder.value) : null,
    categoryName: category.present ? readCategoryName(category.value) : null,
  };
}

function readCount(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.floor(value);
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

/** Footer only when the list is actually capped. */
export function readShowing(reply: string, payload: unknown): AskShowing | null {
  const match = reply.match(/showing\s+(\d+)\s+of\s+(\d+)/i);
  if (match) {
    const shown = Number(match[1]);
    const total = Number(match[2]);
    if (total > shown) return { shown, total };
  }
  if (!isRecord(payload)) return null;
  const nested = isRecord(payload.showing) ? payload.showing : payload;
  const shown = readCount(nested.shown ?? nested.showing_count ?? nested.limit);
  const total = readCount(nested.total ?? nested.total_count ?? nested.count);
  if (shown == null || total == null || total <= shown) return null;
  return { shown, total };
}

export function showingLabel(showing: AskShowing): string {
  return `Showing ${showing.shown} of ${showing.total}`;
}

export function normalizeAskResponse(payload: unknown): AskResponse | null {
  if (!isRecord(payload)) return null;
  const reply = typeof payload.reply === 'string' ? payload.reply : readString(payload.message);
  if (reply == null) return null;
  const proposalList = Array.isArray(payload.proposals) ? payload.proposals : [];
  const candidateList = Array.isArray(payload.candidates) ? payload.candidates : [];
  const proposals = proposalList
    .map(normalizeAskProposal)
    .filter((item): item is AskProposal => item !== null);
  const candidates = candidateList
    .map(normalizeAskCandidate)
    .filter((item): item is AskCandidate => item !== null)
    .slice(0, ASK_CANDIDATE_LIMIT);
  return {
    reply,
    proposals,
    candidates,
    showing: readShowing(reply, payload),
  };
}

function scopeToken(value: unknown): AskRateLimitScope | null {
  if (typeof value !== 'string') return null;
  const token = value.trim().toLowerCase();
  if (DAY_SCOPES.has(token)) return 'day';
  if (MINUTE_SCOPES.has(token)) return 'minute';
  return null;
}

function retrySeconds(payload: unknown, retryAfterHeader: string | null): number | null {
  const header = retryAfterHeader?.trim() ?? '';
  if (/^\d+$/.test(header)) return Number(header);
  if (header) {
    const at = Date.parse(header);
    if (!Number.isNaN(at)) return Math.max(0, Math.round((at - Date.now()) / 1000));
  }
  if (!isRecord(payload)) return null;
  const raw = payload.retry_after ?? payload.retryAfter ?? payload.retry_after_seconds;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) return Number(raw.trim());
  return null;
}

/**
 * Classify a 429 from POST /ask.
 * The live body is `{ error, scope: 'minute' | 'day' }`.
 * A missing scope falls back to the message text, then Retry-After.
 * Anything still unknown is the minute lock, which lifts on its own.
 */
export function askRateLimitScope(payload: unknown, retryAfterHeader: string | null): AskRateLimitScope {
  if (isRecord(payload)) {
    for (const value of [payload.scope, payload.window, payload.limit, payload.bucket, payload.code]) {
      const scope = scopeToken(value);
      if (scope) return scope;
    }
    const message = [payload.message, payload.error, payload.detail]
      .filter((value): value is string => typeof value === 'string')
      .join(' ')
      .toLowerCase();
    if (
      message.includes('tomorrow') ||
      message.includes('daily') ||
      message.includes("today's limit") ||
      message.includes('per day')
    ) {
      return 'day';
    }
    if (message.includes('minute')) return 'minute';
  }
  const retry = retrySeconds(payload, retryAfterHeader);
  if (retry != null && retry > 120) return 'day';
  return 'minute';
}

function plainReply(reply: string): string {
  return reply.trim().replace(/’/g, "'").toLowerCase();
}

export function isAskFailureReply(reply: string): boolean {
  return plainReply(reply) === ASK_FAILURE.toLowerCase();
}

export function isDeleteRefusal(reply: string): boolean {
  const text = plainReply(reply);
  const refuses = text.includes("can't") || text.includes('cannot') || text.includes('unable');
  return text.includes('delete') && refuses;
}

export function isNoMatchReply(reply: string): boolean {
  return /couldn'?t find|could not find|nothing matching|no match|none found/i.test(reply);
}

/** Two or more matches asking which task. Those rows are tappable. Other candidates stay read-only. */
export function isCandidateChoice(response: {
  reply?: string;
  text?: string;
  candidates: readonly unknown[];
}): boolean {
  const reply = response.reply ?? response.text ?? '';
  return response.candidates.length >= 2 && /which one/i.test(reply);
}

export function classifyAskReply(response: Pick<AskResponse, 'reply' | 'proposals' | 'candidates'>): AskReplyVariant {
  if (response.candidates.length > 0) return 'answer';
  if (response.proposals.length === 0 && isDeleteRefusal(response.reply)) return 'delete';
  if (response.proposals.length === 0 && isNoMatchReply(response.reply)) return 'no-match';
  return 'answer';
}

export function reviewChangesLabel(count: number): string {
  if (count > 1) return `Review ${count} changes`;
  return 'Review changes';
}

export function savedChangesLabel(count: number): string {
  return count === 1 ? 'Saved 1 change.' : `Saved ${count} changes.`;
}

export function deviceTimeZone(): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return zone || 'UTC';
}

/** Last 6 user/assistant turns. Notices are not part of the model history. */
export function askHistory(
  turns: Array<{ role: 'user' | 'assistant'; content: string }>,
  limit = ASK_HISTORY_TURNS
): AskHistoryTurn[] {
  return turns
    .filter((turn) => turn.content.trim().length > 0)
    .slice(-limit)
    .map((turn) => ({ role: turn.role, content: turn.content }));
}
