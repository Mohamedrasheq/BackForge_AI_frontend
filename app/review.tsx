import { ReviewSession } from '@/components/review/review-session';
import { Screen } from '@/components/ui/screen';
import { useCategories } from '@/hooks/use-categories';
import { haptics } from '@/lib/haptics';
import { reviewConfirmError, type ReviewDraft } from '@/lib/review';
import { confirmReview } from '@/lib/review-confirm';
import { loadReviewDrafts } from '@/lib/review-load';
import { markReviewed } from '@/lib/review-memory';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Keyboard } from 'react-native';

export default function ReviewScreen() {
  const router = useRouter();
  const { categories } = useCategories();
  const [drafts, setDrafts] = useState<ReviewDraft[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    try {
      const next = await loadReviewDrafts();
      if (id !== requestId.current) return;
      setDrafts(next);
    } catch (err) {
      if (id !== requestId.current) return;
      setDrafts(null);
      setLoadError(err instanceof Error ? err.message : 'Could not load review');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!confirming) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [confirming]);

  const leaveToToday = useCallback(() => {
    Keyboard.dismiss();
    router.replace('/(tabs)');
  }, [router]);

  const close = useCallback(() => {
    if (confirming) return;
    haptics.light();
    Keyboard.dismiss();
    if (router.canGoBack()) {
      router.back();
      return;
    }
    leaveToToday();
  }, [confirming, leaveToToday, router]);

  const onConfirm = useCallback(async () => {
    if (!drafts || drafts.length === 0 || confirming) return;
    const problem = reviewConfirmError(drafts);
    if (problem) {
      setError(problem);
      haptics.error();
      return;
    }

    setConfirming(true);
    setError(null);
    Keyboard.dismiss();
    const result = await confirmReview(drafts);
    if (result.appliedIds.length > 0) {
      try {
        await markReviewed(result.appliedIds);
      } catch {
        // The server writes already landed. A missed cool-down only brings the entry back.
      }
    }

    if (result.error) {
      const applied = new Set(result.appliedIds);
      setDrafts((current) => (current ?? []).filter((row) => !applied.has(row.id)));
      setError(
        result.appliedIds.length > 0
          ? 'Some of those changed. The rest are still here.'
          : result.error
      );
      haptics.error();
      setConfirming(false);
      return;
    }

    haptics.success();
    leaveToToday();
  }, [confirming, drafts, leaveToToday]);

  return (
    <Screen>
      <Stack.Screen options={{ gestureEnabled: !confirming }} />
      <ReviewSession
        drafts={drafts}
        categories={categories}
        loading={loading}
        loadError={loadError}
        onRetry={() => void load()}
        onChange={(update) => setDrafts((current) => (current ? update(current) : current))}
        onConfirm={() => void onConfirm()}
        onClose={close}
        onEmptyClose={leaveToToday}
        confirming={confirming}
        error={error}
      />
    </Screen>
  );
}
