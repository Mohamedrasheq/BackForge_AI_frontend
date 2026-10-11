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
export type DueDot = 'amber' | 'grey';

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

/** Local `YYYY-MM-DD` for a due instant. Invalid and missing values are undated. */
export function dueLocalDayKey(dueAt: string | null): string | null {
  if (!dueAt) return null;
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return null;
  return dayKey(calendarDayFromDate(date));
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number
): { year: number; month: number } {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

type WeekInfoLike = { firstDay?: number };

function weekInfoFor(locale: string): WeekInfoLike | null {
  try {
    const value = new Intl.Locale(locale) as Intl.Locale & {
      weekInfo?: WeekInfoLike;
      getWeekInfo?: () => WeekInfoLike;
    };
    if (typeof value.getWeekInfo === 'function') return value.getWeekInfo();
    return value.weekInfo ?? null;
  } catch {
    return null;
  }
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

/** JS weekday index the device locale treats as the first column. */
export function localeWeekStartsOn(locale = Intl.DateTimeFormat().resolvedOptions().locale): number {
  const firstDay = weekInfoFor(locale)?.firstDay;
  if (typeof firstDay === 'number') {
    const mapped = weekStartsOnFromFirstDay(firstDay);
    if (mapped !== null) return mapped;
  }
  return fallbackWeekStartsOn(locale);
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

function formatPart(
  date: Date,
  type: 'weekday' | 'month',
  length: 'narrow' | 'short' | 'long',
  locale?: string
): string {
  const parts = new Intl.DateTimeFormat(locale, { [type]: length }).formatToParts(date);
  return parts.find((part) => part.type === type)?.value ?? '';
}

function dateFromDay(day: CalendarDay): Date {
  return new Date(day.year, day.month - 1, day.day);
}

/** Single-letter weekday row, ordered from the locale's first day. */
export function weekdayInitials(weekStartsOn: number, locale?: string): string[] {
  const start = ((weekStartsOn % 7) + 7) % 7;
  const labels: string[] = [];
  for (let index = 0; index < 7; index += 1) {
    const date = new Date(2024, 0, 7 + ((start + index) % 7));
    labels.push(formatPart(date, 'weekday', 'narrow', locale));
  }
  return labels;
}

/** `October`, or `January 2027` when the month is not in the current year. */
export function monthTitle(
  year: number,
  month: number,
  now = new Date(),
  locale?: string
): string {
  const name = formatPart(new Date(year, month - 1, 1), 'month', 'long', locale);
  if (year === now.getFullYear()) return name;
  return `${name} ${year}`;
}

/** `Thu, 15 Oct` — weekday, day, short month. No year. */
export function dateChipLabel(day: CalendarDay, locale?: string): string {
  const date = dateFromDay(day);
  const weekday = formatPart(date, 'weekday', 'short', locale);
  const month = formatPart(date, 'month', 'short', locale);
  return `${weekday}, ${date.getDate()} ${month}`;
}

/** `Today, 11 Oct` when the day is the local today, otherwise the chip label. */
export function activeDatePillLabel(day: CalendarDay, now = new Date(), locale?: string): string {
  const date = dateFromDay(day);
  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    const month = formatPart(date, 'month', 'short', locale);
    return `Today, ${date.getDate()} ${month}`;
  }
  return dateChipLabel(day, locale);
}

export function dateFilterEmptyTitle(
  status: ItemStatus,
  day: CalendarDay,
  locale?: string
): string {
  const label = dateChipLabel(day, locale);
  if (status === 'done') return `Nothing done for ${label}`;
  return `Nothing due on ${label}`;
}

/** `Thursday 15 October` */
export function longDateLabel(day: CalendarDay, locale?: string): string {
  const date = dateFromDay(day);
  const weekday = formatPart(date, 'weekday', 'long', locale);
  const month = formatPart(date, 'month', 'long', locale);
  return `${weekday} ${date.getDate()} ${month}`;
}

export function dateFilterButtonLabel(day: CalendarDay | null, locale?: string): string {
  if (!day) return 'Filter by date';
  return `Filter by date, ${longDateLabel(day, locale)} selected`;
}

/** `Thursday 15 October, 2 open, 1 done, selected` */
export function dayAccessibilityLabel(
  day: CalendarDay,
  counts: DueDayCounts | undefined,
  selected: boolean,
  locale?: string
): string {
  const parts = [longDateLabel(day, locale)];
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

export function dueDot(counts: DueDayCounts | undefined): DueDot | null {
  if (!counts || (counts.open === 0 && counts.done === 0)) return null;
  if (counts.open > 0) return 'amber';
  return 'grey';
}

/**
 * Open or Done rows for one local due day.
 * Pass items already narrowed by search. A null day keeps undated items.
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
