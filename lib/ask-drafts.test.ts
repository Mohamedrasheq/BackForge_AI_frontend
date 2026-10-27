import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Item } from '../types/api';
import {
  applyPlannedWrites,
  askWriteHandlers,
  candidateAccessibilityLabel,
  candidateFollowUp,
  formatWasDue,
  planAskWrites,
  proposalToDraftSeed,
  wasLine,
} from './ask-drafts';

const gym: Item = {
  id: 'gym-1',
  text: 'Gym',
  status: 'open',
  dueAt: new Date(2026, 9, 15, 7, 0).toISOString(),
  createdAt: null,
  updatedAt: null,
  folderId: null,
};

describe('proposal drafts', () => {
  it('prefills an edit with the new due and the previous values', () => {
    const friday = new Date(2026, 9, 16, 7, 0).toISOString();
    const seed = proposalToDraftSeed(
      { kind: 'edit', itemId: 'gym-1', dueAt: friday },
      [gym],
      []
    );
    assert.equal(seed.kind, 'edit');
    assert.equal(seed.itemId, 'gym-1');
    assert.equal(seed.text, 'Gym');
    assert.equal(seed.dueAt, friday);
    assert.equal(seed.categoryChosen, true);
    assert.deepEqual(seed.was, { text: 'Gym', dueAt: gym.dueAt, categoryName: null });
  });

  it('marks a done card read-only with the saved task', () => {
    const seed = proposalToDraftSeed({ kind: 'done', itemId: 'gym-1' }, [gym], []);
    assert.equal(seed.kind, 'done');
    assert.equal(seed.itemId, 'gym-1');
    assert.equal(seed.text, 'Gym');
    assert.equal(seed.was, undefined);
    assert.equal(seed.suggested, undefined);
  });

  it('copies suggested time from add and edit proposals', () => {
    const friday = new Date(2026, 9, 16, 9, 0).toISOString();
    const add = proposalToDraftSeed(
      {
        kind: 'add',
        text: 'Call the bank',
        dueAt: friday,
        folderId: null,
        categoryName: null,
        suggested: true,
      },
      [],
      []
    );
    assert.equal(add.suggested, true);
    const edit = proposalToDraftSeed(
      { kind: 'edit', itemId: 'gym-1', dueAt: friday, suggested: true },
      [gym],
      []
    );
    assert.equal(edit.suggested, true);
    const unsigned = proposalToDraftSeed(
      { kind: 'add', text: 'Milk', dueAt: friday, folderId: null, categoryName: null },
      [],
      []
    );
    assert.equal(unsigned.suggested, false);
  });

  it('writes only the due when that is what changed', () => {
    const friday = new Date(2026, 9, 16, 7, 0).toISOString();
    const writes = planAskWrites(
      [
        {
          key: 'draft-1',
          kind: 'edit',
          itemId: 'gym-1',
          text: 'Gym',
          dueAt: friday,
          folderId: null,
          categoryName: null,
          was: { text: 'Gym', dueAt: gym.dueAt, categoryName: null },
        },
      ],
      new Map([[gym.id, gym]])
    );
    assert.deepEqual(writes, [{ key: 'draft-1', op: 'edit', itemId: 'gym-1', patch: { dueAt: friday } }]);
  });

  it('shows a Was line for the fields that differ', () => {
    const line = wasLine({
      kind: 'edit',
      text: 'Morning gym',
      dueAt: new Date(2026, 9, 16, 7, 0).toISOString(),
      categoryName: 'Health',
      was: { text: 'Gym', dueAt: gym.dueAt, categoryName: null },
    });
    assert.equal(line, `Was: "Gym" · ${formatWasDue(gym.dueAt)} · Unfiled`);
    assert.equal(formatWasDue(gym.dueAt), 'Thu, 15 Oct 7:00 AM');
    assert.equal(
      wasLine({
        kind: 'edit',
        text: 'Gym',
        dueAt: gym.dueAt,
        categoryName: null,
        was: { text: 'Gym', dueAt: gym.dueAt, categoryName: null },
      }),
      null
    );
  });
});

describe('candidate follow-ups', () => {
  it('names the task and its due day', () => {
    const dueAt = new Date(2026, 9, 14, 9, 0).toISOString();
    assert.equal(candidateFollowUp({ text: 'Pay rent', dueAt }), 'Pay rent (Wed, 14 Oct)');
    assert.equal(
      candidateAccessibilityLabel({ text: 'Pay rent', dueAt }),
      'Pay rent, due Wednesday 14 October, choose this task'
    );
    assert.equal(candidateFollowUp({ text: 'Rent receipt', dueAt: null }), 'Rent receipt');
  });
});

describe('apply', () => {
  it('stops after a failure and keeps the writes that landed', async () => {
    const calls: string[] = [];
    const result = await applyPlannedWrites(
      [
        {
          key: 'a',
          op: 'add',
          item: {
            text: 'Milk',
            dueAt: null,
            folderId: null,
            suggestedFolderId: null,
            suggestedCategory: null,
            suggestedIsNew: false,
          },
        },
        { key: 'b', op: 'done', itemId: 'rent-1' },
        {
          key: 'c',
          op: 'add',
          item: {
            text: 'Eggs',
            dueAt: null,
            folderId: null,
            suggestedFolderId: null,
            suggestedCategory: null,
            suggestedIsNew: false,
          },
        },
      ],
      {
        add: async (item) => {
          calls.push(item.text);
          if (item.text === 'Eggs') throw new Error('Could not save that');
        },
        edit: async () => {
          throw new Error('unused');
        },
        done: async (id) => {
          calls.push(id);
        },
      }
    );
    assert.deepEqual(result.savedKeys, ['a', 'b']);
    assert.equal(result.error, 'Could not save that');
    assert.deepEqual(calls, ['Milk', 'rent-1', 'Eggs']);
  });

  it('sends source ask on add, edit, and done', async () => {
    const sources: string[] = [];
    const handlers = askWriteHandlers({
      add: async (_items, source) => {
        sources.push(source);
      },
      edit: async (_id, _patch, source) => {
        sources.push(source);
      },
      done: async (_id, source) => {
        sources.push(source);
      },
    });
    await handlers.add({
      text: 'Milk',
      dueAt: null,
      folderId: null,
      suggestedFolderId: null,
      suggestedCategory: null,
      suggestedIsNew: false,
    });
    await handlers.edit('gym-1', { dueAt: gym.dueAt });
    await handlers.done('rent-1');
    assert.deepEqual(sources, ['ask', 'ask', 'ask']);
  });
});
