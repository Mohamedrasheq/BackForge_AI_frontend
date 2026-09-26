import { buildReviewDrafts, quietOpenItems, type ReviewDraft } from '@/lib/review';
import { loadReviewedAt } from '@/lib/review-memory';
import { getItems } from '@/services/api';
import type { Item } from '@/types/api';

async function loadReviewContext(now: Date): Promise<{
  items: Item[];
  reviewedAt: Record<string, string>;
}> {
  const [items, reviewedAt] = await Promise.all([getItems(), loadReviewedAt(now)]);
  return { items, reviewedAt };
}

export async function loadQuietOpenItems(now = new Date()): Promise<Item[]> {
  const { items, reviewedAt } = await loadReviewContext(now);
  return quietOpenItems(items, reviewedAt, now);
}

export async function loadReviewDrafts(now = new Date()): Promise<ReviewDraft[]> {
  const { items, reviewedAt } = await loadReviewContext(now);
  return buildReviewDrafts(items, now, reviewedAt);
}
