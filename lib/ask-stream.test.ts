import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ASK_FAILURE } from './ask-contract';
import {
  applyAskStreamEvent,
  AskStreamServerError,
  createSseParser,
  emptyAskLiveReply,
  emptyAskStreamProgress,
  isAbortError,
  isEventStreamResponse,
  parseAskStreamEvent,
  readAskSse,
  shouldAbortAskStream,
  shouldFallbackAskStream,
} from './ask-stream';

async function* chunksOf(...parts: string[]): AsyncGenerator<string> {
  for (const part of parts) yield part;
}

describe('SSE parser', () => {
  it('joins frames that arrive in pieces', () => {
    const parser = createSseParser();
    assert.deepEqual(parser.push('event: del'), []);
    assert.deepEqual(parser.push('ta\ndata: {"text":"Hel'), []);
    const frames = parser.push('lo"}\n\n');
    assert.deepEqual(frames, [{ event: 'delta', data: '{"text":"Hello"}' }]);
  });

  it('accepts CRLF and more than one event in a chunk', () => {
    const parser = createSseParser();
    const frames = parser.push(
      'event: status\r\ndata: {"message":"Searching your tasks…"}\r\n\r\nevent: delta\r\ndata: {"text":"Four"}\r\n\r\n'
    );
    assert.equal(frames.length, 2);
    assert.equal(frames[0]?.event, 'status');
    assert.equal(frames[1]?.event, 'delta');
  });

  it('joins multi-line data and ignores comments', () => {
    const parser = createSseParser();
    const frames = parser.push(': keep-alive\n\nevent: done\ndata: {"reply":"Hi"\ndata: ,"proposals":[],"candidates":[]}\n\n');
    assert.equal(frames.length, 1);
    assert.equal(frames[0]?.data, '{"reply":"Hi"\n,"proposals":[],"candidates":[]}');
  });

  it('flushes a trailing event that never got a blank line', () => {
    const parser = createSseParser();
    assert.deepEqual(parser.push('event: error\ndata: {"error":"Gave up","scope":"minute"}'), []);
    const frames = parser.flush();
    assert.equal(frames[0]?.event, 'error');
  });
});

describe('parseAskStreamEvent', () => {
  it('reads status, delta, done, and a rate-limit error', () => {
    assert.deepEqual(parseAskStreamEvent({ event: 'status', data: '{"message":"Searching your tasks…"}' }), {
      type: 'status',
      message: 'Searching your tasks…',
    });
    assert.deepEqual(parseAskStreamEvent({ event: 'delta', data: '{"text":" next"}' }), {
      type: 'delta',
      text: ' next',
    });
    const done = parseAskStreamEvent({
      event: 'done',
      data: '{"reply":"Four open tasks this week.","proposals":[],"candidates":[]}',
    });
    assert.equal(done?.type, 'done');
    assert.deepEqual(parseAskStreamEvent({ event: 'error', data: '{"error":"rate_limited","scope":"day"}' }), {
      type: 'error',
      error: 'rate_limited',
      scope: 'day',
    });
  });

  it('does not treat a plain failure as a rate limit', () => {
    assert.deepEqual(parseAskStreamEvent({ event: 'error', data: '{"error":"The model failed."}' }), {
      type: 'error',
      error: 'The model failed.',
      scope: undefined,
    });
  });

  it('ignores a broken JSON payload', () => {
    assert.equal(parseAskStreamEvent({ event: 'delta', data: '{not-json' }), null);
  });
});

describe('readAskSse', () => {
  it('reports status and deltas, then the done payload', async () => {
    const status: string[] = [];
    const deltas: string[] = [];
    const result = await readAskSse(
      chunksOf(
        'event: status\ndata: {"message":"Searching your tasks…"}\n\n',
        'event: delta\ndata: {"text":"Four "}\n\n',
        'event: delta\ndata: {"text":"open tasks."}\n\n',
        'event: done\ndata: {"reply":"Four open tasks.","proposals":[],"candidates":[]}\n\n'
      ),
      {
        onStatus: (message) => status.push(message),
        onDelta: (text) => deltas.push(text),
      }
    );
    assert.deepEqual(status, ['Searching your tasks…']);
    assert.deepEqual(deltas, ['Four ', 'open tasks.']);
    assert.equal(result.kind, 'done');
    if (result.kind === 'done') {
      assert.equal((result.payload as { reply: string }).reply, 'Four open tasks.');
    }
  });

  it('stops on an error event even after deltas', async () => {
    const deltas: string[] = [];
    const result = await readAskSse(
      chunksOf(
        'event: delta\ndata: {"text":"Half written"}\n\n',
        'event: error\ndata: {"error":"rate_limited","scope":"minute"}\n\n',
        'event: delta\ndata: {"text":" should not appear"}\n\n'
      ),
      { onDelta: (text) => deltas.push(text) }
    );
    assert.deepEqual(deltas, ['Half written']);
    assert.deepEqual(result, { kind: 'error', error: 'rate_limited', scope: 'minute' });
  });

  it('returns incomplete when the stream ends without done or error', async () => {
    const result = await readAskSse(chunksOf('event: delta\ndata: {"text":"Hi"}\n\n'));
    assert.equal(result.kind, 'incomplete');
  });
});

describe('live reply and fallback', () => {
  it('clears a half-written draft on error or done', () => {
    let live = applyAskStreamEvent(emptyAskLiveReply, { type: 'status', message: 'Searching your tasks…' });
    live = applyAskStreamEvent(live, { type: 'delta', text: 'Four open' });
    assert.equal(live.status, 'Searching your tasks…');
    assert.equal(live.draft, 'Four open');
    assert.deepEqual(applyAskStreamEvent(live, { type: 'error', error: 'rate_limited', scope: 'minute' }), emptyAskLiveReply);
    assert.deepEqual(
      applyAskStreamEvent(live, { type: 'done', payload: { reply: 'Four open tasks.', proposals: [], candidates: [] } }),
      emptyAskLiveReply
    );
  });

  it('falls back only before the first status or delta', () => {
    const before = emptyAskStreamProgress;
    assert.equal(shouldFallbackAskStream(new Error('Failed to fetch'), before), true);
    assert.equal(shouldFallbackAskStream(new Error('Ask stream is not readable'), before), true);
    assert.equal(isAbortError({ name: 'AbortError' }), true);
    assert.equal(isAbortError(new Error('Failed to fetch')), false);
  });

  it('mid-stream drop shows an error and does not make a second request', () => {
    let jsonCalls = 0;
    const afterStatus = { receivedStatus: true, receivedDelta: false };
    const afterDelta = { receivedStatus: false, receivedDelta: true };
    const drop = new Error('Ask stream ended before a reply');
    if (shouldFallbackAskStream(drop, afterStatus)) jsonCalls += 1;
    if (shouldFallbackAskStream(drop, afterDelta)) jsonCalls += 1;
    assert.equal(shouldFallbackAskStream(drop, afterStatus), false);
    assert.equal(shouldFallbackAskStream(drop, afterDelta), false);
    assert.equal(jsonCalls, 0);
  });

  it('does not fall back on a server HTTP error or an SSE error event', () => {
    const nothing = emptyAskStreamProgress;
    assert.equal(shouldFallbackAskStream({ name: 'ApiError', status: 503 }, nothing), false);
    assert.equal(shouldFallbackAskStream({ name: 'ApiError', status: 500 }, nothing), false);
    assert.equal(shouldFallbackAskStream(new AskStreamServerError(ASK_FAILURE), nothing), false);
    assert.equal(shouldFallbackAskStream({ name: 'AskRateLimitError' }, nothing), false);
    assert.equal(shouldFallbackAskStream({ name: 'AbortError' }, nothing), false);
  });

  it('does not abort when the user switches tabs', () => {
    assert.equal(shouldAbortAskStream('blur'), false);
    assert.equal(shouldAbortAskStream('clear'), true);
    assert.equal(shouldAbortAskStream('unmount'), true);
  });

  it('detects an event-stream content type', () => {
    assert.equal(isEventStreamResponse('text/event-stream; charset=utf-8'), true);
    assert.equal(isEventStreamResponse('application/json'), false);
    assert.equal(isEventStreamResponse(null), false);
  });
});
