/**
 * Calendar-day math for due instants.
 * Due values are timestamps; shifting a day keeps the local time of day.
 * A picked day with no clock time lands at 11:59 PM local.
 */

export const DATE_ONLY_DUE_HOURS = 23;
export const DATE_ONLY_DUE_MINUTES = 59;

export const TIME_PRESETS = [
  { id: 'morning', label: 'Morning 9', hours: 9, minutes: 0 },
  { id: 'afternoon', label: 'Afternoon 12', hours: 12, minutes: 0 },
  { id: 'evening', label: 'Evening 7', hours: 19, minutes: 0 },
  { id: 'tonight', label: 'Tonight 9', hours: 21, minutes: 0 },
] as const;

export type TimePresetId = (typeof TIME_PRESETS)[number]['id'];

/** True only when the API sent an explicit true. A missing `suggested` is false. */
export function readSuggestedTimeFlag(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1';
  }
  return false;
}

function validDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 11:59 PM local on `day`'s calendar date. */
export function endOfLocalDay(day: Date): Date {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    DATE_ONLY_DUE_HOURS,
    DATE_ONLY_DUE_MINUTES,
    0,
    0
  );
}

export function defaultDueOnLocalDay(day: Date): string {
  return endOfLocalDay(day).toISOString();
}

/**
 * Value to seed a date/time picker.
 * An existing due keeps its clock time; otherwise 11:59 PM local so a date-only confirm
 * does not stamp the current time.
 */
export function pickerDateForDue(dueAt: string | null, now = new Date()): Date {
  return validDate(dueAt) ?? endOfLocalDay(now);
}

/** Local `YYYY-MM-DD` for `<input type="date">`. */
export function toLocalDateInputValue(dueAt: string | null, now = new Date()): string {
  const date = validDate(dueAt) ?? now;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Parse `YYYY-MM-DD` as a local calendar day (not UTC midnight). */
export function localDayFromDateInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

/**
 * Place `dueAt` on `day`'s local calendar date.
 * Keeps the existing local time of day. If there is no due time, uses 11:59 PM local.
 */
export function moveDueToLocalDay(dueAt: string | null, day: Date, now = new Date()): string {
  const source = validDate(dueAt) ?? endOfLocalDay(now);
  const next = new Date(source);
  next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
  return next.toISOString();
}

/**
 * Apply an explicit clock time on the existing due day (or today).
 * Used when the user actually opens the time picker.
 */
export function applyPickedLocalTime(dueAt: string | null, time: Date, now = new Date()): string {
  const next = new Date(validDate(dueAt) ?? endOfLocalDay(now));
  next.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return next.toISOString();
}

/** Apply a preset clock time on the existing due day (or today). */
export function applyPresetLocalTime(
  dueAt: string | null,
  hours: number,
  minutes: number,
  now = new Date()
): string {
  const time = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  return applyPickedLocalTime(dueAt, time, now);
}

export function dueMatchesClock(dueAt: string | null, hours: number, minutes: number): boolean {
  const date = validDate(dueAt);
  if (!date) return false;
  return date.getHours() === hours && date.getMinutes() === minutes;
}

export function matchingTimePresetId(dueAt: string | null): TimePresetId | null {
  for (const preset of TIME_PRESETS) {
    if (dueMatchesClock(dueAt, preset.hours, preset.minutes)) return preset.id;
  }
  return null;
}

function isSameLocalDay(date: Date, now: Date): boolean {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/**
 * True when `dueAt` is today and the preset's clock time is already earlier
 * than `now` (compared to the minute). Same-minute presets stay available.
 */
export function isPresetTimePast(
  dueAt: string | null,
  hours: number,
  minutes: number,
  now = new Date()
): boolean {
  const date = validDate(dueAt);
  if (!date || !isSameLocalDay(date, now)) return false;
  const presetMinutes = hours * 60 + minutes;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return presetMinutes < nowMinutes;
}

/** True when the due instant falls on a later local calendar day than `now`. */
export function isAfterLocalToday(dueAt: string | null, now = new Date()): boolean {
  const date = validDate(dueAt);
  if (!date) return false;
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return date.getTime() >= startOfTomorrow.getTime();
}

/**
 * True when `dueAt` falls before the start of the local calendar day of `now`.
 * Same-day times stay "today" (see `isAfterLocalToday`); only earlier days are overdue.
 */
export function isBeforeLocalToday(dueAt: string | null, now = new Date()): boolean {
  const date = validDate(dueAt);
  if (!date) return false;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date.getTime() < startOfToday.getTime();
}
