/**
 * Opt-in SSE for POST /ask.
 * Events: `status` `{ message }`, `delta` `{ text }`, `done` `{ reply, proposals, candidates }`,
 * `error` `{ error, scope? }` on an HTTP 200 stream. `done` is the source of truth.
 */

import { ASK_FAILURE, type AskRateLimitScope } from '@/lib/ask-contract';

export type AskSseFrame = {
  event: string;
  data: string;
};

export type AskStreamEvent =
  | { type: 'status'; message: string }
  | { type: 'delta'; text: string }
  | { type: 'done'; payload: unknown }
  | { type: 'error'; error: string; scope?: AskRateLimitScope };

export type AskStreamHandlers = {
  onStatus?: (message: string) => void;
  onDelta?: (text: string) => void;
};

export type AskSseReadResult =
  | { kind: 'done'; payload: unknown }
  | { kind: 'error'; error: string; scope?: AskRateLimitScope }
  | { kind: 'incomplete' };

export type AskLiveReply = {
  status: string | null;
  draft: string;
};

export const emptyAskLiveReply: AskLiveReply = { status: null, draft: '' };

export type AskStreamProgress = {
  receivedStatus: boolean;
  receivedDelta: boolean;
};

export const emptyAskStreamProgress: AskStreamProgress = {
  receivedStatus: false,
  receivedDelta: false,
};

export type AskStreamAbortReason = 'blur' | 'clear' | 'unmount';

/** Ask is a tab: a blur (Today / All items) must not abort. Clear and a real unmount do. */
export function shouldAbortAskStream(reason: AskStreamAbortReason): boolean {
  return reason === 'clear' || reason === 'unmount';
}

/** SSE `error` on HTTP 200 — show the existing failure, do not fall back. */
export class AskStreamServerError extends Error {
  constructor(message: string) {
    super(message || ASK_FAILURE);
    this.name = 'AskStreamServerError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function readScope(value: unknown): AskRateLimitScope | undefined {
  if (typeof value !== 'string') return undefined;
  const token = value.trim().toLowerCase();
  if (token === 'day' || token === 'daily' || token === 'per_day' || token === 'per-day') {
    return 'day';
  }
  if (token === 'minute' || token === 'min' || token === 'per_minute' || token === 'per-minute') {
    return 'minute';
  }
  return undefined;
}

export function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
}

function errorName(error: unknown): string {
  return typeof error === 'object' && error !== null && 'name' in error ? String(error.name) : '';
}

function isHttpStatusError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('status' in error)) return false;
  const status = error.status;
  return typeof status === 'number' && status >= 400;
}

/**
 * Fall back to the JSON call only when the stream produced nothing usable.
 * A status or delta, an HTTP error, an SSE `error`, a rate limit, or an abort
 * all mean do not re-request — that would run the model twice.
 */
export function shouldFallbackAskStream(
  error: unknown,
  progress: AskStreamProgress = emptyAskStreamProgress
): boolean {
  if (isAbortError(error)) return false;
  if (error instanceof AskStreamServerError) return false;
  const name = errorName(error);
  if (name === 'AskRateLimitError' || name === 'ApiError') return false;
  if (isHttpStatusError(error)) return false;
  if (progress.receivedStatus || progress.receivedDelta) return false;
  return true;
}

export function isEventStreamResponse(contentType: string | null): boolean {
  return (contentType ?? '').toLowerCase().includes('text/event-stream');
}

function parseSseBlock(block: string): AskSseFrame | null {
  let event = 'message';
  const dataLines: string[] = [];
  for (const raw of block.split(/\r?\n/)) {
    if (!raw || raw.startsWith(':')) continue;
    const colon = raw.indexOf(':');
    const field = colon === -1 ? raw : raw.slice(0, colon);
    let value = colon === -1 ? '' : raw.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') event = value;
    else if (field === 'data') dataLines.push(value);
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join('\n') };
}

export function createSseParser(): {
  push(chunk: string): AskSseFrame[];
  flush(): AskSseFrame[];
} {
  let buffer = '';

  const takeFrames = (complete: boolean): AskSseFrame[] => {
    const frames: AskSseFrame[] = [];
    buffer = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    while (true) {
      const split = buffer.indexOf('\n\n');
      if (split === -1) break;
      const block = buffer.slice(0, split);
      buffer = buffer.slice(split + 2);
      const frame = parseSseBlock(block);
      if (frame) frames.push(frame);
    }
    if (complete && buffer.trim()) {
      const frame = parseSseBlock(buffer);
      buffer = '';
      if (frame) frames.push(frame);
    }
    return frames;
  };

  return {
    push(chunk: string) {
      buffer += chunk;
      return takeFrames(false);
    },
    flush() {
      return takeFrames(true);
    },
  };
}

export function parseAskStreamEvent(frame: AskSseFrame): AskStreamEvent | null {
  let payload: unknown;
  try {
    payload = JSON.parse(frame.data);
  } catch {
    return null;
  }
  if (!isRecord(payload)) return null;

  const type = (frame.event || readString(payload.type) || '').toLowerCase();
  if (type === 'status') {
    const message = readString(payload.message, payload.text);
    return message ? { type: 'status', message } : null;
  }
  if (type === 'delta') {
    return typeof payload.text === 'string' ? { type: 'delta', text: payload.text } : null;
  }
  if (type === 'done') {
    return { type: 'done', payload };
  }
  if (type === 'error') {
    return {
      type: 'error',
      error: readString(payload.error, payload.message) || ASK_FAILURE,
      scope: readScope(payload.scope),
    };
  }
  return null;
}

export function applyAskStreamEvent(live: AskLiveReply, event: AskStreamEvent): AskLiveReply {
  switch (event.type) {
    case 'status':
      return { ...live, status: event.message };
    case 'delta':
      return { ...live, draft: live.draft + event.text };
    case 'done':
    case 'error':
      return emptyAskLiveReply;
  }
}

function applyFrames(frames: AskSseFrame[], handlers: AskStreamHandlers): AskSseReadResult | null {
  for (const frame of frames) {
    const event = parseAskStreamEvent(frame);
    if (!event) continue;
    if (event.type === 'status') {
      handlers.onStatus?.(event.message);
      continue;
    }
    if (event.type === 'delta') {
      if (event.text) handlers.onDelta?.(event.text);
      continue;
    }
    if (event.type === 'done') return { kind: 'done', payload: event.payload };
    return { kind: 'error', error: event.error, scope: event.scope };
  }
  return null;
}

/** Read a decoded SSE body. Stops on `done` or `error`. */
export async function readAskSse(
  chunks: AsyncIterable<string>,
  handlers: AskStreamHandlers = {}
): Promise<AskSseReadResult> {
  const parser = createSseParser();
  for await (const chunk of chunks) {
    const result = applyFrames(parser.push(chunk), handlers);
    if (result) return result;
  }
  return applyFrames(parser.flush(), handlers) ?? { kind: 'incomplete' };
}

type StreamReader = {
  read(): Promise<{ done: boolean; value?: Uint8Array }>;
  cancel(): Promise<void>;
};

export async function* decodeStreamChunks(reader: StreamReader): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        const rest = decoder.decode();
        if (rest) yield rest;
        return;
      }
      if (value) yield decoder.decode(value, { stream: true });
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // already closed
    }
  }
}
