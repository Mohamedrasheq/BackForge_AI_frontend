import { cardSurface, Theme } from '@/constants/theme';
import {
  ITEM_ROW_CHECK_SIZE,
  ITEM_ROW_SKELETON_CHIP_HEIGHT,
  ITEM_ROW_SKELETON_CHIP_WIDTH,
  ITEM_ROW_SKELETON_META_WIDTH,
  ITEM_ROW_SKELETON_TITLE_HEIGHT,
  ITEM_ROW_SKELETON_TITLE_SECOND_WIDTH,
  itemRowSkeletonHasSecondTitle,
  itemRowSkeletonTitleWidth,
  LIST_SKELETON_LABEL,
  LIST_SKELETON_OPACITY_MAX,
  LIST_SKELETON_OPACITY_MIN,
  LIST_SKELETON_STAGGER,
  rowsForHeight,
} from '@/lib/list-skeleton';
import { SHIMMER_PERIOD_MS } from '@/lib/voice-wave';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

type PulsePhase = Animated.Value | Animated.AnimatedInterpolation<number>;

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

function pulseOpacity(phase: PulsePhase, reduceMotion: boolean) {
  if (reduceMotion) return LIST_SKELETON_OPACITY_MIN;
  return phase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [LIST_SKELETON_OPACITY_MIN, LIST_SKELETON_OPACITY_MAX, LIST_SKELETON_OPACITY_MIN],
  });
}

function staggeredPhase(phase: Animated.Value, offset: Animated.Value): PulsePhase {
  return Animated.modulo(Animated.add(phase, offset), 1);
}

export function SkeletonBar({
  width,
  phase,
  reduceMotion,
  style,
}: {
  width: `${number}%`;
  phase: PulsePhase;
  reduceMotion: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = pulseOpacity(phase, reduceMotion);

  return <Animated.View style={[styles.bar, { width, opacity }, style]} />;
}

function ItemRowSkeleton({
  index,
  phase,
  reduceMotion,
}: {
  index: number;
  phase: Animated.Value;
  reduceMotion: boolean;
}) {
  const offset = useRef(new Animated.Value((index * LIST_SKELETON_STAGGER) % 1)).current;
  const rowPhase = staggeredPhase(phase, offset);
  const titleWidth = itemRowSkeletonTitleWidth(index);

  return (
    <View style={styles.itemRow}>
      <View style={styles.check} />
      <View style={styles.itemBody}>
        <View style={styles.titleBlock}>
          <SkeletonBar
            width={titleWidth}
            phase={rowPhase}
            reduceMotion={reduceMotion}
            style={styles.titleBar}
          />
          {itemRowSkeletonHasSecondTitle(index) ? (
            <SkeletonBar
              width={ITEM_ROW_SKELETON_TITLE_SECOND_WIDTH}
              phase={rowPhase}
              reduceMotion={reduceMotion}
              style={styles.titleBar}
            />
          ) : null}
        </View>
        <View style={styles.category}>
          <SkeletonBar
            width={ITEM_ROW_SKELETON_CHIP_WIDTH}
            phase={rowPhase}
            reduceMotion={reduceMotion}
            style={styles.chip}
          />
        </View>
        <SkeletonBar
          width={ITEM_ROW_SKELETON_META_WIDTH}
          phase={rowPhase}
          reduceMotion={reduceMotion}
          style={styles.dueBar}
        />
      </View>
    </View>
  );
}

export function ItemListSkeleton({ rows }: { rows?: number }) {
  const { phase, reduceMotion } = useSkeletonPulse();
  const [areaHeight, setAreaHeight] = useState(() => Dimensions.get('window').height);
  const count = rows ?? rowsForHeight(areaHeight);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={LIST_SKELETON_LABEL}
      accessibilityLiveRegion="polite"
      style={styles.fill}
      onLayout={
        rows == null
          ? (event) => {
              const next = event.nativeEvent.layout.height;
              if (next > 0) {
                setAreaHeight((prev) => (Math.abs(prev - next) < 1 ? prev : next));
              }
            }
          : undefined
      }
    >
      {Array.from({ length: count }, (_, index) => (
        <View key={index}>
          {index > 0 ? <View style={styles.sep} /> : null}
          <ItemRowSkeleton index={index} phase={phase} reduceMotion={reduceMotion} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    overflow: 'hidden',
  },
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
  },
  titleBlock: {
    gap: 6,
  },
  titleBar: {
    height: ITEM_ROW_SKELETON_TITLE_HEIGHT,
  },
  category: {
    marginTop: 8,
  },
  chip: {
    height: ITEM_ROW_SKELETON_CHIP_HEIGHT,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.color.accentSoft,
  },
  dueBar: {
    height: 8,
    marginTop: 4,
  },
  sep: {
    height: Theme.space.listGap,
  },
});
