import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyPickedLocalTime,
  DATE_ONLY_DUE_HOURS,
  DATE_ONLY_DUE_MINUTES,
  defaultDueOnLocalDay,
  moveDueToLocalDay,
  pickerDateForDue,
} from './due';

const NOW = new Date(2026, 9, 16, 14, 30, 12);

describe('date-only due default', () => {
  it('lands a picked day with no clock time at 11:59 PM local', () => {
    const day = new Date(2026, 9, 20, 8, 5, 0);
    const due = new Date(moveDueToLocalDay(null, day, NOW));
    assert.equal(due.getFullYear(), 2026);
    assert.equal(due.getMonth(), 9);
    assert.equal(due.getDate(), 20);
    assert.equal(due.getHours(), DATE_ONLY_DUE_HOURS);
    assert.equal(due.getMinutes(), DATE_ONLY_DUE_MINUTES);
    assert.equal(due.getSeconds(), 0);
    assert.equal(due.getMilliseconds(), 0);
  });

  it('keeps an existing clock time when only the day changes', () => {
    const dueAt = new Date(2026, 9, 16, 9, 15, 0).toISOString();
    const day = new Date(2026, 9, 21, 0, 0, 0);
    const due = new Date(moveDueToLocalDay(dueAt, day, NOW));
    assert.equal(due.getDate(), 21);
    assert.equal(due.getHours(), 9);
    assert.equal(due.getMinutes(), 15);
  });

  it('keeps an explicitly picked clock time', () => {
    const dueAt = defaultDueOnLocalDay(NOW);
    const picked = new Date(2026, 9, 16, 7, 45, 0);
    const due = new Date(applyPickedLocalTime(dueAt, picked, NOW));
    assert.equal(due.getFullYear(), 2026);
    assert.equal(due.getMonth(), 9);
    assert.equal(due.getDate(), 16);
    assert.equal(due.getHours(), 7);
    assert.equal(due.getMinutes(), 45);
    assert.equal(due.getSeconds(), 0);
  });

  it('seeds the picker at 11:59 PM when there is no due yet', () => {
    const picker = pickerDateForDue(null, NOW);
    assert.equal(picker.getHours(), DATE_ONLY_DUE_HOURS);
    assert.equal(picker.getMinutes(), DATE_ONLY_DUE_MINUTES);
    assert.equal(picker.getDate(), 16);
  });

  it('seeds the picker with an existing due, including its clock time', () => {
    const dueAt = new Date(2026, 9, 18, 9, 15, 0).toISOString();
    const picker = pickerDateForDue(dueAt, NOW);
    assert.equal(picker.getDate(), 18);
    assert.equal(picker.getHours(), 9);
    assert.equal(picker.getMinutes(), 15);
  });
});
