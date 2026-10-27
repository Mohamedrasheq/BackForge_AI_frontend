/**
 * Turn Ask proposals into Confirm drafts, and Confirm drafts into writes.
 * An edit sends only the fields that differ. Ask never deletes.
 */

import { calendarDayFromDate, dateChipLabel, longDateLabel } from '@/lib/date-filter';
import type { DraftKind, DraftWas } from '@/lib/confirm-drafts';
import { isSaveableDraft } from '@/lib/confirm-drafts';
import { UNFILED_LABEL } from '@/lib/category-browse';
import type { AskCandidate, AskProposal } from '@/lib/ask-contract';
import type { Category, Item, ProposedItem } from '@/types/api';

export type DraftSeed = {
  text?: string;
  dueAt?: string | null;
  folderId?: string | null;
  categoryName?: string | null;
  pendingNew?: boolean;
  suggestedFolderId?: string | null;
  suggestedCategory?: string | null;
  suggestedIsNew?: boolean;
  /** True when the model picked the clock time. Missing is false. */
  suggested?: boolean;
  categoryChosen?: boolean;
  kind?: DraftKind;
  itemId?: string;
  was?: DraftWas;
};

export type AskEditPatch = {
  text?: string;
  dueAt?: string | null;
  folderId?: string | null;
};

export type AskPlannedWrite =
  | { key: string; op: 'add'; item: ProposedItem }
  | { key: string; op: 'edit'; itemId: string; patch: AskEditPatch }
  | { key: string; op: 'done'; itemId: string }
  | { key: string; op: 'noop' };

type PlannedDraft = {
  key: string;
  kind?: DraftKind;
  itemId?: string;
  text: string;
  dueAt: string | null;
  folderId: string | null;
  categoryName: string | null;
  was?: DraftWas;
};

function categoryNameFor(folderId: string | null, categories: Category[]): string | null {
  if (!folderId) return null;
  return categories.find((category) => category.id === folderId)?.name ?? null;
}

function sameInstant(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  const left = Date.parse(a);
  const right = Date.parse(b);
  if (Number.isNaN(left) || Number.isNaN(right)) return a === b;
  return left === right;
}

export function formatWasDue(dueAt: string | null): string {
  if (!dueAt) return 'No date';
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return 'No date';
  const day = dateChipLabel(calendarDayFromDate(date));
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours %= 12;
  if (hours === 0) hours = 12;
  return `${day} ${hours}:${minutes} ${suffix}`;
}

/** One caption, only the fields that differ. Null when the edit matches `was`. */
export function wasLine(draft: {
  kind?: DraftKind;
  text: string;
  dueAt: string | null;
  categoryName: string | null;
  was?: DraftWas;
}): string | null {
  if (draft.kind !== 'edit' || !draft.was) return null;
  const parts: string[] = [];
  const nextText = draft.text.trim();
  const prevText = draft.was.text.trim();
  if (nextText !== prevText) parts.push(`"${prevText}"`);
  if (!sameInstant(draft.dueAt, draft.was.dueAt)) parts.push(formatWasDue(draft.was.dueAt));
  const nextCategory = (draft.categoryName?.trim() || UNFILED_LABEL).toLowerCase();
  const prevCategory = draft.was.categoryName?.trim() || UNFILED_LABEL;
  if (nextCategory !== prevCategory.toLowerCase()) parts.push(prevCategory);
  if (parts.length === 0) return null;
  return `Was: ${parts.join(' · ')}`;
}

export function proposalToDraftSeed(
  proposal: AskProposal,
  items: readonly Item[],
  categories: readonly Category[]
): DraftSeed {
  if (proposal.kind === 'done') {
    const item = items.find((entry) => entry.id === proposal.itemId);
    return {
      text: item?.text ?? '',
      dueAt: item?.dueAt ?? null,
      folderId: item?.folderId ?? null,
      categoryName: categoryNameFor(item?.folderId ?? null, categories as Category[]),
      pendingNew: false,
      categoryChosen: true,
      kind: 'done',
      itemId: proposal.itemId,
    };
  }

  if (proposal.kind === 'edit') {
    const item = items.find((entry) => entry.id === proposal.itemId);
    const folderId = proposal.folderId !== undefined ? proposal.folderId : (item?.folderId ?? null);
    return {
      text: proposal.text !== undefined ? proposal.text : (item?.text ?? ''),
      dueAt: proposal.dueAt !== undefined ? proposal.dueAt : (item?.dueAt ?? null),
      folderId,
      categoryName: categoryNameFor(folderId, categories as Category[]),
      pendingNew: false,
      categoryChosen: true,
      suggested: proposal.suggested === true,
      kind: 'edit',
      itemId: proposal.itemId,
      was: item
        ? {
            text: item.text,
            dueAt: item.dueAt,
            categoryName: categoryNameFor(item.folderId, categories as Category[]),
          }
        : undefined,
    };
  }

  if (proposal.folderId) {
    return {
      text: proposal.text,
      dueAt: proposal.dueAt,
      folderId: proposal.folderId,
      categoryName: categoryNameFor(proposal.folderId, categories as Category[]) ?? proposal.categoryName,
      pendingNew: false,
      categoryChosen: true,
      suggested: proposal.suggested === true,
      kind: 'add',
    };
  }

  const named = proposal.categoryName?.trim() ?? '';
  if (named) {
    const match = categories.find((category) => category.name.trim().toLowerCase() === named.toLowerCase());
    if (match) {
      return {
        text: proposal.text,
        dueAt: proposal.dueAt,
        folderId: match.id,
        categoryName: match.name,
        pendingNew: false,
        categoryChosen: true,
        suggested: proposal.suggested === true,
        kind: 'add',
      };
    }
    return {
      text: proposal.text,
      dueAt: proposal.dueAt,
      suggestedCategory: named,
      suggestedIsNew: true,
      categoryChosen: false,
      suggested: proposal.suggested === true,
      kind: 'add',
    };
  }

  return {
    text: proposal.text,
    dueAt: proposal.dueAt,
    folderId: null,
    categoryName: null,
    pendingNew: false,
    categoryChosen: true,
    suggested: proposal.suggested === true,
    kind: 'add',
  };
}

function planOne(draft: PlannedDraft, original: Item | undefined): AskPlannedWrite | null {
  if (!isSaveableDraft(draft)) return null;
  const kind = draft.kind ?? 'add';
  if (kind === 'done' && draft.itemId) {
    return { key: draft.key, op: 'done', itemId: draft.itemId };
  }
  if (kind === 'edit' && draft.itemId) {
    const patch: AskEditPatch = {};
    const baselineText = (original?.text ?? draft.was?.text ?? '').trim();
    const nextText = draft.text.trim();
    if (nextText !== baselineText) patch.text = nextText;
    const baselineDue = original ? original.dueAt : (draft.was?.dueAt ?? null);
    if (!sameInstant(draft.dueAt, baselineDue)) patch.dueAt = draft.dueAt;
    if (original) {
      if ((draft.folderId ?? null) !== (original.folderId ?? null)) {
        patch.folderId = draft.folderId ?? null;
      }
    } else if (draft.was) {
      const nextName = (draft.categoryName?.trim() || UNFILED_LABEL).toLowerCase();
      const prevName = (draft.was.categoryName?.trim() || UNFILED_LABEL).toLowerCase();
      if (nextName !== prevName) patch.folderId = draft.folderId ?? null;
    }
    if (patch.text === undefined && patch.dueAt === undefined && patch.folderId === undefined) {
      return { key: draft.key, op: 'noop' };
    }
    return { key: draft.key, op: 'edit', itemId: draft.itemId, patch };
  }
  return {
    key: draft.key,
    op: 'add',
    item: {
      text: draft.text.trim(),
      dueAt: draft.dueAt,
      folderId: draft.folderId,
      suggestedFolderId: null,
      suggestedCategory: null,
      suggestedIsNew: false,
    },
  };
}

export function planAskWrites(
  drafts: readonly PlannedDraft[],
  originals: ReadonlyMap<string, Item>
): AskPlannedWrite[] {
  const writes: AskPlannedWrite[] = [];
  for (const draft of drafts) {
    const original = draft.itemId ? originals.get(draft.itemId) : undefined;
    const planned = planOne(draft, original);
    if (planned) writes.push(planned);
  }
  return writes;
}

/** Ask confirms pass `source: 'ask'` on add, edit, and done. */
export function askWriteHandlers(api: {
  add: (items: ProposedItem[], source: 'ask') => Promise<unknown>;
  edit: (id: string, patch: AskEditPatch, source: 'ask') => Promise<unknown>;
  done: (id: string, source: 'ask') => Promise<unknown>;
}): {
  add: (item: ProposedItem) => Promise<void>;
  edit: (itemId: string, patch: AskEditPatch) => Promise<void>;
  done: (itemId: string) => Promise<void>;
} {
  return {
    add: async (item) => {
      await api.add([item], 'ask');
    },
    edit: async (itemId, patch) => {
      await api.edit(itemId, patch, 'ask');
    },
    done: async (itemId) => {
      await api.done(itemId, 'ask');
    },
  };
}

export async function applyPlannedWrites(
  writes: readonly AskPlannedWrite[],
  io: {
    add: (item: ProposedItem) => Promise<void>;
    edit: (itemId: string, patch: AskEditPatch) => Promise<void>;
    done: (itemId: string) => Promise<void>;
  }
): Promise<{ savedKeys: string[]; error: string | null }> {
  const savedKeys: string[] = [];
  for (const write of writes) {
    try {
      if (write.op === 'add') await io.add(write.item);
      else if (write.op === 'edit') await io.edit(write.itemId, write.patch);
      else if (write.op === 'done') await io.done(write.itemId);
      savedKeys.push(write.key);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save those changes';
      return { savedKeys, error: message };
    }
  }
  return { savedKeys, error: null };
}

export function candidateFollowUp(candidate: Pick<AskCandidate, 'text' | 'dueAt'>): string {
  if (!candidate.dueAt) return candidate.text;
  const date = new Date(candidate.dueAt);
  if (Number.isNaN(date.getTime())) return candidate.text;
  return `${candidate.text} (${dateChipLabel(calendarDayFromDate(date))})`;
}

export function candidateAccessibilityLabel(candidate: Pick<AskCandidate, 'text' | 'dueAt'>): string {
  if (!candidate.dueAt) return `${candidate.text}, choose this task`;
  const date = new Date(candidate.dueAt);
  if (Number.isNaN(date.getTime())) return `${candidate.text}, choose this task`;
  return `${candidate.text}, due ${longDateLabel(calendarDayFromDate(date))}, choose this task`;
}
