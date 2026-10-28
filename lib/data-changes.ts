/**
 * In-process counter for successful item/category writes.
 * Account counts (and anything else that should not stay stale) subscribe here.
 */

export const DATA_CHANGE_DEBOUNCE_MS = 300;

let generation = 0;
const listeners = new Set<() => void>();

export function getDataGeneration(): number {
  return generation;
}

export function subscribeDataChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Bump the generation and wake subscribers. Call only after a write that landed. */
export function notifyDataChanged(): void {
  generation += 1;
  for (const listener of listeners) listener();
}

/**
 * Run a write, then notify. A thrown error skips the notify so a failed save
 * cannot look like new data.
 */
export async function notifyAfterWrite<T>(work: Promise<T>): Promise<T> {
  const result = await work;
  notifyDataChanged();
  return result;
}

/** True only when this in-flight load is still the latest one. */
export function isLatestRequest(requestId: number, latestRequestId: number): boolean {
  return requestId === latestRequestId;
}
