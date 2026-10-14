/**
 * Pure rules for Confirm cards.
 * Capture drafts omit `kind` and stay adds. Ask sets kind, itemId, and was.
 */

import type { ProposedItem } from '@/types/api';

export type DraftKind = 'add' | 'edit' | 'done';

export type DraftWas = {
  text: string;
  dueAt: string | null;
  categoryName: string | null;
};

export type SaveableDraft = {
  kind?: DraftKind;
  itemId?: string;
  text: string;
  dueAt: string | null;
  folderId: string | null;
};

/** Done is always saveable. An edit needs an id and text. An add needs text. */
export function isSaveableDraft(item: {
  kind?: DraftKind;
  itemId?: string;
  text: string;
}): boolean {
  const kind = item.kind ?? 'add';
  if (kind === 'done') return Boolean(item.itemId);
  if (kind === 'edit') return Boolean(item.itemId) && item.text.trim().length > 0;
  return item.text.trim().length > 0;
}

export function saveableDraftItems(items: readonly SaveableDraft[]): ProposedItem[] {
  return items.filter(isSaveableDraft).map((item) => ({
    text: item.text.trim(),
    dueAt: item.dueAt,
    folderId: item.folderId,
    suggestedFolderId: null,
    suggestedCategory: null,
    suggestedIsNew: false,
  }));
}

export function draftKindLabel(kind?: DraftKind): 'Change' | 'Mark done' | null {
  if (kind === 'edit') return 'Change';
  if (kind === 'done') return 'Mark done';
  return null;
}

export function draftRemoveControl(
  kind: DraftKind | undefined,
  index: number
): { name: 'trash' | 'xmark'; tone: 'danger' | 'accent'; accessibilityLabel: string } {
  const n = index + 1;
  if (kind === 'edit' || kind === 'done') {
    return { name: 'xmark', tone: 'accent', accessibilityLabel: `Skip change ${n}` };
  }
  return { name: 'trash', tone: 'danger', accessibilityLabel: `Delete item ${n}` };
}

/** Muted line under a read-only done card. Category falls back to Unfiled. */
export function doneMetaLine(dueLabel: string | null, categoryName: string | null): string {
  const category = categoryName?.trim() || 'Unfiled';
  return dueLabel ? `${dueLabel} · ${category}` : category;
}
