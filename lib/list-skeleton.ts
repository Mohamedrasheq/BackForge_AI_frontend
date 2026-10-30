/** Shared loading placeholders for item lists and Capture parse. */

export const LIST_SKELETON_ROW_COUNT = 4;
export const LIST_SKELETON_LABEL = 'Loading';

/**
 * Today ItemRow (no onReschedule): 18+18 padding, 24pt title, 8+26 chip, 4+18 due.
 * Matches the real card height more closely than a single 14pt bar.
 */
export const LIST_SKELETON_ROW_EST = 116;
/** Same as Theme.space.listGap; kept numeric so this module stays RN-free. */
export const LIST_SKELETON_GAP = 12;
/** Fraction of the pulse period to shift each following row. */
export const LIST_SKELETON_STAGGER = 0.12;
export const LIST_SKELETON_OPACITY_MIN = 0.35;
export const LIST_SKELETON_OPACITY_MAX = 0.65;

export const PARSE_SKELETON_LABEL = 'Breaking down your note';
export const PARSE_SKELETON_BAR_WIDTHS = ['88%', '72%', '80%'] as const;

export const ITEM_ROW_SKELETON_TITLE_WIDTHS = ['88%', '72%', '80%', '64%'] as const;
export const ITEM_ROW_SKELETON_TITLE_SECOND_WIDTH = '56%';
export const ITEM_ROW_SKELETON_TITLE_HEIGHT = 16;
export const ITEM_ROW_SKELETON_CHIP_WIDTH = '30%';
export const ITEM_ROW_SKELETON_CHIP_HEIGHT = 26;
export const ITEM_ROW_SKELETON_META_WIDTH = '40%';
export const ITEM_ROW_CHECK_SIZE = 26;

export type ListBodyKind = 'skeleton' | 'list';

/**
 * How many ItemRow-sized placeholders fit in `height`.
 * Uses ceil so the last card can sit slightly past the fold.
 */
export function rowsForHeight(height: number): number {
  const stride = LIST_SKELETON_ROW_EST + LIST_SKELETON_GAP;
  if (!Number.isFinite(height) || height <= 0 || stride <= 0) {
    return LIST_SKELETON_ROW_COUNT;
  }
  return Math.max(1, Math.ceil(height / stride));
}

export function itemRowSkeletonTitleWidth(index: number): (typeof ITEM_ROW_SKELETON_TITLE_WIDTHS)[number] {
  const count = ITEM_ROW_SKELETON_TITLE_WIDTHS.length;
  const i = ((index % count) + count) % count;
  return ITEM_ROW_SKELETON_TITLE_WIDTHS[i];
}

/** First row is one title bar; following odd rows get a second shorter line. */
export function itemRowSkeletonHasSecondTitle(index: number): boolean {
  return index % 2 === 1;
}

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
