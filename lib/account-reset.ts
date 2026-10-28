import { clearAccountCounts } from '@/lib/account-counts';
import { dispatchAskSession } from '@/lib/ask-session';
import { resetReviewEntryDismissals } from '@/lib/review-entry-session';
import { clearReviewedAt } from '@/lib/review-memory';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const RESET_ONBOARDING_LABEL = 'Reset onboarding';
export const RESET_ONBOARDING_TITLE = 'Reset onboarding?';

/**
 * Drop everything this device holds for the signed-in account.
 * Used on sign-out and account delete.
 * Onboarding stays seen so the app lands on sign-in, not the intro.
 * Clerk's own session token is cleared by `signOut`.
 */
export async function clearLocalAccountData(): Promise<void> {
  dispatchAskSession({ type: 'clear' });
  resetReviewEntryDismissals();
  await clearReviewedAt().catch(() => undefined);
  await clearAccountCounts(AsyncStorage).catch(() => undefined);
}
