/**
 * One-shot "Saved N tasks" banner after Confirm.
 * The screen the user lands on reads this; it is not persisted.
 */

import { savedTasksLabel } from './capture-status';

type Listener = () => void;

let count: number | null = null;
const listeners = new Set<Listener>();

export function getSavedFlashCount(): number | null {
  return count;
}

export function savedFlashLabel(value: number | null = count): string | null {
  if (value == null || value < 1) return null;
  return savedTasksLabel(value);
}

export function subscribeSavedFlash(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function showSavedFlash(nextCount: number): void {
  if (nextCount < 1) return;
  count = nextCount;
  for (const listener of listeners) listener();
}

export function clearSavedFlash(): void {
  if (count == null) return;
  count = null;
  for (const listener of listeners) listener();
}
