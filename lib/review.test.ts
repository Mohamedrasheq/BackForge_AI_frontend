import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { REVIEW_QUIET } from '../constants/review';
import {
  buildReviewDrafts,
  overdueCalendarDays,
  proposeReviewAction,
  pruneReviewedAt,
  quietOpenItems,
  quietReason,
  reviewConfirmError,
  reviewEntryTitle,
  suggestMoveDue,
} from './review';
import { reviewHrefFromNotificationData } from './review-push';
import type { Item } from '../types/api';

const NOW = new Date(2026, 8, 26, 15, 0, 0);
const DAY = 86_400_000;

function item(patch: Partial<Item> = {}): Item {
  return {
    id: 'item-1',
    text: 'Pay rent',
    status: 'open',
    dueAt: null,
    createdAt: new Date(NOW.getTime() - 30 * DAY).toISOString(),
    updatedAt: null,
    folderId: null,
    ...patch,
  };
}

describe('quietReason', () => {
  it('includes an open item that is past due', () => {
    const dueAt = new Date(2026, 8, 25, 9, 0, 0).toISOString();
    assert.equal(quietReason(item({ dueAt }), NOW), 'past_due');
  });

  it('skips items created inside the recent window, even when past due', () => {
    const dueAt = new Date(2026, 8, 25, 9, 0, 0).toISOString();
    const createdAt = new Date(NOW.getTime() - DAY).toISOString();
    assert.equal(quietReason(item({ dueAt, createdAt }), NOW), null);
  });

  it('skips items reviewed inside the cool-down', () => {
    const dueAt = new Date(2026, 8, 20, 9, 0, 0).toISOString();
    const reviewedAt = { 'item-1': new Date(NOW.getTime() - DAY).toISOString() };
    assert.equal(quietReason(item({ dueAt }), NOW, reviewedAt), null);
  });

  it('includes a past-due item once the review cool-down has passed', () => {
    const dueAt = new Date(2026, 8, 20, 9, 0, 0).toISOString();
    const reviewedAt = { 'item-1': new Date(NOW.getTime() - 8 * DAY).toISOString() };
    assert.equal(quietReason(item({ dueAt }), NOW, reviewedAt), 'past_due');
  });

  it('includes an untouched item that still has a future due', () => {
    const dueAt = new Date(2026, 8, 30, 9, 0, 0).toISOString();
    assert.equal(quietReason(item({ dueAt }), NOW), 'untouched_due');
  });

  it('skips a future item that was touched recently', () => {
    const dueAt = new Date(2026, 8, 30, 9, 0, 0).toISOString();
    const updatedAt = new Date(NOW.getTime() - DAY).toISOString();
    assert.equal(quietReason(item({ dueAt, updatedAt }), NOW), null);
  });

  it('treats a same-day due as untouched rather than past due', () => {
    const dueAt = new Date(2026, 8, 26, 9, 0, 0).toISOString();
    assert.equal(quietReason(item({ dueAt }), NOW), 'untouched_due');
  });

  it('includes an undated item that has been sitting', () => {
    const createdAt = new Date(NOW.getTime() - REVIEW_QUIET.undatedSittingDays * DAY).toISOString();
    assert.equal(quietReason(item({ createdAt, dueAt: null }), NOW), 'undated_sitting');
  });

  it('leaves a newer undated item off Review and off any forced date', () => {
    const createdAt = new Date(NOW.getTime() - (REVIEW_QUIET.undatedSittingDays - 1) * DAY).toISOString();
    assert.equal(quietReason(item({ createdAt, dueAt: null }), NOW), null);
  });

  it('does not guess when an undated item has no timestamp', () => {
    assert.equal(quietReason(item({ createdAt: null, updatedAt: null, dueAt: null }), NOW), null);
  });

  it('ignores done items', () => {
    const dueAt = new Date(2026, 8, 1, 9, 0, 0).toISOString();
    assert.equal(quietReason(item({ status: 'done', dueAt }), NOW), null);
  });
});

describe('proposals', () => {
  it('moves a recently overdue item to tomorrow at the same time', () => {
    const dueAt = new Date(2026, 8, 25, 18, 30, 0).toISOString();
    const row = item({ dueAt });
    assert.equal(proposeReviewAction(row, 'past_due', NOW), 'move');
    const suggested = new Date(suggestMoveDue(row, NOW));
    assert.equal(suggested.getFullYear(), 2026);
    assert.equal(suggested.getMonth(), 8);
    assert.equal(suggested.getDate(), 27);
    assert.equal(suggested.getHours(), 18);
    assert.equal(suggested.getMinutes(), 30);
  });

  it('drops an item that is past due past the stale threshold', () => {
    const dueAt = new Date(2026, 8, 12, 10, 0, 0).toISOString();
    assert.equal(overdueCalendarDays(dueAt, NOW), 14);
    assert.equal(proposeReviewAction(item({ dueAt }), 'past_due', NOW), 'drop');
  });

  it('keeps an untouched item whose due is still ahead', () => {
    const dueAt = new Date(2026, 9, 2, 11, 0, 0).toISOString();
    const row = item({ dueAt });
    assert.equal(proposeReviewAction(row, 'untouched_due', NOW), 'keep');
    assert.equal(suggestMoveDue(row, NOW), dueAt);
  });

  it('drops a long-sitting undated item and suggests tomorrow morning if moved', () => {
    const row = item({ dueAt: null });
    assert.equal(proposeReviewAction(row, 'undated_sitting', NOW), 'drop');
    const suggested = new Date(suggestMoveDue(row, NOW));
    assert.equal(suggested.getDate(), 27);
    assert.equal(suggested.getHours(), REVIEW_QUIET.suggestedHour);
    assert.equal(suggested.getMinutes(), 0);
  });

  it('builds one draft per quiet item and prefills Move', () => {
    const quiet = item({ id: 'quiet', dueAt: new Date(2026, 8, 24, 8, 0, 0).toISOString() });
    const fresh = item({
      id: 'fresh',
      dueAt: new Date(2026, 8, 20, 8, 0, 0).toISOString(),
      createdAt: new Date(NOW.getTime() - DAY).toISOString(),
    });
    const drafts = buildReviewDrafts([fresh, quiet], NOW);
    assert.equal(drafts.length, 1);
    assert.equal(drafts[0]?.id, 'quiet');
    assert.equal(drafts[0]?.action, 'move');
    assert.ok(drafts[0]?.dueAt);
  });

  it('filters the open list down to quiet items', () => {
    const rows = quietOpenItems(
      [
        item({ id: 'done', status: 'done', dueAt: new Date(2026, 8, 1).toISOString() }),
        item({ id: 'quiet', dueAt: new Date(2026, 8, 1, 9).toISOString() }),
      ],
      {},
      NOW
    );
    assert.deepEqual(rows.map((row) => row.id), ['quiet']);
  });
});

describe('confirm guard', () => {
  it('asks for a title before a blank keep is written', () => {
    assert.equal(
      reviewConfirmError([{ action: 'keep', text: '   ', dueAt: null }]),
      'Add a title, or drop the blank ones.'
    );
  });

  it('asks for a day before a dateless move is written', () => {
    assert.equal(
      reviewConfirmError([{ action: 'move', text: 'Call back', dueAt: null }]),
      'Pick a day for each item you are moving.'
    );
  });

  it('allows a drop with no title and a filled keep', () => {
    assert.equal(
      reviewConfirmError([
        { action: 'drop', text: '', dueAt: null },
        { action: 'keep', text: 'Still mine', dueAt: null },
      ]),
      null
    );
  });
});

describe('review memory and entry', () => {
  it('drops cool-down stamps that are older than the window', () => {
    const kept = new Date(NOW.getTime() - DAY).toISOString();
    const stale = new Date(NOW.getTime() - 8 * DAY).toISOString();
    const pruned = pruneReviewedAt({ kept, stale, '': kept }, NOW);
    assert.deepEqual(Object.keys(pruned), ['kept']);
  });

  it('uses the singular entry line for one item', () => {
    assert.equal(reviewEntryTitle(1), 'An item went quiet');
    assert.equal(reviewEntryTitle(4), 'A few items went quiet');
  });
});

describe('push hook', () => {
  it('opens Review only for a future review nudge', () => {
    assert.equal(reviewHrefFromNotificationData({ type: 'review' }), '/review');
    assert.equal(reviewHrefFromNotificationData({ type: 'due' }), null);
    assert.equal(reviewHrefFromNotificationData(null), null);
    assert.equal(reviewHrefFromNotificationData('review'), null);
  });
});
