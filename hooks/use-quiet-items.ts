import { loadQuietOpenItems } from '@/lib/review-load';
import type { Item } from '@/types/api';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

/** Open items eligible for Review. Refreshes when the screen is focused. */
export function useQuietItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);
  const seenItems = useRef(false);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    if (!seenItems.current) setLoading(true);
    try {
      const next = await loadQuietOpenItems();
      if (id !== requestId.current) return;
      seenItems.current = next.length > 0;
      setItems(next);
    } catch {
      if (id !== requestId.current) return;
      // A failed refresh keeps the last list. A failed first load stays empty.
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return { items, loading, reload: load };
}
