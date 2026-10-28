import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  applyPickedLocalTime,
  applyPresetLocalTime,
  DATE_ONLY_DUE_HOURS,
  DATE_ONLY_DUE_MINUTES,
  defaultDueOnLocalDay,
  dueHasClockTime,
  isPresetTimePast,
  matchingTimePresetId,
  moveDueToLocalDay,
  TIME_PRESETS,
  visibleTimePresets,
  pickerDateForDue,
  readSuggestedTimeFlag,
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

  it('treats 11:59 PM as date-only and a picked clock as a time', () => {
    const dateOnly = new Date(2026, 9, 20, DATE_ONLY_DUE_HOURS, DATE_ONLY_DUE_MINUTES, 0).toISOString();
    const timed = new Date(2026, 9, 20, 9, 0, 0).toISOString();
    assert.equal(dueHasClockTime(null), false);
    assert.equal(dueHasClockTime(dateOnly), false);
    assert.equal(dueHasClockTime(timed), true);
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

describe('suggested time flag', () => {
  it('treats missing and unknown values as false', () => {
    assert.equal(readSuggestedTimeFlag(undefined), false);
    assert.equal(readSuggestedTimeFlag(null), false);
    assert.equal(readSuggestedTimeFlag(''), false);
    assert.equal(readSuggestedTimeFlag('false'), false);
    assert.equal(readSuggestedTimeFlag(0), false);
    assert.equal(readSuggestedTimeFlag(true), true);
    assert.equal(readSuggestedTimeFlag(1), true);
    assert.equal(readSuggestedTimeFlag('true'), true);
  });
});

describe('time presets', () => {
  it('labels Morning through Tonight with the clock hour', () => {
    assert.deepEqual(
      TIME_PRESETS.map((preset) => preset.label),
      ['Morning 9 AM', 'Afternoon 12 PM', 'Evening 7 PM', 'Tonight 9 PM']
    );
  });

  it('hides Tonight unless the selected date is today', () => {
    const todayEvening = new Date(2026, 9, 16, 19, 0).toISOString();
    const tomorrowMorning = new Date(2026, 9, 17, 9, 0).toISOString();
    assert.deepEqual(
      visibleTimePresets(todayEvening, NOW).map((preset) => preset.id),
      ['morning', 'afternoon', 'evening', 'tonight']
    );
    assert.deepEqual(
      visibleTimePresets(tomorrowMorning, NOW).map((preset) => preset.id),
      ['morning', 'afternoon', 'evening']
    );
  });

  it('matches a preset on the clock time and applies it on the due day', () => {
    const dueAt = new Date(2026, 9, 20, 9, 0, 0).toISOString();
    assert.equal(matchingTimePresetId(dueAt), 'morning');
    const evening = new Date(applyPresetLocalTime(dueAt, 19, 0, NOW));
    assert.equal(evening.getDate(), 20);
    assert.equal(evening.getHours(), 19);
    assert.equal(evening.getMinutes(), 0);
    assert.equal(matchingTimePresetId(evening.toISOString()), 'evening');
  });

  it('disables past presets only when the due day is today', () => {
    assert.equal(isPresetTimePast(new Date(2026, 9, 16, 15, 0).toISOString(), 9, 0, NOW), true);
    assert.equal(isPresetTimePast(new Date(2026, 9, 16, 15, 0).toISOString(), 12, 0, NOW), true);
    assert.equal(isPresetTimePast(new Date(2026, 9, 16, 15, 0).toISOString(), 19, 0, NOW), false);
    assert.equal(isPresetTimePast(new Date(2026, 9, 16, 14, 30).toISOString(), 14, 30, NOW), false);
    assert.equal(isPresetTimePast(new Date(2026, 9, 17, 8, 0).toISOString(), 9, 0, NOW), false);
  });
});
