/**
 * Session-only dismissal for the Review entry on Today and All items.
 * A new app process shows the entry again when quiet items remain.
 * Not persisted, and not a nag on every focus of the same screen.
 */

export type ReviewEntrySurface = 'today' | 'items';

const listeners = new Set<() => void>();
const dismissed: Record<ReviewEntrySurface, boolean> = {
  today: false,
  items: false,
};

export function subscribeReviewEntry(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function isReviewEntryDismissed(surface: ReviewEntrySurface): boolean {
  return dismissed[surface];
}

export function dismissReviewEntry(surface: ReviewEntrySurface): void {
  if (dismissed[surface]) return;
  dismissed[surface] = true;
  for (const listener of listeners) listener();
}

/** Show the Review entry again on both surfaces. Used when the account is deleted. */
export function resetReviewEntryDismissals(): void {
  dismissed.today = false;
  dismissed.items = false;
  for (const listener of listeners) listener();
}
