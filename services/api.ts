/**
 * BackForge v1 API client.
 * Clerk Bearer auth only — never send userId in bodies.
 */

import { getApiToken } from '@/lib/api-auth';
import { audioPartFromUri, readTranscriptPayload } from '@/lib/transcribe-audio';
import type { BulkCreateItem, Item, ProposedItem } from '@/types/api';
import { Platform } from 'react-native';

const ENV_API_URL = process.env.EXPO_PUBLIC_API_URL;
export const API_BASE = (ENV_API_URL || 'https://back-forge-ai.vercel.app/api').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
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
  };
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
  return { text, dueAt: readDueAt(raw) };
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

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (isRecord(body)) {
      return readString(body.error, body.message) || `Request failed (${response.status})`;
    }
  } catch {
    // ignore parse failure
  }
  return `Request failed (${response.status})`;
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
  });

  if (!response.ok) {
    throw new ApiError(await readError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function captureItem(text: string): Promise<Item | null> {
  const payload = await apiFetch<unknown>('/items', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });

  if (isRecord(payload)) {
    return normalizeItem(payload.item ?? payload);
  }
  return normalizeItem(payload);
}

export async function parseItems(text: string): Promise<ProposedItem[]> {
  const payload = await apiFetch<unknown>('/items/parse', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  return normalizeProposedItems(payload);
}

export async function bulkCreateItems(items: ProposedItem[]): Promise<Item[]> {
  const body: { items: BulkCreateItem[] } = {
    items: items.map((item) => ({
      text: item.text,
      due_at: item.dueAt,
    })),
  };
  const payload = await apiFetch<unknown>('/items/bulk', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return normalizeItems(payload);
}

export async function getTodayItems(): Promise<Item[]> {
  const payload = await apiFetch<unknown>('/today');
  return normalizeItems(payload).filter((item) => item.status !== 'done');
}

export async function getItems(query?: string): Promise<Item[]> {
  const trimmed = query?.trim();
  const path = trimmed ? `/items?q=${encodeURIComponent(trimmed)}` : '/items';
  return normalizeItems(await apiFetch<unknown>(path));
}

export async function markItemDone(id: string): Promise<Item | null> {
  const payload = await apiFetch<unknown>(`/items/${encodeURIComponent(id)}/done`, {
    method: 'POST',
  });

  if (payload == null) {
    return { id, text: '', status: 'done', dueAt: null, createdAt: null };
  }

  if (isRecord(payload)) {
    return normalizeItem(payload.item ?? payload);
  }
  return normalizeItem(payload);
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
