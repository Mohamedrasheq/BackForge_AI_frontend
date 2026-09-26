/**
 * Hook for a future push nudge into Review.
 *
 * Real push delivery waits on a paid Apple Developer account.
 * This build does not schedule or send review notifications.
 * When one arrives, its data payload should be `{ type: 'review' }`
 * and the notification response handler routes here — not into a second inbox.
 */

export const REVIEW_PUSH_DATA_TYPE = 'review';

export const REVIEW_HREF = '/review' as const;

export function reviewHrefFromNotificationData(data: unknown): typeof REVIEW_HREF | null {
  if (!data || typeof data !== 'object') return null;
  const type = (data as { type?: unknown }).type;
  return type === REVIEW_PUSH_DATA_TYPE ? REVIEW_HREF : null;
}
