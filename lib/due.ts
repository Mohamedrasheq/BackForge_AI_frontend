/**
 * Calendar-day math for due instants.
 * Due values are timestamps; shifting a day keeps the local time of day.
 */

function validDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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
 * Keeps the existing local time of day. If there is no due time, uses `now`.
 */
export function moveDueToLocalDay(dueAt: string | null, day: Date, now = new Date()): string {
  const source = validDate(dueAt) ?? now;
  const next = new Date(source);
  next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
  return next.toISOString();
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
