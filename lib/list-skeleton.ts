/** Shared loading placeholders for item lists and Capture parse. */

export const LIST_SKELETON_ROW_COUNT = 4;
export const LIST_SKELETON_LABEL = 'Loading';

export const PARSE_SKELETON_LABEL = 'Breaking down your note';
export const PARSE_SKELETON_BAR_WIDTHS = ['88%', '72%', '80%'] as const;

/** Title and muted due line, matching ItemRow copy. */
export const ITEM_ROW_SKELETON_TITLE_WIDTH = '72%';
export const ITEM_ROW_SKELETON_META_WIDTH = '40%';
export const ITEM_ROW_CHECK_SIZE = 26;

export type ListBodyKind = 'skeleton' | 'list';

/**
 * First load with no rows shows placeholders. A later refresh keeps the list.
 * `pending` covers extra waits (categories) that should not flash an empty state.
 */
export function listBodyKind(input: {
  loading: boolean;
  itemCount: number;
  pending?: boolean;
}): ListBodyKind {
  if (input.pending) return 'skeleton';
  if (input.loading && input.itemCount === 0) return 'skeleton';
  return 'list';
}
