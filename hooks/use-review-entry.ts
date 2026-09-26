import {
  dismissReviewEntry,
  isReviewEntryDismissed,
  subscribeReviewEntry,
  type ReviewEntrySurface,
} from '@/lib/review-entry-session';
import { useQuietItems } from '@/hooks/use-quiet-items';
import { useSyncExternalStore } from 'react';

/** Soft entry on Today or All items. Hidden when nothing is quiet, or dismissed this session. */
export function useReviewEntry(surface: ReviewEntrySurface) {
  const { items, loading, reload } = useQuietItems();
  const dismissed = useSyncExternalStore(
    subscribeReviewEntry,
    () => isReviewEntryDismissed(surface),
    () => false
  );

  return {
    show: !loading && !dismissed && items.length > 0,
    count: items.length,
    dismiss: () => dismissReviewEntry(surface),
    reload,
  };
}
