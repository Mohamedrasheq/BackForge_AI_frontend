import {
  aiConsentStatus,
  aiConsentStorageKey,
  aiConsentStoredValue,
  isAiConsentStored,
  type AiConsentStatus,
} from '@/lib/ai-consent';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@clerk/clerk-expo';
import { useCallback, useEffect, useState } from 'react';

/** Shared by Capture and Ask so agreeing on one unlocks the other at once. */
const known = new Map<string, boolean>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function setKnown(userId: string, agreed: boolean) {
  known.set(userId, agreed);
  notify();
}

/** Forget this user's agreement on the device. Used when the account is deleted. */
export async function clearAiConsent(userId: string | null | undefined): Promise<void> {
  const key = aiConsentStorageKey(userId);
  if (!key || !userId) return;
  known.delete(userId);
  notify();
  await AsyncStorage.removeItem(key);
}

export function useAiConsent(): { status: AiConsentStatus; agree: () => void } {
  const { userId } = useAuth();
  const [, setVersion] = useState(0);

  useEffect(() => {
    const listener = () => setVersion((value) => value + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    const key = aiConsentStorageKey(userId);
    if (!key || !userId || known.has(userId)) return;
    let cancelled = false;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (!cancelled && !known.has(userId)) setKnown(userId, isAiConsentStored(raw));
      })
      .catch(() => {
        if (!cancelled && !known.has(userId)) setKnown(userId, false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const agree = useCallback(() => {
    const key = aiConsentStorageKey(userId);
    if (!key || !userId) return;
    setKnown(userId, true);
    void AsyncStorage.setItem(key, aiConsentStoredValue()).catch(() => {
      // Still agreed for this session; the card returns next launch if storage failed.
    });
  }, [userId]);

  return { status: aiConsentStatus(userId, userId ? known.get(userId) : undefined), agree };
}
