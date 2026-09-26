import type { Category, Item } from '@/types/api';

/** Product label for a null folder_id. UI copy says category, never folder. */
export const UNFILED_LABEL = 'Unfiled';

export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/**
 * Match a parse suggestion to a category the user already has.
 * An unknown id or a new name is ignored — never created here.
 */
export function matchSuggestedCategory(
  suggestion: { suggestedFolderId: string | null; suggestedCategory: string | null },
  categories: Category[]
): Category | null {
  if (suggestion.suggestedFolderId) {
    const byId = categories.find((category) => category.id === suggestion.suggestedFolderId);
    if (byId) return byId;
  }

  const name = suggestion.suggestedCategory?.trim().toLowerCase();
  if (!name) return null;
  return categories.find((category) => category.name.trim().toLowerCase() === name) ?? null;
}

/** Read-only chip label. Null when the item is Unfiled or the name is not loaded yet. */
export function categoryLabelForItem(
  item: { folderId: string | null },
  categories: Category[]
): string | null {
  if (!item.folderId) return null;
  return categories.find((category) => category.id === item.folderId)?.name ?? null;
}

export type CategorySection = {
  title: string;
  data: Item[];
};

/** Done list sections. Null folder_id, and ids we cannot name, are Unfiled. Unfiled is last. */
export function groupItemsByCategory(items: Item[], categories: Category[]): CategorySection[] {
  const nameById = new Map(categories.map((category) => [category.id, category.name]));
  const groups = new Map<string, Item[]>();

  for (const item of items) {
    const title = (item.folderId && nameById.get(item.folderId)) || UNFILED_LABEL;
    const list = groups.get(title);
    if (list) list.push(item);
    else groups.set(title, [item]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === UNFILED_LABEL && b !== UNFILED_LABEL) return 1;
      if (b === UNFILED_LABEL && a !== UNFILED_LABEL) return -1;
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    })
    .map(([title, data]) => ({ title, data }));
}
