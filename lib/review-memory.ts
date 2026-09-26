import AsyncStorage from '@react-native-async-storage/async-storage';

import { pruneReviewedAt } from '@/lib/review';

const STORAGE_KEY = 'backforge.review.seen';

/**
 * Local cool-down so a confirmed Review does not immediately offer the same items.
 * This is not a server review log. Dropped items are simply gone.
 */

function parseMap(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const map: Record<string, string> = {};
    for (const [id, stamp] of Object.entries(value)) {
      if (typeof stamp === 'string') map[id] = stamp;
    }
    return map;
  } catch {
    return {};
  }
}

export async function loadReviewedAt(now = new Date()): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return pruneReviewedAt(parseMap(raw), now);
}

export async function markReviewed(ids: string[], now = new Date()): Promise<void> {
  if (ids.length === 0) return;
  const current = parseMap(await AsyncStorage.getItem(STORAGE_KEY));
  const stamp = now.toISOString();
  for (const id of ids) {
    if (id) current[id] = stamp;
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pruneReviewedAt(current, now)));
}
