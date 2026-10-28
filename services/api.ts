/**
 * BackForge v1 API client.
 * Clerk Bearer auth only — never send userId in bodies.
 */

import { DELETE_ACCOUNT_FAILED, isAccountDeleted } from '@/lib/account-delete';
import { notifyAfterWrite } from '@/lib/data-changes';
import { readSuggestedTimeFlag } from '@/lib/due';
import { getApiToken } from '@/lib/api-auth';
import { audioPartFromUri, readTranscriptPayload } from '@/lib/transcribe-audio';
import {
  askRateLimitScope,
  deviceTimeZone,
  normalizeAskResponse,
  ASK_FAILURE,
  ASK_HISTORY_TURNS,
  ASK_MESSAGE_MAX,
  type AskResponse,
} from '@/lib/ask-contract';
import {
  AskStreamServerError,
  decodeStreamChunks,
  isAbortError,
  isEventStreamResponse,
  readAskSse,
  type AskStreamHandlers,
} from '@/lib/ask-stream';
import type {
  AskHistoryTurn,
  BulkCreateItem,
  Category,
  Item,
  ItemWriteSource,
  ProposedItem,
  UpdateItemRequest,
} from '@/types/api';
import { fetch as expoFetch } from 'expo/fetch';
import { Platform } from 'react-native';

export type { AskStreamHandlers };
export { AskStreamServerError };

const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;
export const API_BASE = (ENV_API_URL || 'https://back-forge-ai.vercel.app/api').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  code: string | null;
  payload: unknown;
  retryAfter: string | null;

  constructor(message: string, status: number, code: string | null = null, payload: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
    this.retryAfter = null;
  }
}

/** POST /ask returned 429. `scope` picks the minute lock or the day lock. */
export class AskRateLimitError extends ApiError {
  scope: 'minute' | 'day';

  constructor(scope: 'minute' | 'day') {
    super(scope === 'day' ? 'day' : 'minute', 429, 'rate_limited');
    this.name = 'AskRateLimitError';
    this.scope = scope;
  }
}

/** POST /categories rejected the name because the user already has it. */
export class DuplicateCategoryError extends ApiError {
  constructor(message: string, status: number) {
    super(message, status, 'duplicate_category');
    this.name = 'DuplicateCategoryError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

function isDoneStatus(value: unknown): boolean {
  if (value === true) return true;
  const status = String(value ?? '').toLowerCase();
  return status === 'done' || status === 'closed' || status === 'completed' || status === 'complete';
}

export function normalizeItem(raw: unknown): Item | null {
  if (!isRecord(raw)) return null;
  const id = readString(raw.id, raw.item_id, raw.itemId, raw._id);
  const text = readString(raw.text, raw.title, raw.body, raw.content, raw.source_text);
  if (!id || !text) return null;

  return {
    id,
    text,
    status: isDoneStatus(raw.status ?? raw.done ?? raw.completed) ? 'done' : 'open',
    dueAt: readDueAt(raw),
    createdAt: readString(raw.created_at, raw.createdAt),
    updatedAt: readUpdatedAt(raw),
    folderId: readFolderId(raw),
  };
}

function readId(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

/** Item category. Null (or a missing field) is Unfiled. */
function readFolderId(raw: Record<string, unknown>): string | null {
  const direct = raw.folder_id ?? raw.folderId;
  const fromDirect = readId(direct);
  if (fromDirect) return fromDirect;
  if (isRecord(direct)) {
    return readId(direct.id) ?? readId(direct.folder_id) ?? readId(direct.folderId);
  }
  return null;
}

function readSuggestedFolderId(raw: Record<string, unknown>): string | null {
  return readId(raw.suggested_folder_id) ?? readId(raw.suggestedFolderId);
}

function readSuggestedCategory(raw: Record<string, unknown>): string | null {
  const value = raw.suggested_category ?? raw.suggestedCategory;
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (isRecord(value)) return readString(value.name, value.title, value.label);
  return null;
}

function readSuggestedIsNew(raw: Record<string, unknown>): boolean {
  const value = raw.suggested_is_new ?? raw.suggestedIsNew;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  }
  return false;
}

export function normalizeCategory(raw: unknown): Category | null {
  if (!isRecord(raw)) return null;
  const id =
    readId(raw.id) ??
    readId(raw.category_id) ??
    readId(raw.categoryId) ??
    readId(raw.folder_id) ??
    readId(raw.folderId);
  const name = readString(raw.name, raw.title, raw.label);
  if (!id || !name) return null;
  return { id, name };
}

export function normalizeCategories(payload: unknown): Category[] {
  let list: unknown[] = [];
  if (Array.isArray(payload)) {
    list = payload;
  } else if (isRecord(payload)) {
    const nested = payload.categories ?? payload.folders ?? payload.data ?? payload.results;
    if (Array.isArray(nested)) list = nested;
    else if (payload.category || payload.folder) list = [payload.category ?? payload.folder];
    else list = [payload];
  }

  const seen = new Set<string>();
  const categories: Category[] = [];
  for (const entry of list) {
    const category = normalizeCategory(entry);
    if (!category || seen.has(category.id)) continue;
    seen.add(category.id);
    categories.push(category);
  }
  return categories;
}

function readUpdatedAt(raw: Record<string, unknown>): string | null {
  const value = readString(raw.updated_at, raw.updatedAt);
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function readDueAt(raw: Record<string, unknown>): string | null {
  const value = readString(
    raw.due_at,
    raw.dueAt,
    raw.due,
    raw.remind_at,
    raw.reminder_at,
    raw.when,
    raw.scheduled_at
  );
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function normalizeProposedItem(raw: unknown): ProposedItem | null {
  if (!isRecord(raw)) return null;
  const text = readString(raw.text, raw.title, raw.body, raw.content, raw.source_text);
  if (!text) return null;
  return {
    text,
    dueAt: readDueAt(raw),
    // Confirm applies a match, or holds an invented name until the user saves.
    folderId: null,
    suggestedFolderId: readSuggestedFolderId(raw),
    suggestedCategory: readSuggestedCategory(raw),
    suggestedIsNew: readSuggestedIsNew(raw),
    suggested: readSuggestedTimeFlag(raw.suggested),
  };
}

export function normalizeProposedItems(payload: unknown): ProposedItem[] {
  if (Array.isArray(payload)) {
    return payload.map(normalizeProposedItem).filter((item): item is ProposedItem => item !== null);
  }

  if (!isRecord(payload)) return [];

  const list =
    payload.items ??
    payload.data ??
    payload.proposed ??
    payload.parsed ??
    payload.proposals ??
    payload.results;
  if (Array.isArray(list)) {
    return list.map(normalizeProposedItem).filter((item): item is ProposedItem => item !== null);
  }

  const single = normalizeProposedItem(payload.item ?? payload);
  return single ? [single] : [];
}

export function normalizeItems(payload: unknown): Item[] {
  if (Array.isArray(payload)) {
    return payload.map(normalizeItem).filter((item): item is Item => item !== null);
  }

  if (!isRecord(payload)) return [];

  const list = payload.items ?? payload.data ?? payload.today ?? payload.results ?? payload.open;
  if (Array.isArray(list)) {
    return list.map(normalizeItem).filter((item): item is Item => item !== null);
  }

  const single = normalizeItem(payload.item ?? payload);
  return single ? [single] : [];
}

function readErrorMessage(payload: unknown): string | null {
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (Array.isArray(payload)) {
    const joined = payload
      .map((entry) => readErrorMessage(entry))
      .filter((entry): entry is string => Boolean(entry))
      .join(' ');
    return joined || null;
  }
  if (!isRecord(payload)) return null;
  return (
    readString(payload.error, payload.message, payload.details, payload.detail) ||
    readErrorMessage(payload.errors) ||
    readErrorMessage(payload.issues)
  );
}

function readFailureCode(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const explicit = readString(payload.code, payload.error_code, payload.errorCode);
  if (explicit) return explicit;
  if (typeof payload.error === 'string' && /^[A-Za-z0-9_:-]+$/.test(payload.error.trim())) {
    return payload.error.trim();
  }
  return null;
}

async function readFailure(
  response: Response
): Promise<{ message: string; code: string | null; payload: unknown }> {
  try {
    const body = await response.json();
    return {
      message: readErrorMessage(body) || `Request failed (${response.status})`,
      code: readFailureCode(body),
      payload: body,
    };
  } catch {
    // ignore parse failure
  }
  return { message: `Request failed (${response.status})`, code: null, payload: null };
}

async function readError(response: Response): Promise<string> {
  return (await readFailure(response)).message;
}

function isDuplicateCategoryFailure(status: number, message: string, code: string | null): boolean {
  if (status === 409) return true;
  const haystack = `${code ?? ''} ${message}`.toLowerCase();
  return (
    haystack.includes('duplicate_category') ||
    haystack.includes('duplicate category') ||
    haystack.includes('already exists') ||
    haystack.includes('category already') ||
    haystack.includes('category_exists') ||
    haystack.includes('name_taken') ||
    haystack.includes('name already')
  );
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getApiToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(init.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    signal: init.signal,
  });

  if (!response.ok) {
    const failure = await readFailure(response);
    const error = new ApiError(failure.message, response.status, failure.code, failure.payload);
    error.retryAfter = response.headers.get('retry-after');
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function parseItems(text: string, signal?: AbortSignal): Promise<ProposedItem[]> {
  const timezone = deviceTimeZone();
  const payload = await apiFetch<unknown>('/items/parse', {
    method: 'POST',
    headers: { 'X-Timezone': timezone },
    body: JSON.stringify({ text, timezone }),
    signal,
  });
  return normalizeProposedItems(payload);
}

/** Map UI drafts (`text` / `dueAt`) onto the /items/bulk contract. */
export function toBulkCreateItems(items: ProposedItem[]): BulkCreateItem[] {
  return items.map((item) => ({
    body: item.text,
    due_at: item.dueAt,
    folder_id: item.folderId ?? null,
  }));
}

export async function bulkCreateItems(
  items: ProposedItem[],
  source?: ItemWriteSource
): Promise<Item[]> {
  const body: { items: BulkCreateItem[]; source?: ItemWriteSource } = {
    items: toBulkCreateItems(items),
  };
  if (source) body.source = source;
  return notifyAfterWrite(
    apiFetch<unknown>('/items/bulk', {
      method: 'POST',
      body: JSON.stringify(body),
    }).then((payload) => normalizeItems(payload))
  );
}

export async function getTodayItems(): Promise<Item[]> {
  const payload = await apiFetch<unknown>('/today');
  return normalizeItems(payload).filter((item) => item.status !== 'done');
}

export async function getItems(): Promise<Item[]> {
  return normalizeItems(await apiFetch<unknown>('/items'));
}

/**
 * Update a saved item's text and/or due time.
 * Contract: `PATCH /items/:id` with `body` (same field as bulk create) and/or `due_at`.
 * `due_at: null` clears the due time. Returns the updated item, or null on 204.
 */
export async function updateItem(
  id: string,
  patch: { text?: string; dueAt?: string | null; folderId?: string | null },
  source?: ItemWriteSource
): Promise<Item | null> {
  const body: UpdateItemRequest = {};
  if (patch.text !== undefined) body.body = patch.text;
  if (patch.dueAt !== undefined) body.due_at = patch.dueAt;
  if (patch.folderId !== undefined) body.folder_id = patch.folderId;
  if (source) body.source = source;

  return notifyAfterWrite(
    apiFetch<unknown>(`/items/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }).then((payload) => {
      if (payload == null) return null;
      if (isRecord(payload)) return normalizeItem(payload.item ?? payload);
      return normalizeItem(payload);
    })
  );
}

/** Move an item to a new due instant. Same PATCH as `updateItem`, due only. */
export async function updateItemDue(id: string, dueAt: string): Promise<Item | null> {
  return updateItem(id, { dueAt });
}

/** Remove a saved item. Contract: `DELETE /items/:id`. */
export async function deleteItem(id: string): Promise<void> {
  await notifyAfterWrite(
    apiFetch<void>(`/items/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
  );
}

export async function markItemDone(id: string, source?: ItemWriteSource): Promise<Item | null> {
  return notifyAfterWrite(
    apiFetch<unknown>(`/items/${encodeURIComponent(id)}/done`, {
      method: 'POST',
      body: source ? JSON.stringify({ source }) : undefined,
    }).then((payload) => {
      if (payload == null) {
        return {
          id,
          text: '',
          status: 'done',
          dueAt: null,
          createdAt: null,
          updatedAt: null,
          folderId: null,
        };
      }

      if (isRecord(payload)) {
        return normalizeItem(payload.item ?? payload);
      }
      return normalizeItem(payload);
    })
  );
}

export async function listCategories(): Promise<Category[]> {
  return normalizeCategories(await apiFetch<unknown>('/categories'));
}

/**
 * Create a category. Invented parse names are sent here only after Confirm.
 * A name the user already has throws `DuplicateCategoryError` so the caller can reuse it.
 */
export async function createCategory(name: string): Promise<Category> {
  try {
    return await notifyAfterWrite(
      (async () => {
        const payload = await apiFetch<unknown>('/categories', {
          method: 'POST',
          body: JSON.stringify({ name: name.trim() }),
        });
        const category = isRecord(payload)
          ? normalizeCategory(payload.category ?? payload.folder ?? payload)
          : normalizeCategory(payload);
        if (!category) {
          throw new Error('Could not add that category');
        }
        return category;
      })()
    );
  } catch (err) {
    if (err instanceof DuplicateCategoryError) throw err;
    if (err instanceof ApiError && isDuplicateCategoryFailure(err.status, err.message, err.code)) {
      throw new DuplicateCategoryError(err.message, err.status);
    }
    throw err;
  }
}

/**
 * Permanently delete the signed-in account and its tasks and categories.
 * Contract: `DELETE /account` returns `{ ok: true }`. Anything else throws.
 */
export async function deleteAccount(): Promise<void> {
  const payload = await apiFetch<unknown>('/account', { method: 'DELETE' });
  if (!isAccountDeleted(payload)) {
    throw new Error(DELETE_ACCOUNT_FAILED);
  }
}

export async function registerDevice(pushToken: string): Promise<void> {
  await apiFetch('/devices', {
    method: 'POST',
    body: JSON.stringify({ push_token: pushToken }),
  });
}

/**
 * Upload a recorded clip to Whisper. Replaces on-device speech recognition.
 * Field name is `file` (multipart). Do not set Content-Type so the boundary is set for us.
 */
export async function transcribeCaptureAudio(uri: string): Promise<string> {
  const token = await getApiToken();
  const { name, type } = audioPartFromUri(uri, Platform.OS);
  const form = new FormData();

  if (Platform.OS === 'web') {
    const blob = await fetch(uri).then((response) => response.blob());
    form.append('file', blob, name);
  } else {
    form.append('file', { uri, name, type } as unknown as Blob);
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/capture/transcribe`, {
    method: 'POST',
    headers,
    body: form,
  });

  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }

  const body = await response.text();
  if (!body) {
    throw new ApiError('Could not transcribe that. Try again or type it in.', response.status);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new ApiError('Could not transcribe that. Try again or type it in.', response.status);
  }

  const transcript = readTranscriptPayload(payload);
  if (!transcript) {
    throw new ApiError('Could not hear that. Try again or type it in.', response.status);
  }

  return transcript;
}

function askRequestBody(input: {
  message: string;
  timezone: string;
  history?: AskHistoryTurn[];
}): { message: string; timezone: string; history?: AskHistoryTurn[] } {
  const message = input.message.trim().slice(0, ASK_MESSAGE_MAX);
  const history = input.history?.slice(-ASK_HISTORY_TURNS);
  const body: { message: string; timezone: string; history?: AskHistoryTurn[] } = {
    message,
    timezone: input.timezone,
  };
  if (history && history.length > 0) body.history = history;
  return body;
}

function rethrowAskError(err: unknown): never {
  if (err instanceof AskRateLimitError) throw err;
  if (err instanceof ApiError && err.status === 429) {
    throw new AskRateLimitError(askRateLimitScope(err.payload, err.retryAfter));
  }
  throw err;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const abort = new Error('Aborted');
  abort.name = 'AbortError';
  throw abort;
}

/**
 * POST /ask. Request is `{ message, timezone, history? }`.
 * History is the last 6 turns and does not include `message`.
 * A 429 throws `AskRateLimitError` with `scope` `minute` or `day`.
 */
export async function askQuestion(
  input: {
    message: string;
    timezone: string;
    history?: AskHistoryTurn[];
  },
  signal?: AbortSignal
): Promise<AskResponse> {
  try {
    const payload = await apiFetch<unknown>('/ask', {
      method: 'POST',
      body: JSON.stringify(askRequestBody(input)),
      signal,
    });
    const parsed = normalizeAskResponse(payload);
    if (!parsed) throw new ApiError(ASK_FAILURE, 200);
    return parsed;
  } catch (err) {
    rethrowAskError(err);
  }
}

/**
 * POST /ask with `Accept: text/event-stream`.
 * Uses `expo/fetch` so iOS can read the body as it arrives.
 * SSE `error` with a minute/day scope throws `AskRateLimitError`.
 * Any other SSE `error` throws `AskStreamServerError`.
 * HTTP errors (5xx and the rest) throw `ApiError` / `AskRateLimitError`.
 * The caller may fall back to JSON only when no status or delta arrived.
 */
export async function askQuestionStream(
  input: {
    message: string;
    timezone: string;
    history?: AskHistoryTurn[];
  },
  handlers: AskStreamHandlers = {},
  signal?: AbortSignal
): Promise<AskResponse> {
  throwIfAborted(signal);

  const token = await getApiToken();
  const headers: Record<string, string> = {
    Accept: 'text/event-stream',
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Awaited<ReturnType<typeof expoFetch>>;
  try {
    response = await expoFetch(`${API_BASE}/ask`, {
      method: 'POST',
      headers,
      body: JSON.stringify(askRequestBody(input)),
      signal,
    });
  } catch (err) {
    throwIfAborted(signal);
    if (isAbortError(err)) throw err;
    throw err;
  }

  if (!response.ok) {
    const failure = await readFailure(response);
    const error = new ApiError(failure.message, response.status, failure.code, failure.payload);
    error.retryAfter = response.headers.get('retry-after');
    rethrowAskError(error);
  }

  if (!isEventStreamResponse(response.headers.get('content-type'))) {
    const text = await response.text();
    if (!text) throw new ApiError(ASK_FAILURE, response.status);
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ApiError(ASK_FAILURE, response.status);
    }
    const parsed = normalizeAskResponse(payload);
    if (!parsed) throw new ApiError(ASK_FAILURE, response.status);
    return parsed;
  }

  const body = response.body;
  if (!body || typeof body.getReader !== 'function') {
    throw new Error('Ask stream is not readable');
  }

  let result;
  try {
    result = await readAskSse(decodeStreamChunks(body.getReader()), handlers);
  } catch (err) {
    throwIfAborted(signal);
    if (isAbortError(err)) throw err;
    throw err;
  }
  if (result.kind === 'done') {
    const parsed = normalizeAskResponse(result.payload);
    if (!parsed) throw new ApiError(ASK_FAILURE, 200);
    return parsed;
  }
  if (result.kind === 'error') {
    if (result.scope) throw new AskRateLimitError(result.scope);
    throw new AskStreamServerError(result.error);
  }
  throw new Error('Ask stream ended before a reply');
}
