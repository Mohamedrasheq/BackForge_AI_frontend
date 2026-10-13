import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatDue, formatTodaySubtitle } from './format';

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
