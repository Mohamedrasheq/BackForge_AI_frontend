import { getItems, listCategories } from '@/services/api';
import type { Item } from '@/types/api';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

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
export function useAccountCounts(): AccountCounts {
  const [categoryCount, setCategoryCount] = useState<number | null>(null);
  const [openCount, setOpenCount] = useState<number | null>(null);
  const [doneCount, setDoneCount] = useState<number | null>(null);
  const [itemCount, setItemCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const [categoriesResult, itemsResult] = await Promise.allSettled([
        listCategories(),
        getItems(),
      ]);
      if (id !== requestId.current) return;

      if (categoriesResult.status === 'fulfilled') {
        setCategoryCount(categoriesResult.value.length);
      }
      if (itemsResult.status === 'fulfilled') {
        const items = itemsResult.value;
        const counts = countByStatus(items);
        setOpenCount(counts.open);
        setDoneCount(counts.done);
        setItemCount(items.length);
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
