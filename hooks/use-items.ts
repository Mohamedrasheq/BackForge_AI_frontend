import { getItems, getTodayItems, markItemDone } from '@/services/api';
import type { Item } from '@/types/api';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

export function useTodayItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const next = await getTodayItems();
      setItems(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load today');
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  return { items, loading, refreshing, error, reload: load, markDone };
}

export function useAllItems(query: string) {
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
      const next = await getItems(query);
      if (id !== requestId.current) return;
      setItems(next);
      setError(null);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : 'Could not load items');
    } finally {
      if (id === requestId.current) {
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
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, status: 'done' } : item))
    );
    try {
      await markItemDone(id);
    } catch (err) {
      setItems(previous);
      setError(err instanceof Error ? err.message : 'Could not mark done');
    }
  }, [items]);

  return { items, loading, refreshing, error, reload: load, markDone };
}
