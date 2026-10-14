import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ASK_FAILURE,
  ASK_MINUTE_COOLDOWN_MS,
  ASK_RATE_DAY,
  ASK_RATE_MINUTE,
  type AskResponse,
} from './ask-contract';
import {
  askReducer,
  canSend,
  composerPlaceholder,
  historyFromMessages,
  initialAskSession,
  rateLimitCaption,
  type AskSessionState,
} from './ask-session';

const NOW = 1_700_000_000_000;

function response(patch: Partial<AskResponse> = {}): AskResponse {
  return {
    reply: 'Four open tasks this week.',
    proposals: [],
    candidates: [],
    showing: null,
    ...patch,
  };
}

function send(state: AskSessionState, text: string, id = 'user-1'): AskSessionState {
  return askReducer(state, { type: 'send', id, text, now: NOW });
}

describe('askReducer send and answers', () => {
  it('appends the user message and waits', () => {
    const next = send(initialAskSession, '  What\'s due this week?  ');
    assert.equal(next.pending, true);
    assert.equal(next.messages[0]?.role, 'user');
    assert.equal(next.messages[0] && next.messages[0].role === 'user' ? next.messages[0].text : '', "What's due this week?");
    assert.equal(next.error, null);
  });

  it('ignores empty and whitespace messages', () => {
    assert.equal(canSend(initialAskSession, '   ', NOW), false);
    assert.equal(askReducer(initialAskSession, { type: 'send', id: 'u', text: '   ', now: NOW }), initialAskSession);
  });

  it('caps a message at 500 characters', () => {
    const next = send(initialAskSession, 'a'.repeat(640));
    const text = next.messages[0] && next.messages[0].role === 'user' ? next.messages[0].text : '';
    assert.equal(text.length, 500);
  });

  it('adds an answer card and clears the wait', () => {
    const waiting = send(initialAskSession, 'Plan my day');
    const next = askReducer(waiting, {
      type: 'answered',
      requestId: waiting.requestId,
      id: 'answer-1',
      response: response({
        proposals: [{ kind: 'add', text: 'Email', dueAt: null, folderId: null, categoryName: null }],
      }),
    });
    assert.equal(next.pending, false);
    const answer = next.messages[1];
    assert.ok(answer && answer.role === 'assistant');
    assert.equal(answer.review, 'open');
    assert.equal(answer.proposals.length, 1);
  });

  it('keeps the user message and shows no answer card when the reply fails', () => {
    const waiting = send(initialAskSession, 'Plan my day');
    const next = askReducer(waiting, {
      type: 'answered',
      requestId: waiting.requestId,
      id: 'answer-1',
      response: response({ reply: ASK_FAILURE }),
    });
    assert.equal(next.messages.length, 1);
    assert.equal(next.pending, false);
    assert.equal(next.error, ASK_FAILURE);
  });

  it('keeps the failed message and retry does not add another one', () => {
    const waiting = send(initialAskSession, 'Plan my day');
    const failed = askReducer(waiting, { type: 'failed', requestId: waiting.requestId });
    assert.equal(failed.messages.length, 1);
    assert.equal(failed.error, ASK_FAILURE);
    const retried = askReducer(failed, { type: 'retry', now: NOW });
    assert.equal(retried.messages.length, 1);
    assert.equal(retried.pending, true);
    assert.equal(retried.error, null);
    assert.equal(retried.requestId, failed.requestId + 1);
  });

  it('ignores a stale response after clear', () => {
    const waiting = send(initialAskSession, 'Plan my day');
    const cleared = askReducer(waiting, { type: 'clear' });
    const stale = askReducer(cleared, {
      type: 'answered',
      requestId: waiting.requestId,
      id: 'answer-1',
      response: response(),
    });
    assert.equal(stale.messages.length, 0);
    assert.equal(stale.pending, false);
  });
});

describe('askReducer rate limit', () => {
  it('locks send for a minute without an error banner', () => {
    const waiting = send(initialAskSession, 'Anything overdue?');
    const next = askReducer(waiting, {
      type: 'rate-limited',
      requestId: waiting.requestId,
      scope: 'minute',
      now: NOW,
    });
    assert.equal(next.error, null);
    assert.equal(next.pending, false);
    assert.equal(next.messages.length, 1);
    assert.equal(next.minuteLockedUntil, NOW + ASK_MINUTE_COOLDOWN_MS);
    assert.equal(canSend(next, 'again', NOW + 1000), false);
    assert.equal(composerPlaceholder(next, NOW + 1000), 'Back in a minute');
    assert.equal(rateLimitCaption(next, NOW + 1000), ASK_RATE_MINUTE);
    const lifted = askReducer(next, { type: 'tick', now: NOW + ASK_MINUTE_COOLDOWN_MS });
    assert.equal(lifted.minuteLockedUntil, null);
    assert.equal(canSend(lifted, 'again', NOW + ASK_MINUTE_COOLDOWN_MS), true);
  });

  it('locks the composer for the session on a day limit', () => {
    const waiting = send(initialAskSession, 'Anything overdue?');
    const next = askReducer(waiting, {
      type: 'rate-limited',
      requestId: waiting.requestId,
      scope: 'day',
      now: NOW,
    });
    assert.equal(next.dayLocked, true);
    assert.equal(next.error, null);
    assert.equal(canSend(next, 'tomorrow', NOW + 86_400_000), false);
    assert.equal(composerPlaceholder(next, NOW), 'Back tomorrow');
    assert.equal(rateLimitCaption(next, NOW), ASK_RATE_DAY);
    const cleared = askReducer(next, { type: 'clear' });
    assert.equal(cleared.messages.length, 0);
    assert.equal(cleared.dayLocked, true);
  });
});

describe('askReducer choices and confirm', () => {
  it('sends the picked task and remembers the choice', () => {
    const waiting = send(initialAskSession, 'Mark rent as done', 'user-1');
    const answered = askReducer(waiting, {
      type: 'answered',
      requestId: waiting.requestId,
      id: 'answer-1',
      response: response({
        reply: 'I found 2 open tasks matching "rent". Which one did you mean?',
        candidates: [
          {
            id: 'rent-1',
            text: 'Pay rent',
            status: 'open',
            dueAt: '2026-10-14T09:00:00.000Z',
            folderId: null,
            categoryName: null,
          },
          {
            id: 'rent-2',
            text: 'Rent receipt',
            status: 'open',
            dueAt: null,
            folderId: null,
            categoryName: null,
          },
        ],
      }),
    });
    const picked = askReducer(answered, {
      type: 'pick',
      messageId: 'answer-1',
      candidateId: 'rent-1',
      text: 'Pay rent (Wed, 14 Oct)',
      id: 'user-2',
      now: NOW,
    });
    const card = picked.messages[1];
    assert.ok(card && card.role === 'assistant');
    assert.equal(card.pickedCandidateId, 'rent-1');
    const followUp = picked.messages[2];
    assert.ok(followUp && followUp.role === 'user');
    assert.equal(followUp.text, 'Pay rent (Wed, 14 Oct)');
    assert.equal(picked.pending, true);
    const again = askReducer(picked, {
      type: 'pick',
      messageId: 'answer-1',
      candidateId: 'rent-2',
      text: 'Rent receipt',
      id: 'user-3',
      now: NOW,
    });
    assert.equal(again, picked);
  });

  it('marks the review saved and adds the saved line', () => {
    const waiting = send(initialAskSession, 'Move gym to Friday');
    const answered = askReducer(waiting, {
      type: 'answered',
      requestId: waiting.requestId,
      id: 'answer-1',
      response: response({
        proposals: [{ kind: 'edit', itemId: 'gym-1', dueAt: '2026-10-16T01:30:00.000Z' }],
      }),
    });
    const saved = askReducer(answered, {
      type: 'saved',
      messageId: 'answer-1',
      count: 1,
      id: 'saved-1',
    });
    const card = saved.messages[1];
    assert.ok(card && card.role === 'assistant');
    assert.equal(card.review, 'saved');
    const note = saved.messages[2];
    assert.ok(note && note.role === 'assistant');
    assert.equal(note.text, 'Saved 1 change.');
    assert.equal(note.variant, 'saved');
  });

  it('builds history from earlier turns and skips the saved note', () => {
    let state = send(initialAskSession, 'one', 'u1');
    state = askReducer(state, {
      type: 'answered',
      requestId: state.requestId,
      id: 'a1',
      response: response({ reply: 'first' }),
    });
    state = askReducer(state, { type: 'saved', messageId: 'a1', count: 2, id: 's1' });
    state = askReducer(state, { type: 'send', id: 'u2', text: 'two', now: NOW });
    const history = historyFromMessages(state.messages.slice(0, -1));
    assert.deepEqual(history, [
      { role: 'user', content: 'one' },
      { role: 'assistant', content: 'first' },
    ]);
  });
});
