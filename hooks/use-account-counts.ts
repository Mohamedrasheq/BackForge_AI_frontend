import {
  completeAccountCounts,
  loadAccountCounts,
  saveAccountCounts,
} from '@/lib/account-counts';
import { getItems, listCategories } from '@/services/api';
import type { Item } from '@/types/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

export type AccountCounts = {
  /** Length of GET /categories. Null until that request succeeds. Unfiled is not a row. */
  categoryCount: number | null;
  /** Open rows from GET /items. */
  openCount: number | null;
  /** Done rows from GET /items. */
  doneCount: number | null;
  /** Every item returned by GET /items. */
  itemCount: number | null;
  loading: boolean;
};

function countByStatus(items: Item[]): { open: number; done: number } {
  let open = 0;
  let done = 0;
  for (const item of items) {
    if (item.status === 'done') done += 1;
    else if (item.status === 'open') open += 1;
  }
  return { open, done };
}

/** Exact Account totals from the category and item lists. Refreshes when the tab is focused. */
export function useAccountCounts(userId: string | null | undefined): AccountCounts {
  const [categoryCount, setCategoryCount] = useState<number | null>(null);
  const [openCount, setOpenCount] = useState<number | null>(null);
  const [doneCount, setDoneCount] = useState<number | null>(null);
  const [itemCount, setItemCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);
  const countsRef = useRef({ categoryCount, openCount, doneCount, itemCount });
  const userIdRef = useRef(userId);

  useEffect(() => {
    countsRef.current = { categoryCount, openCount, doneCount, itemCount };
  }, [categoryCount, openCount, doneCount, itemCount]);

  useEffect(() => {
    const previous = userIdRef.current;
    userIdRef.current = userId;
    if (previous && userId && previous !== userId) {
      setCategoryCount(null);
      setOpenCount(null);
      setDoneCount(null);
      setItemCount(null);
      requestId.current += 1;
    }
    if (!userId) return;
    let cancelled = false;
    void loadAccountCounts(userId, AsyncStorage)
      .then((cached) => {
        if (cancelled || !cached) return;
        setCategoryCount((current) => current ?? cached.categoryCount);
        setItemCount((current) => current ?? cached.itemCount);
        setOpenCount((current) => current ?? cached.openCount);
        setDoneCount((current) => current ?? cached.doneCount);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const [categoriesResult, itemsResult] = await Promise.allSettled([
        listCategories(),
        getItems(),
      ]);
      if (id !== requestId.current) return;

      const current = countsRef.current;
      let nextCategory = current.categoryCount;
      let nextOpen = current.openCount;
      let nextDone = current.doneCount;
      let nextItem = current.itemCount;

      if (categoriesResult.status === 'fulfilled') {
        nextCategory = categoriesResult.value.length;
        setCategoryCount(nextCategory);
      }
      if (itemsResult.status === 'fulfilled') {
        const items = itemsResult.value;
        const counts = countByStatus(items);
        nextOpen = counts.open;
        nextDone = counts.done;
        nextItem = items.length;
        setOpenCount(nextOpen);
        setDoneCount(nextDone);
        setItemCount(nextItem);
      }

      const stored = completeAccountCounts({
        categoryCount: nextCategory,
        itemCount: nextItem,
        openCount: nextOpen,
        doneCount: nextDone,
      });
      const signedInId = userIdRef.current;
      if (stored && signedInId) {
        void saveAccountCounts(signedInId, stored, AsyncStorage).catch(() => undefined);
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return { categoryCount, openCount, doneCount, itemCount, loading };
}
