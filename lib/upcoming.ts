import { dayKey, dueLocalDayKey, localeWeekStartsOn, type CalendarDay } from '@/lib/date-filter';
import { isUpcoming } from '@/lib/format';
import type { Item } from '@/types/api';

export const UPCOMING_EMPTY = "You're clear for now.";

export const UPCOMING_HEADINGS = ['Today', 'Tomorrow', 'This week', 'Later'] as const;

export type UpcomingHeading = (typeof UPCOMING_HEADINGS)[number];

export type UpcomingSection = {
  title: UpcomingHeading;
  data: Item[];
};

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysFromToday(due: Date, now: Date): number {
  const dueDay = startOfLocalDay(due).getTime();
  const today = startOfLocalDay(now).getTime();
  return Math.round((dueDay - today) / 86_400_000);
}

/** 0 when `now` is the last day of the locale week. */
function daysUntilWeekEnd(now: Date, weekStartsOn: number): number {
  const today = startOfLocalDay(now).getDay();
  const start = ((weekStartsOn % 7) + 7) % 7;
  return (start + 6 - today + 7) % 7;
}

export function upcomingHeading(
  dueAt: string,
  now = new Date(),
  weekStartsOn = localeWeekStartsOn()
): UpcomingHeading | null {
  if (!isUpcoming(dueAt, now)) return null;
  const diff = daysFromToday(new Date(dueAt), now);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff <= daysUntilWeekEnd(now, weekStartsOn)) return 'This week';
  return 'Later';
}

/**
 * Open items whose due time is still upcoming, optionally narrowed to one local day.
 * Grouped Today, Tomorrow, This week, then Later. Each group is earliest due first.
 */
export function upcomingSections(
  items: readonly Item[],
  day: CalendarDay | null = null,
  now = new Date(),
  weekStartsOn = localeWeekStartsOn()
): UpcomingSection[] {
  const key = day ? dayKey(day) : null;
  const buckets = new Map<UpcomingHeading, Item[]>();

  const sorted = items
    .filter((item) => {
      if (item.status !== 'open' || !item.dueAt || !isUpcoming(item.dueAt, now)) return false;
      if (!key) return true;
      return dueLocalDayKey(item.dueAt) === key;
    })
    .slice()
    .sort((a, b) => String(a.dueAt).localeCompare(String(b.dueAt)));

  for (const item of sorted) {
    const title = item.dueAt ? upcomingHeading(item.dueAt, now, weekStartsOn) : null;
    if (!title) continue;
    const list = buckets.get(title);
    if (list) list.push(item);
    else buckets.set(title, [item]);
  }

  return UPCOMING_HEADINGS.flatMap((title) => {
    const data = buckets.get(title);
    return data && data.length > 0 ? [{ title, data }] : [];
  });
}
