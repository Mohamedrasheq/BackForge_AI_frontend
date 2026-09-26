/**
 * Quiet-item tuning knobs for Review.
 * These are thresholds, not new product surfaces.
 *
 * An open item is eligible when it is past due, untouched with a due time,
 * or undated and sitting. Recently created or recently reviewed items are not.
 */

export const REVIEW_QUIET = {
  /** Created within this many days — not eligible. */
  recentCreatedDays: 2,
  /** Confirmed in a Review within this many days — not eligible. */
  recentReviewedDays: 7,
  /** Open, has a due time, and last touched at least this many days ago. */
  untouchedWithDueDays: 7,
  /** Undated and open for at least this many days. Not forced onto Today. */
  undatedSittingDays: 14,
  /** Past due by at least this many calendar days — proposal defaults to Drop. */
  staleOverdueDays: 14,
  /** Local hour used when Move needs a day and the item has no due time. */
  suggestedHour: 9,
} as const;
