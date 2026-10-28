import { IconSymbol } from '@/components/ui/icon-symbol';
import { cardSurface, Theme } from '@/constants/theme';
import { SAVED_BANNER_FADE_MS, SAVED_BANNER_MS } from '@/lib/capture-status';
import { clearSavedFlash, getSavedFlashCount, savedFlashLabel, subscribeSavedFlash } from '@/lib/saved-flash';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

function useReduceMotionEnabled(): boolean {
  const reducedAtLaunch = useReducedMotion();
  const [live, setLive] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const apply = (enabled: boolean) => {
      if (mounted) setLive(enabled);
    };
    AccessibilityInfo.isReduceMotionEnabled()
      .then(apply)
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', apply);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return live ?? Boolean(reducedAtLaunch);
}

const AMBER_FILL = 'rgba(180, 83, 9, 0.08)';

export function SavedBanner() {
  const reduceMotion = useReduceMotionEnabled();
  const [count, setCount] = useState<number | null>(getSavedFlashCount);
  const opacity = useRef(new Animated.Value(0)).current;
  const label = savedFlashLabel(count);

  useEffect(() => subscribeSavedFlash(() => setCount(getSavedFlashCount())), []);

  useEffect(() => {
    if (count == null) {
      opacity.setValue(0);
      return;
    }

    if (reduceMotion) {
      opacity.setValue(1);
    } else {
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: SAVED_BANNER_FADE_MS,
        useNativeDriver: true,
      }).start();
    }

    const hide = setTimeout(() => {
      clearSavedFlash();
    }, SAVED_BANNER_MS);
    return () => clearTimeout(hide);
  }, [count, opacity, reduceMotion]);

  if (!label) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="text"
      style={[styles.banner, { opacity }]}
    >
      <IconSymbol name="checkmark.circle.fill" size={20} color={Theme.color.accent} />
      <Text style={styles.label}>{label}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    ...cardSurface,
    marginHorizontal: Theme.space.screenX,
    marginBottom: Theme.space.md,
    paddingVertical: 12,
    paddingHorizontal: Theme.space.md,
    backgroundColor: AMBER_FILL,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.space.sm,
  },
  label: {
    flexShrink: 1,
    fontSize: Theme.type.label,
    lineHeight: 20,
    fontWeight: '600',
    color: Theme.color.text,
  },
});
