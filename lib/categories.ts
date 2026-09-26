import { DuplicateCategoryError } from '@/services/api';
import type { Category, Item } from '@/types/api';

/** Product label for a null folder_id. UI copy says category, never folder. */
export const UNFILED_LABEL = 'Unfiled';

export function categoryNameKey(name: string): string {
  return name.trim().toLowerCase();
}

export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/**
 * Match a parse suggestion to a category the user already has.
 * An unknown id or an invented name returns null. Creation happens on Confirm.
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
  return categories.find((category) => categoryNameKey(category.name) === name) ?? null;
}

export type ResolvedCategorySuggestion = {
  folderId: string | null;
  categoryName: string | null;
  /** True when the chip shows a name that does not exist until Confirm. */
  pendingNew: boolean;
};

/**
 * Prefill for a confirm draft.
 * An existing category wins. Otherwise an invented name is shown with no id.
 */
export function resolveCategorySuggestion(
  suggestion: {
    suggestedFolderId: string | null;
    suggestedCategory: string | null;
    suggestedIsNew?: boolean;
  },
  categories: Category[]
): ResolvedCategorySuggestion {
  const matched = matchSuggestedCategory(suggestion, categories);
  if (matched) {
    return { folderId: matched.id, categoryName: matched.name, pendingNew: false };
  }

  const invented = suggestion.suggestedCategory?.trim() ?? '';
  if (suggestion.suggestedIsNew && invented) {
    return { folderId: null, categoryName: invented, pendingNew: true };
  }

  return { folderId: null, categoryName: null, pendingNew: false };
}

type PendingCategoryDraft = {
  text: string;
  folderId: string | null;
  categoryName: string | null;
  pendingNew: boolean;
  categoryChosen: boolean;
};

/** Invented name still waiting on Confirm. Already-filed rows are skipped. */
export function pendingCategoryName(item: {
  folderId: string | null;
  categoryName: string | null;
  pendingNew: boolean;
}): string | null {
  if (!item.pendingNew || item.folderId) return null;
  const name = item.categoryName?.trim() ?? '';
  return name || null;
}

/**
 * First occurrence of each invented name that will actually be saved.
 * Blank rows do not create a category. Comparison is case-insensitive.
 */
export function collectPendingCategoryNames(
  items: Array<{
    text: string;
    folderId: string | null;
    categoryName: string | null;
    pendingNew: boolean;
  }>
): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const item of items) {
    if (!item.text.trim()) continue;
    const name = pendingCategoryName(item);
    if (!name) continue;
    const key = categoryNameKey(name);
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

/**
 * Create each invented name once. A name the user already has is reused.
 * `DuplicateCategoryError` lists categories and reuses the existing id.
 */
export async function createPendingCategoryNames(
  names: string[],
  options: {
    known: Category[];
    create: (name: string) => Promise<Category>;
    list: () => Promise<Category[]>;
    onCreated?: (key: string, category: Category) => void;
    /** False once the user has cleared that name, so Confirm does not create it. */
    stillPending?: (key: string) => boolean;
  }
): Promise<Map<string, Category>> {
  const byKey = new Map<string, Category>();
  let known = options.known;

  for (const name of names) {
    const key = categoryNameKey(name);
    if (!key || byKey.has(key)) continue;
    if (options.stillPending && !options.stillPending(key)) continue;

    const existing = known.find((category) => categoryNameKey(category.name) === key);
    if (existing) {
      byKey.set(key, existing);
      options.onCreated?.(key, existing);
      continue;
    }

    try {
      const created = await options.create(name);
      byKey.set(key, created);
      known = [...known.filter((category) => category.id !== created.id), created];
      options.onCreated?.(key, created);
    } catch (err) {
      if (!(err instanceof DuplicateCategoryError)) throw err;
      const fresh = await options.list();
      const found = fresh.find((category) => categoryNameKey(category.name) === key);
      if (!found) throw err;
      byKey.set(key, found);
      known = fresh;
      options.onCreated?.(key, found);
    }
  }

  return byKey;
}

/** Stamp created ids onto drafts that still show that invented name. */
export function applyCreatedCategories<T extends PendingCategoryDraft>(
  items: T[],
  created: Map<string, Category>
): T[] {
  if (created.size === 0) return items;
  let changed = false;
  const next = items.map((item) => {
    const name = pendingCategoryName(item);
    if (!name) return item;
    const category = created.get(categoryNameKey(name));
    if (!category) return item;
    changed = true;
    return {
      ...item,
      folderId: category.id,
      categoryName: category.name,
      pendingNew: false,
      categoryChosen: true,
    };
  });
  return changed ? next : items;
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
