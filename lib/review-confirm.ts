import type { ReviewDraft } from '@/lib/review';
import { ApiError, deleteItem, updateItem } from '@/services/api';

export type ReviewConfirmResult = {
  appliedIds: string[];
  error: string | null;
};

function changedText(row: Pick<ReviewDraft, 'text' | 'originalText'>): string | null {
  const next = row.text.trim();
  if (next === row.originalText.trim()) return null;
  return next;
}

function isMissing(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}

/**
 * Apply a confirmed Review. Keep updates the title only when it changed.
 * Move sets the chosen day (and the title when it changed). Drop deletes.
 * A missing item is treated as already gone so one stale row cannot block the rest.
 */
export async function confirmReview(rows: ReviewDraft[]): Promise<ReviewConfirmResult> {
  const appliedIds: string[] = [];

  for (const row of rows) {
    try {
      if (row.action === 'drop') {
        await deleteItem(row.id);
      } else if (row.action === 'move') {
        if (!row.dueAt) {
          return { appliedIds, error: 'Pick a day for each item you are moving.' };
        }
        const text = changedText(row);
        await updateItem(row.id, text ? { text, dueAt: row.dueAt } : { dueAt: row.dueAt });
      } else {
        const text = changedText(row);
        if (text) await updateItem(row.id, { text });
      }
      appliedIds.push(row.id);
    } catch (err) {
      if (isMissing(err)) {
        appliedIds.push(row.id);
        continue;
      }
      const message = err instanceof Error ? err.message : 'Could not save that review';
      return { appliedIds, error: message };
    }
  }

  return { appliedIds, error: null };
}
