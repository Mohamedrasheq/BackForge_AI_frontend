import { cardSurface, Theme } from '@/constants/theme';
import {
  ITEM_ROW_CHECK_SIZE,
  ITEM_ROW_SKELETON_META_WIDTH,
  ITEM_ROW_SKELETON_TITLE_WIDTH,
  LIST_SKELETON_LABEL,
  LIST_SKELETON_ROW_COUNT,
} from '@/lib/list-skeleton';
import { SHIMMER_PERIOD_MS } from '@/lib/voice-wave';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

export function useReduceMotionEnabled(): boolean {
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

export function useSkeletonPulse(): {
  phase: Animated.Value;
  reduceMotion: boolean;
} {
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

  return { phase, reduceMotion };
}

export function SkeletonBar({
  width,
  phase,
  reduceMotion,
  style,
}: {
  width: `${number}%`;
  phase: Animated.Value;
  reduceMotion: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = reduceMotion
    ? 0.35
    : phase.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.28, 0.7, 0.28],
      });

  return <Animated.View style={[styles.bar, { width, opacity }, style]} />;
}

function ItemRowSkeleton({
  phase,
  reduceMotion,
}: {
  phase: Animated.Value;
  reduceMotion: boolean;
}) {
  return (
    <View style={styles.itemRow}>
      <View style={styles.check} />
      <View style={styles.itemBody}>
        <SkeletonBar width={ITEM_ROW_SKELETON_TITLE_WIDTH} phase={phase} reduceMotion={reduceMotion} />
        <SkeletonBar
          width={ITEM_ROW_SKELETON_META_WIDTH}
          phase={phase}
          reduceMotion={reduceMotion}
          style={styles.metaBar}
        />
      </View>
    </View>
  );
}

export function ItemListSkeleton({ rows = LIST_SKELETON_ROW_COUNT }: { rows?: number }) {
  const { phase, reduceMotion } = useSkeletonPulse();

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={LIST_SKELETON_LABEL}
      accessibilityLiveRegion="polite"
    >
      {Array.from({ length: rows }, (_, index) => (
        <View key={index}>
          {index > 0 ? <View style={styles.sep} /> : null}
          <ItemRowSkeleton phase={phase} reduceMotion={reduceMotion} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 14,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.color.border,
  },
  itemRow: {
    ...cardSurface,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 18,
    paddingHorizontal: Theme.space.md,
  },
  check: {
    width: ITEM_ROW_CHECK_SIZE,
    height: ITEM_ROW_CHECK_SIZE,
    marginTop: 1,
    borderRadius: ITEM_ROW_CHECK_SIZE / 2,
    borderWidth: 1.5,
    borderColor: Theme.color.textTertiary,
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
    gap: 8,
    paddingTop: 5,
  },
  metaBar: {
    height: 8,
    marginTop: 4,
  },
  sep: {
    height: Theme.space.listGap,
  },
});
