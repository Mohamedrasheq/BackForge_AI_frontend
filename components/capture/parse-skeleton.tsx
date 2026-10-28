import { Card } from '@/components/ui/card';
import { Theme } from '@/constants/theme';
import { SHIMMER_PERIOD_MS } from '@/lib/voice-wave';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
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

function SkeletonRow({
  width,
  phase,
  reduceMotion,
}: {
  width: `${number}%`;
  phase: Animated.Value;
  reduceMotion: boolean;
}) {
  const opacity = reduceMotion
    ? 0.35
    : phase.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.28, 0.7, 0.28],
      });

  return (
    <Animated.View
      style={[styles.row, { width, opacity }]}
    />
  );
}

export function ParseSkeleton() {
  const reduceMotion = useReduceMotionEnabled();
  const phase = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      phase.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(phase, {
        toValue: 1,
        duration: SHIMMER_PERIOD_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => {
      loop.stop();
      phase.setValue(0);
    };
  }, [phase, reduceMotion]);

  return (
    <Card accessibilityLabel="Breaking down your note" style={styles.card}>
      <View style={styles.stack}>
        <SkeletonRow width="88%" phase={phase} reduceMotion={reduceMotion} />
        <SkeletonRow width="72%" phase={phase} reduceMotion={reduceMotion} />
        <SkeletonRow width="80%" phase={phase} reduceMotion={reduceMotion} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 14,
  },
  stack: {
    gap: 12,
    paddingVertical: 4,
  },
  row: {
    height: 14,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.color.border,
  },
});
