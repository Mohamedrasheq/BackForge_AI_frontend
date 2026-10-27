import { calendarDayFromDate, dateChipLabel, fullDateLabel } from '@/lib/date-filter';
import { applyPickedLocalTime, defaultDueOnLocalDay, localDayFromDateInput } from '@/lib/due';

export function formatTodaySubtitle(date = new Date()): string {
  return fullDateLabel(date);
}

function dueDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDueTime(value: string | null): string | null {
  const date = dueDate(value);
  if (!date) return null;
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDueDay(value: string | null): string | null {
  const date = dueDate(value);
  if (!date) return null;

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) return 'Today';
  return dateChipLabel(calendarDayFromDate(date));
}

export function formatDue(value: string | null): string | null {
  const day = formatDueDay(value);
  const time = formatDueTime(value);
  if (!day || !time) return null;
  return `${day} · ${time}`;
}

/** True from one minute before `now` onward. Undated and invalid instants are not upcoming. */
export function isUpcoming(value: string | null, now = new Date()): boolean {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() >= now.getTime() - 60_000;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** Local `YYYY-MM-DDTHH:MM` for datetime-local inputs. */
export function toDateTimeLocalValue(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Local `HH:MM` for `<input type="time">`. */
export function toLocalTimeInputValue(value: string | null): string {
  const full = toDateTimeLocalValue(value);
  const sep = full.indexOf('T');
  return sep >= 0 ? full.slice(sep + 1) : '';
}

/** Apply an `HH:MM` time input onto the existing due day (or today). */
export function fromLocalTimeInputValue(dueAt: string | null, value: string): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return applyPickedLocalTime(dueAt, new Date(2000, 0, 1, hours, minutes));
}

/** Parse a datetime-local value into an ISO string, or null if empty/invalid. */
export function fromDateTimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const dayOnly = localDayFromDateInput(trimmed);
  if (dayOnly) return defaultDueOnLocalDay(dayOnly);
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
