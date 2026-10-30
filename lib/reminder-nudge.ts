/**
 * One post-save reminder prompt after onboarding "Not now".
 * Existing users who already finished onboarding never get this sheet:
 * they never set the declined flag.
 */

import { SAVED_BANNER_MS } from '@/lib/capture-status';
import { dueHasClockTime } from '@/lib/due';
import { formatDueTime } from '@/lib/format';

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

export const REMINDER_DECLINED_KEY = 'backforge.reminders.declinedOnboarding';
export const REMINDER_ASKED_KEY = 'backforge.reminders.askedAgain';

export const REMINDER_ONBOARDING_TITLE = "Get a nudge when it's time";
export const REMINDER_BODY = "We'll remind you at the time on each task. Nothing else.";
export const REMINDER_TURN_ON = 'Turn on reminders';
export const REMINDER_SHEET_TURN_ON = 'Turn on';
export const REMINDER_NOT_NOW = 'Not now';

export type ReminderFlagStore = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

export type ReminderNudgeFlags = {
  declinedOnboarding: boolean;
  alreadyAsked: boolean;
};

export type RemindersRowModel =
  | { kind: 'loading' }
  | {
      kind: 'on';
      statusLabel: 'On';
      hint: 'Turn off in iPhone Settings';
      actionLabel: 'Open Settings';
    }
  | { kind: 'turn_on'; actionLabel: 'Turn on' }
  | {
      kind: 'off';
      statusLabel: 'Off';
      hint: 'Turn on in iPhone Settings';
      actionLabel: 'Open Settings';
    };

export function remindersRowModel(permission: NotificationPermission | null): RemindersRowModel {
  if (permission === 'granted') {
    return {
      kind: 'on',
      statusLabel: 'On',
      hint: 'Turn off in iPhone Settings',
      actionLabel: 'Open Settings',
    };
  }
  if (permission === 'undetermined') return { kind: 'turn_on', actionLabel: 'Turn on' };
  if (permission === 'denied') {
    return {
      kind: 'off',
      statusLabel: 'Off',
      hint: 'Turn on in iPhone Settings',
      actionLabel: 'Open Settings',
    };
  }
  return { kind: 'loading' };
}

export function reminderAskTitle(timeLabel: string): string {
  return `Want a reminder at ${timeLabel}?`;
}

export function firstClockDueAt(dueAts: readonly (string | null | undefined)[]): string | null {
  for (const due of dueAts) {
    if (due && dueHasClockTime(due)) return due;
  }
  return null;
}

export function shouldAskReminderAgain(input: {
  permission: NotificationPermission | null;
  declinedOnboarding: boolean;
  alreadyAsked: boolean;
  hasTimedTask: boolean;
}): boolean {
  return (
    input.permission === 'undetermined' &&
    input.declinedOnboarding &&
    !input.alreadyAsked &&
    input.hasTimedTask
  );
}

export async function loadReminderNudgeFlags(
  store: ReminderFlagStore
): Promise<ReminderNudgeFlags> {
  const [declined, asked] = await Promise.all([
    store.getItem(REMINDER_DECLINED_KEY),
    store.getItem(REMINDER_ASKED_KEY),
  ]);
  return {
    declinedOnboarding: declined === 'true',
    alreadyAsked: asked === 'true',
  };
}

export async function markReminderDeclined(store: ReminderFlagStore): Promise<void> {
  await store.setItem(REMINDER_DECLINED_KEY, 'true');
}

export async function markReminderAsked(store: ReminderFlagStore): Promise<void> {
  await store.setItem(REMINDER_ASKED_KEY, 'true');
}

type DuesListener = () => void;

let pendingDues: Array<string | null> | null = null;
const duesListeners = new Set<DuesListener>();

export function notifySavedDues(dueAts: ReadonlyArray<string | null | undefined>): void {
  pendingDues = dueAts.map((due) => due ?? null);
  for (const listener of duesListeners) listener();
}

export function takePendingSavedDues(): Array<string | null> | null {
  const next = pendingDues;
  pendingDues = null;
  return next;
}

export function subscribeSavedDues(listener: DuesListener): () => void {
  duesListeners.add(listener);
  return () => {
    duesListeners.delete(listener);
  };
}

export function reminderNudgeDelayMs(): number {
  return SAVED_BANNER_MS;
}

export function reminderTimeLabel(dueAt: string): string | null {
  return formatDueTime(dueAt);
}
