import { isAfterLocalToday, isBeforeLocalToday } from '@/lib/due';
import { haptics } from '@/lib/haptics';
import { deleteItem, getItems, getTodayItems, markItemDone, updateItem, updateItemDue } from '@/services/api';
import type { Item } from '@/types/api';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Today is only items due on the current local calendar day (plus undated). Overdue lives in All items / Review. */
function visibleOnToday(item: Item, now = new Date()): boolean {
  return !isAfterLocalToday(item.dueAt, now) && !isBeforeLocalToday(item.dueAt, now);
}

export function useTodayItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async (isRefresh = false) => {
    const id = ++requestId.current;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const next = (await getTodayItems()).filter((item) => visibleOnToday(item));
      if (id !== requestId.current) return;
      setItems(next);
      setError(null);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : 'Could not load today');
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const markDone = useCallback(async (id: string) => {
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== id));
    try {
      await markItemDone(id);
    } catch (err) {
      setItems(previous);
      setError(err instanceof Error ? err.message : 'Could not mark done');
    }
  }, [items]);

  const reload = useCallback((isRefresh?: boolean) => load(Boolean(isRefresh)), [load]);

  return { items, loading, refreshing, error, reload, markDone };
}

export function useAllItems(query: string) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  /** Query string that `items` was loaded for. Null until the first successful fetch. */
  const [loadedQuery, setLoadedQuery] = useState<string | null>(null);
  const itemsRef = useRef(items);
  const requestId = useRef(0);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const load = useCallback(async (isRefresh = false, silent = false) => {
    const id = ++requestId.current;
    if (!silent) {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
    }

    try {
      const next = await getItems(query);
      if (id !== requestId.current) return;
      setItems(next);
      setLoadedQuery(query);
      setError(null);
    } catch (err) {
      if (id !== requestId.current) return;
      if (!silent) {
        setError(err instanceof Error ? err.message : 'Could not load items');
      }
    } finally {
      if (!silent && id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [query]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const markDone = useCallback(async (id: string) => {
    const previous = items;
    // Category detail sorts Done by updatedAt. Items have no completed-at field.
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, status: 'done', updatedAt: new Date().toISOString() }
          : item
      )
    );
    try {
      await markItemDone(id);
    } catch (err) {
      setItems(previous);
      setError(err instanceof Error ? err.message : 'Could not mark done');
    }
  }, [items]);

  const saveItem = useCallback(async (id: string, patch: { text: string; dueAt: string | null }) => {
    const previous = items;
    setError(null);
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, text: patch.text, dueAt: patch.dueAt } : item
      )
    );
    try {
      const saved = await updateItem(id, patch);
      if (saved) {
        setItems((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  text: saved.text || patch.text,
                  dueAt: saved.dueAt ?? patch.dueAt,
                  status: item.status,
                }
              : item
          )
        );
      }
    } catch (err) {
      setItems(previous);
      const message = err instanceof Error ? err.message : 'Could not save that';
      setError(message);
      throw err;
    }
  }, [items]);

  const removeItem = useCallback(async (id: string) => {
    const previous = items;
    setError(null);
    setItems((current) => current.filter((item) => item.id !== id));
    try {
      await deleteItem(id);
    } catch (err) {
      setItems(previous);
      const message = err instanceof Error ? err.message : 'Could not delete that';
      setError(message);
      throw err;
    }
  }, [items]);

  const reschedule = useCallback(async (id: string, dueAt: string) => {
    // Drop an in-flight list fetch so it cannot overwrite the new due time.
    requestId.current += 1;
    setLoading(false);
    setRefreshing(false);
    const previous = itemsRef.current;
    setMovingId(id);
    setItems(previous.map((item) => (item.id === id ? { ...item, dueAt } : item)));
    try {
      const saved = await updateItemDue(id, dueAt);
      if (saved) {
        setItems((current) =>
          current.map((item) =>
            item.id === id ? { ...item, dueAt: saved.dueAt ?? dueAt } : item
          )
        );
      }
    } catch (err) {
      setItems(previous);
      haptics.error();
      setError(err instanceof Error ? err.message : 'Could not move that');
      return;
    } finally {
      setMovingId(null);
    }

    haptics.success();
    await load(false, true);
  }, [load]);

  return {
    items,
    loading,
    refreshing,
    error,
    reload: load,
    markDone,
    saveItem,
    removeItem,
    reschedule,
    movingId,
    loadedQuery,
  };
}
