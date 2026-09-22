import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'hasSeenOnboarding';

type OnboardingState = {
  /** null while the device flag is still loading. */
  seen: boolean | null;
  markSeen: () => void;
};

const OnboardingContext = createContext<OnboardingState | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!cancelled) setSeen(value === 'true');
      })
      .catch(() => {
        if (!cancelled) setSeen(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const markSeen = useCallback(() => {
    setSeen(true);
    void AsyncStorage.setItem(STORAGE_KEY, 'true').catch(() => {
      // In-memory flag still sends this session to sign-in.
    });
  }, []);

  return (
    <OnboardingContext.Provider value={{ seen, markSeen }}>{children}</OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const value = useContext(OnboardingContext);
  if (!value) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return value;
}
