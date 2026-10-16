import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatDue, formatTodaySubtitle, fromDateTimeLocalValue } from './format';

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
});

