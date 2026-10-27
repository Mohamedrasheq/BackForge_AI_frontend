import { FilterChip } from '@/components/ui/filter-chips';
import { Theme } from '@/constants/theme';
import {
  isPresetTimePast,
  matchingTimePresetId,
  TIME_PRESETS,
  type TimePresetId,
} from '@/lib/due';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, ScrollView, StyleSheet } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

const CHIP_ROW_HEIGHT = Theme.space.sm + 36 + Theme.space.xs;
const EXPAND_MS = 150;

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

export function TimeChips({
  dueAt,
  open,
  always = false,
  onSelectPreset,
  onPickTime,
}: {
  dueAt: string | null;
  /** Toggle mode: expand/collapse. Ignored when `always`. */
  open: boolean;
  /** Edit sheet: the row stays expanded. */
  always?: boolean;
  onSelectPreset: (preset: { id: TimePresetId; hours: number; minutes: number }) => void;
  onPickTime: () => void;
}) {
  const reduceMotion = useReduceMotionEnabled();
  const visible = always || open;
  const height = useRef(new Animated.Value(visible ? CHIP_ROW_HEIGHT : 0)).current;
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const selected = matchingTimePresetId(dueAt);

  useEffect(() => {
    if (always) {
      height.setValue(CHIP_ROW_HEIGHT);
      opacity.setValue(1);
      return;
    }
    const duration = reduceMotion ? 0 : EXPAND_MS;
    Animated.parallel([
      Animated.timing(height, {
        toValue: open ? CHIP_ROW_HEIGHT : 0,
        duration,
        useNativeDriver: false,
      }),
      Animated.timing(opacity, {
        toValue: open ? 1 : 0,
        duration,
        useNativeDriver: false,
      }),
    ]).start();
  }, [always, height, opacity, open, reduceMotion]);

  const row = (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
    >
      {TIME_PRESETS.map((preset) => (
        <FilterChip
          key={preset.id}
          label={preset.label}
          active={selected === preset.id}
          disabled={isPresetTimePast(dueAt, preset.hours, preset.minutes)}
          allowReselect
          onPress={() => onSelectPreset(preset)}
        />
      ))}
      <FilterChip label="Pick time" active={false} onPress={onPickTime} />
    </ScrollView>
  );

  if (always) {
    return row;
  }

  return (
    <Animated.View
      pointerEvents={open ? 'auto' : 'none'}
      style={[styles.clip, { height, opacity }]}
    >
      {row}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.space.sm,
    paddingTop: Theme.space.sm,
    paddingBottom: Theme.space.xs,
  },
});
