import {
  aiConsentStorageKey,
  aiConsentStoredValue,
  isAiConsentStored,
  type AiConsentStatus,
} from '@/lib/ai-consent';

export type AiConsentStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

export type AiConsentStore = {
  /** Snapshot for `useSyncExternalStore`. A plain string, so it is stable between reads. */
  getStatus: (userId: string | null | undefined) => AiConsentStatus;
  subscribe: (listener: () => void) => () => void;
  /** Starts the storage read for this user once. Later calls reuse it. */
  ensureLoaded: (userId: string | null | undefined) => Promise<void>;
  agree: (userId: string | null | undefined) => Promise<void>;
  clear: (userId: string | null | undefined) => Promise<void>;
};

export const AI_CONSENT_READ_TIMEOUT_MS = 1500;

/**
 * Per-user consent state shared by every screen.
 * State lives here, not in components, so unmounting or remounting during a read cannot drop it.
 * A read that fails or takes longer than `timeoutMs` shows the card ('needed') instead of waiting.
 */
export function createAiConsentStore({
  storage,
  timeoutMs = AI_CONSENT_READ_TIMEOUT_MS,
  setTimer = (callback, ms) => setTimeout(callback, ms),
  clearTimer = (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}: {
  storage: AiConsentStorage;
  timeoutMs?: number;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}): AiConsentStore {
  const statuses = new Map<string, AiConsentStatus>();
  const reads = new Map<string, Promise<void>>();
  const listeners = new Set<() => void>();

  const set = (userId: string, status: AiConsentStatus) => {
    if (statuses.get(userId) === status) return;
    statuses.set(userId, status);
    for (const listener of [...listeners]) listener();
  };

  const ensureLoaded = (userId: string | null | undefined): Promise<void> => {
    const key = aiConsentStorageKey(userId);
    if (!key || !userId) return Promise.resolve();
    const current = statuses.get(userId);
    if (current === 'agreed' || current === 'needed') return Promise.resolve();
    const pending = reads.get(userId);
    if (pending) return pending;

    statuses.set(userId, 'loading');
    const timer = setTimer(() => {
      if (statuses.get(userId) === 'loading') set(userId, 'needed');
    }, timeoutMs);

    const read = storage
      .getItem(key)
      .then(
        (raw) => {
          // A late "agreed" still wins over the timeout fallback, so nobody is asked twice.
          if (isAiConsentStored(raw)) set(userId, 'agreed');
          else if (statuses.get(userId) === 'loading') set(userId, 'needed');
        },
        () => {
          if (statuses.get(userId) === 'loading') set(userId, 'needed');
        }
      )
      .finally(() => {
        clearTimer(timer);
        reads.delete(userId);
      });
    reads.set(userId, read);
    return read;
  };

  return {
    getStatus: (userId) => (userId ? (statuses.get(userId) ?? 'loading') : 'loading'),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    ensureLoaded,
    agree: async (userId) => {
      const key = aiConsentStorageKey(userId);
      if (!key || !userId) return;
      set(userId, 'agreed');
      try {
        await storage.setItem(key, aiConsentStoredValue());
      } catch {
        // Still agreed for this session; the card returns next launch if storage failed.
      }
    },
    clear: async (userId) => {
      const key = aiConsentStorageKey(userId);
      if (!key || !userId) return;
      statuses.delete(userId);
      reads.delete(userId);
      for (const listener of [...listeners]) listener();
      await storage.removeItem(key);
    },
  };
}
