/**
 * Local calendar-day helpers for the All items date filter.
 * Due instants are matched on the device's local day. Nothing here is persisted.
 */

import type { Item, ItemStatus } from '@/types/api';

export type CalendarDay = {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
};

export type DueDayCounts = {
  open: number;
  done: number;
};

/** Amber when any open item is due, including overdue days. Grey when every due item is done. */
export type DayTint = 'amber' | 'grey';

export const DATE_FILTER_EMPTY_DESCRIPTION = 'Pick another day or clear the date';

export const CLEAR_DATE_LABEL = 'Clear date';

const SUNDAY_REGIONS = new Set(['US', 'CA', 'JP', 'KR', 'TW', 'IL', 'BR', 'PH', 'SA']);

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function dayKey(day: CalendarDay): string {
  return `${day.year}-${pad(day.month)}-${pad(day.day)}`;
}

export function calendarDayFromDate(date: Date): CalendarDay {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

export function isSameCalendarDay(a: CalendarDay, b: CalendarDay): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

/**
 * True only when `day` is the device-local calendar day of `now`.
 * The same day-of-month in another month or year is not today.
 */
export function isTodayCell(day: CalendarDay, now: Date): boolean {
  return isSameCalendarDay(day, calendarDayFromDate(now));
}

/** Tap selects a day. Tapping the selected day again clears the filter. */
export function toggleSelectedDay(selected: CalendarDay | null, tapped: CalendarDay): CalendarDay | null {
  if (selected && isSameCalendarDay(selected, tapped)) return null;
  return tapped;
}

/** Local `YYYY-MM-DD` for a due instant. Invalid and missing values are undated. */
export function dueLocalDayKey(dueAt: string | null): string | null {
  if (!dueAt) return null;
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return null;
  return dayKey(calendarDayFromDate(date));
}

export type CalendarMonth = {
  year: number;
  /** 1–12 */
  month: number;
};

export function shiftMonth(year: number, month: number, delta: number): CalendarMonth {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

/** Positive when `to` is after `from`. Zero when both are the same month. */
export function monthDelta(from: CalendarMonth, to: CalendarMonth): number {
  return (to.year - from.year) * 12 + (to.month - from.month);
}

const SWIPE_DISTANCE = 40;
/** Points per second. A short drag below this distance and speed does not change month. */
const SWIPE_VELOCITY = 500;

/**
 * Horizontal month swipe. `velocityX` is points per second (Gesture Handler).
 * When the drag and the flick disagree, the drag direction wins.
 * Returns 1 for next month, -1 for previous, 0 to stay.
 */
export function monthSwipeDelta(dx: number, velocityX: number): -1 | 0 | 1 {
  const next = dx <= -SWIPE_DISTANCE || velocityX <= -SWIPE_VELOCITY;
  const prev = dx >= SWIPE_DISTANCE || velocityX >= SWIPE_VELOCITY;
  if (next && prev) return dx <= 0 ? 1 : -1;
  if (next) return 1;
  if (prev) return -1;
  return 0;
}

type WeekInfoLike = { firstDay?: number };

/** Throws when `Intl.Locale` is missing or rejects the locale. Callers decide the fallback. */
function weekInfoFor(locale: string): WeekInfoLike | null {
  const value = new Intl.Locale(locale) as Intl.Locale & {
    weekInfo?: WeekInfoLike;
    getWeekInfo?: () => WeekInfoLike;
  };
  if (typeof value.getWeekInfo === 'function') return value.getWeekInfo();
  return value.weekInfo ?? null;
}

/** ISO first day (1 Monday … 7 Sunday) to JS `Date#getDay` (0 Sunday … 6 Saturday). */
export function weekStartsOnFromFirstDay(firstDay: number): number | null {
  if (!Number.isInteger(firstDay) || firstDay < 1 || firstDay > 7) return null;
  return firstDay % 7;
}

function regionOf(locale: string): string | null {
  try {
    const region = new Intl.Locale(locale).region;
    if (region) return region.toUpperCase();
  } catch {
    // Fall through to a manual parse.
  }
  const match = /-([A-Za-z]{2})\b/.exec(locale);
  return match ? match[1].toUpperCase() : null;
}

function fallbackWeekStartsOn(locale: string): number {
  const region = regionOf(locale);
  if (region && SUNDAY_REGIONS.has(region)) return 0;
  return 1;
}

/**
 * JS weekday index the device locale treats as the first column.
 * Monday when `Intl.Locale` or the device locale cannot be read.
 */
export function localeWeekStartsOn(locale?: string): number {
  try {
    const resolved = locale ?? Intl.DateTimeFormat().resolvedOptions().locale;
    if (!resolved) return 1;
    const firstDay = weekInfoFor(resolved)?.firstDay;
    if (typeof firstDay === 'number') {
      const mapped = weekStartsOnFromFirstDay(firstDay);
      if (mapped !== null) return mapped;
    }
    return fallbackWeekStartsOn(resolved);
  } catch {
    return 1;
  }
}

/**
 * Six rows of seven cells. Days outside the month are null — neighboring months are not filled in.
 */
export function buildMonthGrid(
  year: number,
  month: number,
  weekStartsOn: number
): (CalendarDay | null)[][] {
  const start = ((weekStartsOn % 7) + 7) % 7;
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const leading = (firstWeekday - start + 7) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (CalendarDay | null)[] = [];

  for (let index = 0; index < leading; index += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push({ year, month, day });
  while (cells.length < 42) cells.push(null);

  const weeks: (CalendarDay | null)[][] = [];
  for (let index = 0; index < 42; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks;
}

function dateFromDay(day: CalendarDay): Date {
  return new Date(day.year, day.month - 1, day.day);
}

/** English month names. Hermes `formatToParts` omits month and weekday parts. */
const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Index 0 is Sunday, matching `Date#getDay`. */
const WEEKDAY_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const WEEKDAY_NARROW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

function monthLong(month: number): string {
  return MONTH_LONG[month - 1] ?? '';
}

function monthShort(month: number): string {
  return MONTH_SHORT[month - 1] ?? '';
}

/** English single-letter weekday row, ordered from `weekStartsOn` (0 Sunday … 6 Saturday). */
export function weekdayInitials(weekStartsOn: number): string[] {
  const start = ((weekStartsOn % 7) + 7) % 7;
  const labels: string[] = [];
  for (let index = 0; index < 7; index += 1) {
    labels.push(WEEKDAY_NARROW[(start + index) % 7]);
  }
  return labels;
}

/** `October`, or `January 2027` when the month is not in the current year. */
export function monthTitle(year: number, month: number, now = new Date()): string {
  const name = monthLong(month);
  if (year === now.getFullYear()) return name;
  return `${name} ${year}`;
}

/** `Tue, 6 Oct` — short weekday, day, short month. No year. */
export function dateChipLabel(day: CalendarDay): string {
  const weekday = WEEKDAY_SHORT[dateFromDay(day).getDay()] ?? '';
  return `${weekday}, ${day.day} ${monthShort(day.month)}`;
}

/** `Tuesday, October 6`. No year. */
export function fullDateLabel(date: Date): string {
  const weekday = WEEKDAY_LONG[date.getDay()] ?? '';
  const month = MONTH_LONG[date.getMonth()] ?? '';
  return `${weekday}, ${month} ${date.getDate()}`;
}

export function dateFilterEmptyTitle(status: ItemStatus, day: CalendarDay): string {
  const label = dateChipLabel(day);
  if (status === 'done') return `Nothing done for ${label}`;
  return `Nothing due on ${label}`;
}

/** `Thursday 15 October` */
export function longDateLabel(day: CalendarDay): string {
  const weekday = WEEKDAY_LONG[dateFromDay(day).getDay()] ?? '';
  return `${weekday} ${day.day} ${monthLong(day.month)}`;
}

/** `Thursday 15 October, 2 open, 1 done, selected` */
export function dayAccessibilityLabel(
  day: CalendarDay,
  counts: DueDayCounts | undefined,
  selected: boolean
): string {
  const parts = [longDateLabel(day)];
  const open = counts?.open ?? 0;
  const done = counts?.done ?? 0;
  if (open > 0) parts.push(`${open} open`);
  if (done > 0) parts.push(`${done} done`);
  if (selected) parts.push('selected');
  return parts.join(', ');
}

export function countItemsByDueDay(items: readonly Item[]): Map<string, DueDayCounts> {
  const map = new Map<string, DueDayCounts>();
  for (const item of items) {
    const key = dueLocalDayKey(item.dueAt);
    if (!key) continue;
    const current = map.get(key) ?? { open: 0, done: 0 };
    if (item.status === 'open') current.open += 1;
    else current.done += 1;
    map.set(key, current);
  }
  return map;
}

/** Light amber fill when any open item is due, including overdue. Light grey when every due item is done. */
export function dayTint(counts: DueDayCounts | undefined): DayTint | null {
  if (!counts || (counts.open === 0 && counts.done === 0)) return null;
  if (counts.open > 0) return 'amber';
  return 'grey';
}

/**
 * Open or Done rows for one local due day.
 * A null day keeps undated items.
 * A set day drops anything without a due time, including done items.
 */
export function filterItemsByStatusAndDay(
  items: readonly Item[],
  status: ItemStatus,
  day: CalendarDay | null
): Item[] {
  const key = day ? dayKey(day) : null;
  return items.filter((item) => {
    if (item.status !== status) return false;
    if (!key) return true;
    return dueLocalDayKey(item.dueAt) === key;
  });
}
