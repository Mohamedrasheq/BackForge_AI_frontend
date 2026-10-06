import type { Category, Item } from '@/types/api';

/** Product label for a null folder_id. UI copy says category, never folder. */
export const UNFILED_LABEL = 'Unfiled';

/** Stack param for the Unfiled detail. Not a server id. */
export const UNFILED_ROUTE_ID = 'unfiled';

export type CategoryBrowseRow = {
  id: string;
  name: string;
  /** True only for the synthetic Unfiled row (null or unknown folder_id). */
  unfiled: boolean;
  openCount: number;
  doneCount: number;
};

export type CategoryCountPart = {
  text: string;
  /** Open counts can take the amber accent. Everything else stays muted. */
  tone: 'open' | 'muted';
};

function nameMatches(name: string, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  return name.toLocaleLowerCase().includes(needle);
}

function timeOrNull(value: string | null): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

/**
 * Count label for a category row and the detail subtitle.
 * Both counts: `4 open · 12 done`. One side: `4 open` or `12 done`. Neither: `No tasks`.
 */
export function categoryCountParts(openCount: number, doneCount: number): CategoryCountPart[] {
  if (openCount > 0 && doneCount > 0) {
    return [
      { text: `${openCount} open`, tone: 'open' },
      { text: `${doneCount} done`, tone: 'muted' },
    ];
  }
  if (openCount > 0) return [{ text: `${openCount} open`, tone: 'open' }];
  if (doneCount > 0) return [{ text: `${doneCount} done`, tone: 'muted' }];
  return [{ text: 'No tasks', tone: 'muted' }];
}

export function categoryCountLabel(openCount: number, doneCount: number): string {
  return categoryCountParts(openCount, doneCount)
    .map((part) => part.text)
    .join(' · ');
}

/** "Work, 4 open, 12 done, opens category" */
export function categoryBrowseAccessibilityLabel(
  name: string,
  openCount: number,
  doneCount: number
): string {
  const counts =
    openCount > 0 && doneCount > 0
      ? `${openCount} open, ${doneCount} done`
      : openCount > 0
        ? `${openCount} open`
        : doneCount > 0
          ? `${doneCount} done`
          : 'No tasks';
  return `${name}, ${counts}, opens category`;
}

/**
 * One row per category, A to Z. Counts come from the items already loaded.
 * A category with no tasks still appears. Unfiled is last, and only when it has tasks.
 * Search matches category names only, not task text.
 * A folder id that is not in `categories` counts as Unfiled, same as All items sections.
 */
export function buildCategoryBrowseRows(
  categories: Category[],
  items: Item[],
  query = ''
): CategoryBrowseRow[] {
  const knownIds = new Set(categories.map((category) => category.id));
  const counts = new Map<string, { open: number; done: number }>();
  let unfiledOpen = 0;
  let unfiledDone = 0;

  for (const item of items) {
    const folderId = item.folderId;
    if (!folderId || !knownIds.has(folderId)) {
      if (item.status === 'done') unfiledDone += 1;
      else unfiledOpen += 1;
      continue;
    }

    const bucket = counts.get(folderId) ?? { open: 0, done: 0 };
    if (item.status === 'done') bucket.done += 1;
    else bucket.open += 1;
    counts.set(folderId, bucket);
  }

  const rows: CategoryBrowseRow[] = [...categories]
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    .filter((category) => nameMatches(category.name, query))
    .map((category) => {
      const count = counts.get(category.id) ?? { open: 0, done: 0 };
      return {
        id: category.id,
        name: category.name,
        unfiled: false,
        openCount: count.open,
        doneCount: count.done,
      };
    });

  if (unfiledOpen + unfiledDone > 0 && nameMatches(UNFILED_LABEL, query)) {
    rows.push({
      id: UNFILED_ROUTE_ID,
      name: UNFILED_LABEL,
      unfiled: true,
      openCount: unfiledOpen,
      doneCount: unfiledDone,
    });
  }

  return rows;
}

/** Header title. Null when the id is not Unfiled and not in the loaded categories. */
export function categoryBrowseTitle(categoryId: string, categories: Category[]): string | null {
  if (categoryId === UNFILED_ROUTE_ID) return UNFILED_LABEL;
  return categories.find((category) => category.id === categoryId)?.name ?? null;
}

/**
 * Items filed in this category.
 * Unfiled is null folder_id, plus unknown ids when `unknownFolderIsUnfiled` is set.
 */
export function itemsInCategory(
  items: Item[],
  categoryId: string,
  categories: Category[],
  options?: { unknownFolderIsUnfiled?: boolean }
): Item[] {
  const unknownFolderIsUnfiled = options?.unknownFolderIsUnfiled ?? true;
  if (categoryId === UNFILED_ROUTE_ID) {
    const knownIds = new Set(categories.map((category) => category.id));
    return items.filter((item) => {
      if (!item.folderId) return true;
      return unknownFolderIsUnfiled && !knownIds.has(item.folderId);
    });
  }
  return items.filter((item) => item.folderId === categoryId);
}

/** Soonest due first. Undated (and unparseable) due times last. */
export function sortOpenByDue(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    const aTime = timeOrNull(a.dueAt);
    const bTime = timeOrNull(b.dueAt);
    if (aTime == null && bTime == null) return 0;
    if (aTime == null) return 1;
    if (bTime == null) return -1;
    return aTime - bTime;
  });
}

/**
 * Newest completion first.
 * Items have no completed-at field, so this uses updatedAt, then createdAt.
 * Missing timestamps sort last.
 */
export function sortDoneByCompleted(items: Item[]): Item[] {
  return [...items].sort((a, b) => {
    const aTime = timeOrNull(a.updatedAt ?? a.createdAt);
    const bTime = timeOrNull(b.updatedAt ?? b.createdAt);
    if (aTime == null && bTime == null) return 0;
    if (aTime == null) return 1;
    if (bTime == null) return -1;
    return bTime - aTime;
  });
}
