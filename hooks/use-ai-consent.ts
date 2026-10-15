import type { AiConsentStatus } from '@/lib/ai-consent';
import { createAiConsentStore } from '@/lib/ai-consent-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useSyncExternalStore } from 'react';

/** One store for the app, so agreeing on Capture unlocks Ask at once and vice versa. */
const store = createAiConsentStore({ storage: AsyncStorage });

/** Forget this user's agreement on the device. Used when the account is deleted. */
export function clearAiConsent(userId: string | null | undefined): Promise<void> {
  return store.clear(userId);
}

export function useAiConsent(): { status: AiConsentStatus; agree: () => void } {
  const { userId } = useAuth();
  const getSnapshot = useCallback(() => store.getStatus(userId), [userId]);
  const status = useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    void store.ensureLoaded(userId);
  }, [userId]);

  const agree = useCallback(() => {
    void store.agree(userId);
  }, [userId]);

  return { status, agree };
}
