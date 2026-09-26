/**
 * Client proposals for Review. Nothing here writes.
 * Confirm applies keep / move / drop with the existing item APIs.
 */

import { REVIEW_QUIET } from '@/constants/review';
import { isAfterLocalToday, isBeforeLocalToday, moveDueToLocalDay } from '@/lib/due';
import type { Item } from '@/types/api';

export type ReviewAction = 'keep' | 'move' | 'drop';

export type QuietReason = 'past_due' | 'untouched_due' | 'undated_sitting';

export type ReviewDraft = {
  id: string;
  text: string;
  originalText: string;
  action: ReviewAction;
  /** Day used when the action is Move. Prefilled; not written unless they confirm Move. */
  dueAt: string | null;
  suggestedDueAt: string;
  originalDueAt: string | null;
  folderId: string | null;
};

const DAY_MS = 86_400_000;

function ageInDays(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return null;
  return (now.getTime() - time) / DAY_MS;
}

/** Inside the last `days`, including a future timestamp. Missing or invalid is false. */
function isRecent(iso: string | null | undefined, days: number, now: Date): boolean {
  const age = ageInDays(iso, now);
  return age !== null && age < days;
}

function isAtLeastDaysAgo(iso: string | null | undefined, days: number, now: Date): boolean {
  const age = ageInDays(iso, now);
  return age !== null && age >= days;
}

function calendarDayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS;
}

/** Whole local calendar days from the due day to `now`. Positive when overdue. */
export function overdueCalendarDays(dueAt: string | null, now = new Date()): number | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;
  return calendarDayNumber(now) - calendarDayNumber(due);
}

function touchedAt(item: Pick<Item, 'createdAt' | 'updatedAt'>): string | null {
  return item.updatedAt ?? item.createdAt;
}

export function quietReason(
  item: Pick<Item, 'id' | 'status' | 'dueAt' | 'createdAt' | 'updatedAt'>,
  now = new Date(),
  reviewedAt: Record<string, string> = {}
): QuietReason | null {
  if (item.status !== 'open') return null;
  if (isRecent(item.createdAt, REVIEW_QUIET.recentCreatedDays, now)) return null;
  if (isRecent(reviewedAt[item.id], REVIEW_QUIET.recentReviewedDays, now)) return null;

  if (item.dueAt && isBeforeLocalToday(item.dueAt, now)) return 'past_due';

  const touched = touchedAt(item);
  if (item.dueAt && isAtLeastDaysAgo(touched, REVIEW_QUIET.untouchedWithDueDays, now)) {
    return 'untouched_due';
  }
  if (!item.dueAt && isAtLeastDaysAgo(touched, REVIEW_QUIET.undatedSittingDays, now)) {
    return 'undated_sitting';
  }
  return null;
}

export function quietOpenItems(
  items: Item[],
  reviewedAt: Record<string, string> = {},
  now = new Date()
): Item[] {
  return items.filter((item) => quietReason(item, now, reviewedAt) !== null);
}

/**
 * Suggested Move day.
 * A due time still on a later calendar day is kept.
 * Past due or due today moves to tomorrow at the same local time.
 * Undated items land tomorrow morning.
 */
export function suggestMoveDue(item: Pick<Item, 'dueAt'>, now = new Date()): string {
  if (item.dueAt && isAfterLocalToday(item.dueAt, now)) return item.dueAt;

  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    REVIEW_QUIET.suggestedHour,
    0,
    0,
    0
  );
  if (item.dueAt) return moveDueToLocalDay(item.dueAt, tomorrow, now);
  return tomorrow.toISOString();
}

export function proposeReviewAction(
  item: Pick<Item, 'dueAt'>,
  reason: QuietReason,
  now = new Date()
): ReviewAction {
  if (reason === 'undated_sitting') return 'drop';
  if (reason === 'untouched_due') return 'keep';
  const overdue = overdueCalendarDays(item.dueAt, now);
  if (overdue !== null && overdue >= REVIEW_QUIET.staleOverdueDays) return 'drop';
  return 'move';
}

export function buildReviewDrafts(
  items: Item[],
  now = new Date(),
  reviewedAt: Record<string, string> = {}
): ReviewDraft[] {
  const drafts: ReviewDraft[] = [];
  for (const item of items) {
    const reason = quietReason(item, now, reviewedAt);
    if (!reason) continue;
    const suggestedDueAt = suggestMoveDue(item, now);
    drafts.push({
      id: item.id,
      text: item.text,
      originalText: item.text,
      action: proposeReviewAction(item, reason, now),
      dueAt: suggestedDueAt,
      suggestedDueAt,
      originalDueAt: item.dueAt,
      folderId: item.folderId,
    });
  }
  return drafts;
}

/** Blocks Confirm before any write. Null means the batch can be applied. */
export function reviewConfirmError(rows: Pick<ReviewDraft, 'action' | 'text' | 'dueAt'>[]): string | null {
  for (const row of rows) {
    if (row.action === 'drop') continue;
    if (!row.text.trim()) return 'Add a title, or drop the blank ones.';
    if (row.action === 'move' && !row.dueAt) return 'Pick a day for each item you are moving.';
  }
  return null;
}

/** Drop timestamps that are outside the cool-down window. */
export function pruneReviewedAt(
  map: Record<string, string>,
  now = new Date()
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [id, stamp] of Object.entries(map)) {
    if (!id || !isRecent(stamp, REVIEW_QUIET.recentReviewedDays, now)) continue;
    const date = new Date(stamp);
    if (Number.isNaN(date.getTime())) continue;
    next[id] = date.toISOString();
  }
  return next;
}

export function reviewEntryTitle(count: number): string {
  return count === 1 ? 'An item went quiet' : 'A few items went quiet';
}
