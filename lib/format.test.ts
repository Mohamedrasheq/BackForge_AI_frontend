import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { matchingTimePresetId } from './due';
import {
  formatDue,
  formatDueDay,
  formatDueTime,
  formatTodaySubtitle,
  fromDateTimeLocalValue,
  fromLocalTimeInputValue,
} from './format';

describe('date labels', () => {
  it('writes the Today subtitle with an English weekday and month', () => {
    assert.equal(formatTodaySubtitle(new Date(2026, 9, 6, 15, 4)), 'Tuesday, October 6');
  });

  it('writes a due day as weekday, day, and short month', () => {
    const due = formatDue(new Date(2026, 9, 6, 15, 4).toISOString());
    assert.ok(due?.startsWith('Tue, 6 Oct · '));
    assert.equal(due?.includes(', 6 ·'), false);
  });

  it('keeps Today for a due time on the local today', () => {
    const due = formatDue(new Date().toISOString());
    assert.ok(due?.startsWith('Today · '));
  });

  it('formats a 10 AM clock that is not a preset', () => {
    const due = new Date(2026, 9, 16, 10, 0).toISOString();
    assert.equal(matchingTimePresetId(due), null);
    assert.equal(formatDueTime(due)?.replace(/\s/g, ' ').toUpperCase().includes('10:00'), true);
  });

  it('splits the day and clock so Suggested can sit after the time', () => {
    const value = new Date(2026, 9, 29, 9, 0).toISOString();
    assert.equal(formatDueDay(value), 'Thu, 29 Oct');
    assert.ok(formatDueTime(value)?.includes('9:00'));
    assert.equal(formatDue(value), `${formatDueDay(value)} · ${formatDueTime(value)}`);
  });
});

describe('datetime-local values', () => {
  it('treats a date-only pick as 11:59 PM local', () => {
    const due = new Date(fromDateTimeLocalValue('2026-10-20') ?? '');
    assert.equal(due.getFullYear(), 2026);
    assert.equal(due.getMonth(), 9);
    assert.equal(due.getDate(), 20);
    assert.equal(due.getHours(), 23);
    assert.equal(due.getMinutes(), 59);
  });

  it('keeps an explicit clock time', () => {
    const due = new Date(fromDateTimeLocalValue('2026-10-20T07:45') ?? '');
    assert.equal(due.getDate(), 20);
    assert.equal(due.getHours(), 7);
    assert.equal(due.getMinutes(), 45);
  });

  it('applies a time input on the existing due day', () => {
    const dueAt = new Date(2026, 9, 20, 23, 59).toISOString();
    const due = new Date(fromLocalTimeInputValue(dueAt, '09:00') ?? '');
    assert.equal(due.getDate(), 20);
    assert.equal(due.getHours(), 9);
    assert.equal(due.getMinutes(), 0);
  });
});

