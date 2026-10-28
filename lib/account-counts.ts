/**
 * Last successful Account totals, numbers only.
 * Keyed by Clerk user id so another account on this device never sees them.
 */

export const ACCOUNT_COUNTS_KEY_PREFIX = 'backforge.account.counts.';

export type StoredAccountCounts = {
  categoryCount: number;
  itemCount: number;
  openCount: number;
  doneCount: number;
};

export type AccountCountsStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  multiRemove(keys: readonly string[]): Promise<void>;
};

export function accountCountsKey(userId: string): string {
  return `${ACCOUNT_COUNTS_KEY_PREFIX}${userId}`;
}

function isNonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** True when every Account total is a persistable number. */
export function completeAccountCounts(value: {
  categoryCount: number | null;
  itemCount: number | null;
  openCount: number | null;
  doneCount: number | null;
}): StoredAccountCounts | null {
  const { categoryCount, itemCount, openCount, doneCount } = value;
  if (
    !isNonNegativeInt(categoryCount) ||
    !isNonNegativeInt(itemCount) ||
    !isNonNegativeInt(openCount) ||
    !isNonNegativeInt(doneCount)
  ) {
    return null;
  }
  return { categoryCount, itemCount, openCount, doneCount };
}

export function parseStoredAccountCounts(raw: string | null): StoredAccountCounts | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    return completeAccountCounts({
      categoryCount: typeof record.categoryCount === 'number' ? record.categoryCount : null,
      itemCount: typeof record.itemCount === 'number' ? record.itemCount : null,
      openCount: typeof record.openCount === 'number' ? record.openCount : null,
      doneCount: typeof record.doneCount === 'number' ? record.doneCount : null,
    });
  } catch {
    return null;
  }
}

/** Writes the four numbers only. Task bodies and extra keys never go to disk. */
export function serializeStoredAccountCounts(counts: StoredAccountCounts): string {
  return JSON.stringify({
    categoryCount: counts.categoryCount,
    itemCount: counts.itemCount,
    openCount: counts.openCount,
    doneCount: counts.doneCount,
  });
}

export async function loadAccountCounts(
  userId: string,
  store: AccountCountsStore
): Promise<StoredAccountCounts | null> {
  if (!userId) return null;
  const raw = await store.getItem(accountCountsKey(userId));
  return parseStoredAccountCounts(raw);
}

export async function saveAccountCounts(
  userId: string,
  counts: StoredAccountCounts,
  store: AccountCountsStore
): Promise<void> {
  if (!userId) return;
  const complete = completeAccountCounts(counts);
  if (!complete) return;
  await store.setItem(accountCountsKey(userId), serializeStoredAccountCounts(complete));
}

/** Drops every user-scoped counts key on this device. */
export async function clearAccountCounts(store: AccountCountsStore): Promise<void> {
  const keys = await store.getAllKeys();
  const ours = keys.filter((key) => key.startsWith(ACCOUNT_COUNTS_KEY_PREFIX));
  if (ours.length === 0) return;
  await store.multiRemove(ours);
}
