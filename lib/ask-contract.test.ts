import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ASK_CANDIDATE_LIMIT,
  ASK_DONE_UNKNOWN,
  ASK_FAILURE,
  ASK_OFF_TOPIC,
  askHistory,
  askRateLimitScope,
  deviceTimeZone,
  classifyAskReply,
  isAskFailureReply,
  isCandidateChoice,
  normalizeAskResponse,
  reviewChangesLabel,
  savedChangesLabel,
  showingLabel,
} from './ask-contract';

const rent = {
  id: 'rent-1',
  text: 'Pay rent',
  status: 'open' as const,
  dueAt: '2026-10-14T09:00:00.000Z',
  folderId: null,
  categoryName: null,
};

describe('normalizeAskResponse', () => {
  it('keeps add, edit, and done proposals and candidates', () => {
    const parsed = normalizeAskResponse({
      reply: 'Here is the change. Check it and confirm.',
      proposals: [
        {
          kind: 'add',
          text: 'Call the bank',
          dueAt: '2026-10-15T04:30:00.000Z',
          folderId: null,
          categoryName: 'Home',
        },
        { kind: 'edit', itemId: 'gym-1', dueAt: '2026-10-16T01:30:00.000Z' },
        { kind: 'done', itemId: 'rent-1' },
      ],
      candidates: [rent],
    });
    assert.ok(parsed);
    assert.deepEqual(
      parsed.proposals.map((proposal) => proposal.kind),
      ['add', 'edit', 'done']
    );
    assert.equal(parsed.candidates[0]?.text, 'Pay rent');
    assert.equal(parsed.showing, null);
  });

  it('reads snake_case item fields and drops a delete proposal', () => {
    const parsed = normalizeAskResponse({
      reply: "I can't delete tasks from here. You can delete it in All items.",
      proposals: [{ kind: 'delete', item_id: 'gym-1' }, { kind: 'done', item_id: 'gym-1' }],
      candidates: [{ id: 'gym-1', body: 'Gym', status: 'open', due_at: null, folder_id: 'work' }],
    });
    assert.ok(parsed);
    assert.deepEqual(
      parsed.proposals.map((proposal) => proposal.kind),
      ['done']
    );
    assert.equal(parsed.candidates[0]?.text, 'Gym');
    assert.equal(parsed.candidates[0]?.folderId, 'work');
  });

  it('keeps an edit field only when the response includes it', () => {
    const parsed = normalizeAskResponse({
      reply: 'Check it.',
      proposals: [{ kind: 'edit', itemId: 'gym-1', due_at: null }],
      candidates: [],
    });
    const edit = parsed?.proposals[0];
    assert.ok(edit && edit.kind === 'edit');
    assert.equal(edit.dueAt, null);
    assert.equal('text' in edit, false);
    assert.equal('folderId' in edit, false);
    assert.equal('suggested' in edit, false);
  });

  it('reads suggested on add and edit, and treats a missing field as false', () => {
    const parsed = normalizeAskResponse({
      reply: 'Check it.',
      proposals: [
        {
          kind: 'add',
          text: 'Call the bank',
          dueAt: '2026-10-15T04:30:00.000Z',
          folderId: null,
          categoryName: null,
          suggested: true,
        },
        { kind: 'add', text: 'Milk', dueAt: null, folderId: null, categoryName: null },
        { kind: 'edit', itemId: 'gym-1', dueAt: '2026-10-16T01:30:00.000Z', suggested: true },
        { kind: 'edit', itemId: 'rent-1', dueAt: '2026-10-16T01:30:00.000Z' },
      ],
      candidates: [],
    });
    const addSuggested = parsed?.proposals[0];
    const addPlain = parsed?.proposals[1];
    const editSuggested = parsed?.proposals[2];
    const editPlain = parsed?.proposals[3];
    assert.ok(addSuggested && addSuggested.kind === 'add');
    assert.equal(addSuggested.suggested, true);
    assert.ok(addPlain && addPlain.kind === 'add');
    assert.equal(addPlain.suggested, false);
    assert.ok(editSuggested && editSuggested.kind === 'edit');
    assert.equal(editSuggested.suggested, true);
    assert.ok(editPlain && editPlain.kind === 'edit');
    assert.equal('suggested' in editPlain, false);
  });

  it('caps candidates at five and reads a showing footer', () => {
    const candidates = Array.from({ length: 8 }, (_, index) => ({
      id: `id-${index}`,
      text: `Task ${index}`,
      status: 'open',
    }));
    const parsed = normalizeAskResponse({
      reply: 'Showing 50 of 312 open tasks.',
      proposals: [],
      candidates,
    });
    assert.equal(parsed?.candidates.length, ASK_CANDIDATE_LIMIT);
    assert.deepEqual(parsed?.showing, { shown: 50, total: 312 });
    assert.equal(showingLabel({ shown: 50, total: 312 }), 'Showing 50 of 312');
  });

  it('returns null when the reply is missing', () => {
    assert.equal(normalizeAskResponse({ proposals: [], candidates: [] }), null);
  });
});

describe('ask rate limit', () => {
  it('reads the minute and day scopes', () => {
    assert.equal(askRateLimitScope({ error: 'rate_limited', scope: 'minute' }, null), 'minute');
    assert.equal(askRateLimitScope({ error: 'rate_limited', scope: 'day', message: 'Tomorrow.' }, null), 'day');
  });

  it('uses Retry-After when the body has no scope', () => {
    assert.equal(askRateLimitScope({ error: 'rate_limited' }, '60'), 'minute');
    assert.equal(askRateLimitScope({ error: 'rate_limited' }, '86400'), 'day');
  });

  it('treats an unknown 429 as the minute lock', () => {
    assert.equal(askRateLimitScope({ error: 'slow down' }, null), 'minute');
  });
});

describe('reply classification', () => {
  it('marks the failure sentence, a delete refusal, and a miss', () => {
    assert.equal(isAskFailureReply(ASK_FAILURE), true);
    assert.equal(
      classifyAskReply({ reply: ASK_FAILURE, proposals: [], candidates: [] }),
      'answer'
    );
    assert.equal(
      classifyAskReply({
        reply: "I can't delete tasks from here. You can delete it in All items.",
        proposals: [],
        candidates: [],
      }),
      'delete'
    );
    assert.equal(
      classifyAskReply({
        reply: 'I couldn\'t find anything matching "unicorn".',
        proposals: [],
        candidates: [],
      }),
      'no-match'
    );
  });

  it('leaves off-topic and an unknown done date as a plain answer', () => {
    assert.equal(classifyAskReply({ reply: ASK_OFF_TOPIC, proposals: [], candidates: [] }), 'answer');
    assert.equal(
      classifyAskReply({ reply: ASK_DONE_UNKNOWN, proposals: [], candidates: [] }),
      'answer'
    );
  });

  it('treats two matches as a choice and a listed task as read-only', () => {
    const two = [rent, { ...rent, id: 'rent-2', text: 'Rent receipt', status: 'open' as const }];
    assert.equal(
      isCandidateChoice({
        reply: 'I found 2 open tasks matching "rent". Which one did you mean?',
        candidates: two,
      }),
      true
    );
    assert.equal(
      isCandidateChoice({ reply: '4 open tasks this week.', candidates: two }),
      false
    );
    assert.equal(
      classifyAskReply({
        reply: 'I found 2 open tasks matching "rent". Which one did you mean?',
        proposals: [],
        candidates: two,
      }),
      'answer'
    );
  });
});

describe('labels and history', () => {
  it('pluralises review and saved copy', () => {
    assert.equal(reviewChangesLabel(1), 'Review changes');
    assert.equal(reviewChangesLabel(3), 'Review 3 changes');
    assert.equal(savedChangesLabel(1), 'Saved 1 change.');
    assert.equal(savedChangesLabel(3), 'Saved 3 changes.');
  });

  it('reports the device timezone, falling back to UTC', () => {
    const zone = deviceTimeZone();
    assert.equal(typeof zone, 'string');
    assert.ok(zone.length > 0);
  });

  it('sends only the last six turns', () => {
    const turns = Array.from({ length: 8 }, (_, index) => ({
      role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `turn ${index}`,
    }));
    const history = askHistory(turns);
    assert.equal(history.length, 6);
    assert.equal(history[0]?.content, 'turn 2');
    assert.equal(history[5]?.content, 'turn 7');
  });
});
