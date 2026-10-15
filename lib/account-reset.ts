import { clearAiConsent } from '@/hooks/use-ai-consent';
import { dispatchAskSession } from '@/lib/ask-session';
import { resetReviewEntryDismissals } from '@/lib/review-entry-session';
import { clearReviewedAt } from '@/lib/review-memory';

/**
 * Drop everything this device holds for a deleted account.
 * Onboarding stays seen so the app lands on sign-in, not the intro.
 * Clerk's own session token is cleared by `signOut`.
 */
export async function clearLocalAccountData(userId: string | null | undefined): Promise<void> {
  dispatchAskSession({ type: 'clear' });
  resetReviewEntryDismissals();
  await Promise.allSettled([clearAiConsent(userId), clearReviewedAt()]);
}
