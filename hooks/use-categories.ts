import { sortCategories } from '@/lib/categories';
import { createCategory, listCategories } from '@/services/api';
import type { Category } from '@/types/api';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const next = sortCategories(await listCategories());
      if (id !== requestId.current) return;
      setCategories(next);
      setError(null);
    } catch (err) {
      if (id !== requestId.current) return;
      setError(err instanceof Error ? err.message : 'Could not load categories');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const create = useCallback(async (name: string) => {
    const created = await createCategory(name);
    setCategories((current) =>
      sortCategories([...current.filter((category) => category.id !== created.id), created])
    );
    setError(null);
    return created;
  }, []);

  return { categories, loading, error, reload: load, create };
}
