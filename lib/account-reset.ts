import { dispatchAskSession } from '@/lib/ask-session';
import { resetReviewEntryDismissals } from '@/lib/review-entry-session';
import { clearReviewedAt } from '@/lib/review-memory';

/**
 * Drop everything this device holds for a deleted account.
 * Onboarding stays seen so the app lands on sign-in, not the intro.
 * Clerk's own session token is cleared by `signOut`.
 */
export async function clearLocalAccountData(): Promise<void> {
  dispatchAskSession({ type: 'clear' });
  resetReviewEntryDismissals();
  await clearReviewedAt().catch(() => undefined);
}
