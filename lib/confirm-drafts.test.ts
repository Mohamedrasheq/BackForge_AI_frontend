import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  doneMetaLine,
  draftKindLabel,
  draftRemoveControl,
  isSaveableDraft,
  saveableDraftItems,
} from './confirm-drafts';

describe('ConfirmItems extension', () => {
  it('still saves a Capture draft from its text alone', () => {
    assert.equal(isSaveableDraft({ text: '  ' }), false);
    assert.equal(isSaveableDraft({ text: 'Pay rent' }), true);
    assert.equal(draftKindLabel(undefined), null);
    assert.deepEqual(draftRemoveControl(undefined, 0), {
      name: 'trash',
      tone: 'danger',
      accessibilityLabel: 'Delete item 1',
    });
    assert.deepEqual(
      saveableDraftItems([
        { text: ' Pay rent ', dueAt: null, folderId: 'home' },
        { text: '   ', dueAt: null, folderId: null },
      ]),
      [
        {
          text: 'Pay rent',
          dueAt: null,
          folderId: 'home',
          suggestedFolderId: null,
          suggestedCategory: null,
          suggestedIsNew: false,
        },
      ]
    );
  });

  it('counts a done card and a named edit, and skips a blank edit', () => {
    assert.equal(isSaveableDraft({ kind: 'done', itemId: 'rent-1', text: '' }), true);
    assert.equal(isSaveableDraft({ kind: 'done', text: 'Pay rent' }), false);
    assert.equal(isSaveableDraft({ kind: 'edit', itemId: 'gym-1', text: 'Gym' }), true);
    assert.equal(isSaveableDraft({ kind: 'edit', itemId: 'gym-1', text: '  ' }), false);
    assert.equal(isSaveableDraft({ kind: 'edit', text: 'Gym' }), false);
    const saved = saveableDraftItems([
      { kind: 'done', itemId: 'rent-1', text: '', dueAt: null, folderId: null },
      { kind: 'edit', itemId: 'gym-1', text: ' Gym ', dueAt: null, folderId: null },
    ]);
    assert.equal(saved.length, 2);
    assert.equal(saved[1]?.text, 'Gym');
  });

  it('uses skip, not delete, for edit and done', () => {
    assert.equal(draftKindLabel('edit'), 'Change');
    assert.equal(draftKindLabel('done'), 'Mark done');
    assert.deepEqual(draftRemoveControl('edit', 1), {
      name: 'xmark',
      tone: 'accent',
      accessibilityLabel: 'Skip change 2',
    });
    assert.deepEqual(draftRemoveControl('done', 2), {
      name: 'xmark',
      tone: 'accent',
      accessibilityLabel: 'Skip change 3',
    });
  });

  it('joins the read-only done line', () => {
    assert.equal(doneMetaLine('Wed, 14 Oct · 9:00 AM', null), 'Wed, 14 Oct · 9:00 AM · Unfiled');
    assert.equal(doneMetaLine(null, 'Home'), 'Home');
  });
});
