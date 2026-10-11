import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Item } from '../types/api';
import {
  CLEAR_DATE_LABEL,
  DATE_FILTER_EMPTY_DESCRIPTION,
  activeDatePillLabel,
  buildMonthGrid,
  calendarDayFromDate,
  countItemsByDueDay,
  dateChipLabel,
  dateFilterButtonLabel,
  dateFilterEmptyTitle,
  dayAccessibilityLabel,
  dayKey,
  dueDot,
  dueLocalDayKey,
  filterItemsByStatusAndDay,
  localeWeekStartsOn,
  longDateLabel,
  monthDelta,
  monthSwipeDelta,
  monthTitle,
  shiftMonth,
  toggleSelectedDay,
  weekdayInitials,
  weekStartsOnFromFirstDay,
  type CalendarDay,
} from './date-filter';

const NOW = new Date(2026, 9, 11, 15, 30, 0);
const THU_15: CalendarDay = { year: 2026, month: 10, day: 15 };
const TODAY: CalendarDay = { year: 2026, month: 10, day: 11 };

function item(patch: Partial<Item> & Pick<Item, 'id'>): Item {
  return {
    text: 'Task',
    status: 'open',
    dueAt: null,
    createdAt: null,
    updatedAt: null,
    folderId: null,
    ...patch,
  };
}

function at(year: number, month: number, day: number, hour = 9, minute = 0): string {
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

describe('week start', () => {
  it('maps ISO first-day (Monday 1 … Sunday 7) onto JS weekday indexes', () => {
    assert.equal(weekStartsOnFromFirstDay(1), 1);
    assert.equal(weekStartsOnFromFirstDay(7), 0);
    assert.equal(weekStartsOnFromFirstDay(0), null);
    assert.equal(weekStartsOnFromFirstDay(8), null);
  });

  it('uses the locale week, with Sunday for en-US and Monday for en-GB', () => {
    assert.equal(localeWeekStartsOn('en-US'), 0);
    assert.equal(localeWeekStartsOn('en-GB'), 1);
    assert.equal(localeWeekStartsOn('de-DE'), 1);
    assert.equal(localeWeekStartsOn('ja-JP'), 0);
  });

  it('falls back to Monday when the locale cannot provide week info', () => {
    assert.equal(localeWeekStartsOn('not a locale'), 1);
  });
});

describe('buildMonthGrid', () => {
  it('always returns 6 rows and leaves days outside the month blank', () => {
    const sunday = buildMonthGrid(2026, 10, 0);
    assert.equal(sunday.length, 6);
    assert.ok(sunday.every((week) => week.length === 7));

    const flat = sunday.flat();
    assert.equal(flat.length, 42);
    assert.deepEqual(
      flat.flatMap((cell) => (cell ? [cell.day] : [])),
      Array.from({ length: 31 }, (_, index) => index + 1)
    );
    assert.ok(flat.slice(0, 4).every((cell) => cell === null));
    assert.ok(flat.slice(35).every((cell) => cell === null));
    assert.ok(flat.every((cell) => cell === null || (cell.month === 10 && cell.year === 2026)));

    const monday = buildMonthGrid(2026, 10, 1);
    assert.deepEqual(
      monday[0].map((cell) => cell?.day ?? null),
      [null, null, null, 1, 2, 3, 4]
    );
  });

  it('keeps six rows when the month fits in fewer, including a Sunday the 1st', () => {
    const weeks = buildMonthGrid(2026, 2, 0);
    assert.equal(weeks.length, 6);
    assert.deepEqual(
      weeks[0].map((cell) => cell?.day ?? null),
      [1, 2, 3, 4, 5, 6, 7]
    );
    assert.equal(
      weeks.flat().filter((cell) => cell !== null).length,
      28
    );

    const monday = buildMonthGrid(2026, 2, 1);
    assert.deepEqual(
      monday[0].map((cell) => cell?.day ?? null),
      [null, null, null, null, null, null, 1]
    );
  });
});

describe('shiftMonth', () => {
  it('crosses year boundaries in either direction with no range cap', () => {
    assert.deepEqual(shiftMonth(2026, 12, 1), { year: 2027, month: 1 });
    assert.deepEqual(shiftMonth(2026, 1, -1), { year: 2025, month: 12 });
    assert.deepEqual(shiftMonth(2026, 10, 120), { year: 2036, month: 10 });
    assert.deepEqual(shiftMonth(2026, 10, -120), { year: 2016, month: 10 });
  });

  it('measures the jump to another month, including the current month', () => {
    assert.equal(monthDelta({ year: 2026, month: 10 }, { year: 2026, month: 10 }), 0);
    assert.equal(monthDelta({ year: 2026, month: 10 }, { year: 2026, month: 11 }), 1);
    assert.equal(monthDelta({ year: 2026, month: 10 }, { year: 2026, month: 9 }), -1);
    assert.equal(monthDelta({ year: 2026, month: 1 }, { year: 2025, month: 12 }), -1);
    assert.equal(monthDelta({ year: 2026, month: 10 }, { year: 2027, month: 1 }), 3);
  });
});

describe('month swipe', () => {
  it('changes month on a long drag or a flick, and ignores a short drag', () => {
    assert.equal(monthSwipeDelta(-40, 0), 1);
    assert.equal(monthSwipeDelta(40, 0), -1);
    assert.equal(monthSwipeDelta(-8, -500), 1);
    assert.equal(monthSwipeDelta(8, 500), -1);
    assert.equal(monthSwipeDelta(20, 100), 0);
    assert.equal(monthSwipeDelta(0, 0), 0);
  });

  it('follows the drag when the flick points the other way', () => {
    assert.equal(monthSwipeDelta(-40, 500), 1);
    assert.equal(monthSwipeDelta(40, -500), -1);
  });
});

describe('toggleSelectedDay', () => {
  it('selects a day, replaces the selection, and clears when that day is tapped again', () => {
    assert.deepEqual(toggleSelectedDay(null, THU_15), THU_15);
    assert.equal(toggleSelectedDay(THU_15, { year: 2026, month: 10, day: 15 }), null);
    assert.deepEqual(toggleSelectedDay(THU_15, TODAY), TODAY);
  });
});

describe('labels', () => {
  it('shows the year on the month title only outside the current year', () => {
    assert.equal(monthTitle(2026, 10, NOW, 'en-US'), 'October');
    assert.equal(monthTitle(2027, 1, NOW, 'en-US'), 'January 2027');
    assert.equal(monthTitle(2025, 12, NOW, 'en-US'), 'December 2025');
  });

  it('formats the pill as weekday, day, month, and uses Today for the local today', () => {
    assert.equal(dateChipLabel(THU_15, 'en-US'), 'Thu, 15 Oct');
    assert.equal(activeDatePillLabel(THU_15, NOW, 'en-US'), 'Thu, 15 Oct');
    assert.equal(activeDatePillLabel(TODAY, NOW, 'en-US'), 'Today, 11 Oct');
  });

  it('builds empty-state copy and the calendar button label', () => {
    assert.equal(dateFilterEmptyTitle('open', THU_15, 'en-US'), 'Nothing due on Thu, 15 Oct');
    assert.equal(dateFilterEmptyTitle('done', THU_15, 'en-US'), 'Nothing done for Thu, 15 Oct');
    assert.equal(DATE_FILTER_EMPTY_DESCRIPTION, 'Pick another day or clear the date');
    assert.equal(CLEAR_DATE_LABEL, 'Clear date');
    assert.equal(dateFilterButtonLabel(null), 'Filter by date');
    assert.equal(
      dateFilterButtonLabel(THU_15, 'en-US'),
      'Filter by date, Thursday 15 October selected'
    );
    assert.equal(longDateLabel(THU_15, 'en-US'), 'Thursday 15 October');
  });

  it('orders weekday initials from the week start', () => {
    assert.deepEqual(weekdayInitials(0, 'en-US'), ['S', 'M', 'T', 'W', 'T', 'F', 'S']);
    assert.deepEqual(weekdayInitials(1, 'en-US'), ['M', 'T', 'W', 'T', 'F', 'S', 'S']);
  });
});

describe('due dots and filtering', () => {
  const openToday = item({ id: 'open-today', dueAt: at(2026, 10, 11, 8), folderId: 'work' });
  const openLater = item({
    id: 'open-later',
    dueAt: at(2026, 10, 11, 23, 59),
    folderId: 'home',
  });
  const doneToday = item({ id: 'done-today', status: 'done', dueAt: at(2026, 10, 11, 12) });
  const overdue = item({ id: 'overdue', dueAt: at(2026, 10, 1, 9) });
  const doneOnly = item({ id: 'done-only', status: 'done', dueAt: at(2026, 10, 15, 9) });
  const undatedOpen = item({ id: 'undated-open' });
  const undatedDone = item({ id: 'undated-done', status: 'done' });
  const invalid = item({ id: 'invalid', dueAt: 'not-a-date' });
  const items = [openToday, openLater, doneToday, overdue, doneOnly, undatedOpen, undatedDone, invalid];

  it('reads the local calendar day, including late and early times', () => {
    assert.equal(dueLocalDayKey(at(2026, 10, 15, 0, 5)), '2026-10-15');
    assert.equal(dueLocalDayKey(at(2026, 10, 15, 23, 59)), '2026-10-15');
    assert.equal(dueLocalDayKey(null), null);
    assert.equal(dueLocalDayKey('nope'), null);
    assert.equal(dayKey(calendarDayFromDate(new Date(2026, 9, 15, 23, 30))), '2026-10-15');
  });

  it('paints an amber dot when any open item is due, including overdue days', () => {
    const counts = countItemsByDueDay(items);
    assert.deepEqual(counts.get('2026-10-11'), { open: 2, done: 1 });
    assert.equal(dueDot(counts.get('2026-10-11')), 'amber');
    assert.equal(dueDot(counts.get('2026-10-01')), 'amber');
    assert.equal(dueDot(counts.get('2026-10-15')), 'grey');
    assert.equal(dueDot(counts.get('2026-10-20')), null);
    assert.equal(counts.has('undated'), false);
  });

  it('describes a day for accessibility', () => {
    const counts = countItemsByDueDay(items);
    assert.equal(
      dayAccessibilityLabel(TODAY, counts.get(dayKey(TODAY)), true, 'en-US'),
      'Sunday 11 October, 2 open, 1 done, selected'
    );
    assert.equal(
      dayAccessibilityLabel(THU_15, counts.get(dayKey(THU_15)), false, 'en-US'),
      'Thursday 15 October, 1 done'
    );
    assert.equal(dayAccessibilityLabel(THU_15, undefined, true, 'en-US'), 'Thursday 15 October, selected');
    assert.equal(dayAccessibilityLabel(THU_15, undefined, false, 'en-US'), 'Thursday 15 October');
  });

  it('filters Open and Done by local due day and drops undated items only while a date is set', () => {
    assert.deepEqual(
      filterItemsByStatusAndDay(items, 'open', TODAY).map((entry) => entry.id),
      ['open-today', 'open-later']
    );
    assert.equal(filterItemsByStatusAndDay(items, 'open', TODAY)[0], openToday);
    assert.deepEqual(
      filterItemsByStatusAndDay(items, 'done', TODAY).map((entry) => entry.id),
      ['done-today']
    );
    assert.deepEqual(
      filterItemsByStatusAndDay(items, 'done', THU_15).map((entry) => entry.id),
      ['done-only']
    );
    assert.deepEqual(filterItemsByStatusAndDay(items, 'open', THU_15), []);

    const openIds = filterItemsByStatusAndDay(items, 'open', null).map((entry) => entry.id);
    assert.ok(openIds.includes('undated-open'));
    assert.ok(openIds.includes('invalid'));
    assert.ok(!openIds.includes('undated-done'));
    assert.ok(!filterItemsByStatusAndDay(items, 'open', TODAY).some((entry) => entry.dueAt === null));
    assert.ok(!filterItemsByStatusAndDay(items, 'done', TODAY).some((entry) => entry.dueAt === null));
  });
});
