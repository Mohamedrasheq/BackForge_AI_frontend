import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DATE_ONLY_DUE_HOURS, DATE_ONLY_DUE_MINUTES, dueHasClockTime } from './due';
import {
  firstClockDueAt,
  loadReminderNudgeFlags,
  markReminderAsked,
  markReminderDeclined,
  reminderAskTitle,
  remindersRowModel,
  REMINDER_ASKED_KEY,
  REMINDER_DECLINED_KEY,
  shouldAskReminderAgain,
} from './reminder-nudge';

function memoryStore(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem: async (key: string) => data.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

const TIMED = new Date(2026, 9, 28, 15, 30, 0).toISOString();
const DATE_ONLY = new Date(2026, 9, 28, DATE_ONLY_DUE_HOURS, DATE_ONLY_DUE_MINUTES, 0).toISOString();

describe('remindersRowModel', () => {
  it('maps granted to On with Open Settings and a turn-off hint', () => {
    assert.deepEqual(remindersRowModel('granted'), {
      kind: 'on',
      statusLabel: 'On',
      hint: 'Turn off in iPhone Settings',
      actionLabel: 'Open Settings',
    });
  });

  it('maps undetermined to an accent Turn on action', () => {
    assert.deepEqual(remindersRowModel('undetermined'), {
      kind: 'turn_on',
      actionLabel: 'Turn on',
    });
  });

  it('maps denied to Off with Open Settings', () => {
    assert.deepEqual(remindersRowModel('denied'), {
      kind: 'off',
      statusLabel: 'Off',
      hint: 'Turn on in iPhone Settings',
      actionLabel: 'Open Settings',
    });
  });

  it('maps a missing status to loading', () => {
    assert.deepEqual(remindersRowModel(null), { kind: 'loading' });
  });
});

describe('shouldAskReminderAgain', () => {
  const ready = {
    permission: 'undetermined' as const,
    declinedOnboarding: true,
    alreadyAsked: false,
    hasTimedTask: true,
  };

  it('asks once when permission is undetermined, Not now was tapped, and a timed task was saved', () => {
    assert.equal(shouldAskReminderAgain(ready), true);
  });

  it('never asks when permission is granted', () => {
    assert.equal(shouldAskReminderAgain({ ...ready, permission: 'granted' }), false);
  });

  it('never asks when permission is denied', () => {
    assert.equal(shouldAskReminderAgain({ ...ready, permission: 'denied' }), false);
  });

  it('does not ask existing users who never tapped Not now', () => {
    assert.equal(shouldAskReminderAgain({ ...ready, declinedOnboarding: false }), false);
  });

  it('does not ask again after the sheet has been shown', () => {
    assert.equal(shouldAskReminderAgain({ ...ready, alreadyAsked: true }), false);
  });

  it('waits for a save that includes a date and time', () => {
    assert.equal(shouldAskReminderAgain({ ...ready, hasTimedTask: false }), false);
  });

  it('does not ask while permission is still unknown', () => {
    assert.equal(shouldAskReminderAgain({ ...ready, permission: null }), false);
  });
});

describe('firstClockDueAt', () => {
  it('skips undated and date-only rows, then returns the first clock time', () => {
    assert.equal(dueHasClockTime(null), false);
    assert.equal(dueHasClockTime(DATE_ONLY), false);
    assert.equal(dueHasClockTime(TIMED), true);
    assert.equal(firstClockDueAt([null, DATE_ONLY, TIMED]), TIMED);
    assert.equal(firstClockDueAt([null, DATE_ONLY]), null);
  });
});

describe('reminderAskTitle', () => {
  it('puts the made-up time in the sheet title', () => {
    assert.equal(reminderAskTitle('3:30 PM'), 'Want a reminder at 3:30 PM?');
  });
});

describe('reminder nudge flags', () => {
  it('starts unset so people who already finished onboarding are not prompted', async () => {
    const store = memoryStore();
    const flags = await loadReminderNudgeFlags(store);
    assert.deepEqual(flags, { declinedOnboarding: false, alreadyAsked: false });
  });

  it('records Not now and the one later ask separately', async () => {
    const store = memoryStore();
    await markReminderDeclined(store);
    assert.equal(store.data.get(REMINDER_DECLINED_KEY), 'true');
    let flags = await loadReminderNudgeFlags(store);
    assert.equal(flags.declinedOnboarding, true);
    assert.equal(flags.alreadyAsked, false);
    await markReminderAsked(store);
    assert.equal(store.data.get(REMINDER_ASKED_KEY), 'true');
    flags = await loadReminderNudgeFlags(store);
    assert.equal(flags.alreadyAsked, true);
  });
});
