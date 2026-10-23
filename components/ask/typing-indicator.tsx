import { Theme } from '@/constants/theme';
import { ASK_THINKING } from '@/lib/ask-contract';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const DOT_SIZE = 7;
const STEP_MS = 400;
const DIM = 0.3;
const STATIC = 0.6;

function Dot({ index, reduceMotion }: { index: number; reduceMotion: boolean }) {
  const opacity = useSharedValue(reduceMotion ? STATIC : DIM);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(opacity);
      opacity.value = STATIC;
      return;
    }
    opacity.value = DIM;
    // Three 400ms steps make a 1.2s loop; each dot starts one step later.
    opacity.value = withDelay(
      index * STEP_MS,
      withRepeat(
        withSequence(
          withTiming(1, { duration: STEP_MS }),
          withTiming(DIM, { duration: STEP_MS }),
          withTiming(DIM, { duration: STEP_MS })
        ),
        -1
      )
    );
    return () => cancelAnimation(opacity);
  }, [index, opacity, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.dot, style]} />;
}

export function TypingIndicator({
  reduceMotion,
  label = ASK_THINKING,
}: {
  reduceMotion: boolean;
  label?: string;
}) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.dots}>
        {[0, 1, 2].map((index) => (
          <Dot key={index} index={index} reduceMotion={reduceMotion} />
        ))}
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.space.sm,
    minHeight: 22,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: Theme.color.textTertiary,
  },
  label: {
    fontSize: Theme.type.caption,
    lineHeight: 18,
    color: Theme.color.textSecondary,
  },
});
