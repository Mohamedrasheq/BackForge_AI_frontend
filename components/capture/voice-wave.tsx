import { IconSymbol } from '@/components/ui/icon-symbol';
import { Theme } from '@/constants/theme';
import {
  BAR_COUNT,
  BAR_RADIUS,
  BAR_WIDTH,
  HALO_OPACITY,
  IDLE_BAR_COLOR,
  LIVE_BAR_COLOR,
  MIC_BORDER_COLOR,
  MIC_SIZE,
  ROW_BLEED,
  ROW_HEIGHT,
  TRANSCRIBE_HEIGHT,
  TRANSCRIBING_MIC_OPACITY,
  barLeft,
  barOpacity,
  emptyLevels,
  haloScale,
  idleHeightFromInner,
  normalizeMetering,
  pushLevel,
  recordingBarHeight,
  reducedRecordingHeight,
  shouldCommitReducedFrame,
  smoothLevel,
  type WaveMode,
} from '@/lib/voice-wave';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolateColor,
  runOnUI,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

type WaveBarProps = {
  side: 0 | 1;
  indexFromInner: number;
  centerX: number;
  history: SharedValue<number[]>;
  mode: SharedValue<WaveMode>;
  displayLevel: SharedValue<number>;
  reduceMotion: SharedValue<boolean>;
  active: SharedValue<boolean>;
  colorMix: SharedValue<number>;
  shimmer: SharedValue<number>;
  shimmerMix: SharedValue<number>;
};

function WaveBar({
  side,
  indexFromInner,
  centerX,
  history,
  mode,
  displayLevel,
  reduceMotion,
  active,
  colorMix,
  shimmer,
  shimmerMix,
}: WaveBarProps) {
  const height = useSharedValue(idleHeightFromInner(indexFromInner));
  const x = barLeft(centerX, indexFromInner, side);

  useAnimatedReaction(
    () => ({
      mode: mode.value,
      level: history.value[indexFromInner] ?? 0,
      display: displayLevel.value,
      reduce: reduceMotion.value,
      active: active.value,
    }),
    (current, previous) => {
      const idle = idleHeightFromInner(indexFromInner);

      if (!current.active) {
        cancelAnimation(height);
        if (current.mode === 'idle') height.value = idle;
        else if (current.mode === 'transcribing') height.value = TRANSCRIBE_HEIGHT;
        return;
      }

      if (current.mode === 'recording') {
        if (current.reduce) {
          const next = reducedRecordingHeight(idle, current.display);
          if (height.value !== next) height.value = next;
          return;
        }
        const unchanged =
          previous !== null &&
          previous.mode === 'recording' &&
          !previous.reduce &&
          previous.active &&
          previous.level === current.level;
        if (unchanged) return;
        height.value = withTiming(recordingBarHeight(current.level, indexFromInner, side), {
          duration: 60,
          easing: Easing.linear,
        });
        return;
      }

      if (current.mode === 'transcribing') {
        if (current.reduce) {
          height.value = TRANSCRIBE_HEIGHT;
          return;
        }
        if (previous?.mode === 'transcribing' && previous.active && !previous.reduce) return;
        height.value = withTiming(TRANSCRIBE_HEIGHT, {
          duration: 250,
          easing: Easing.out(Easing.cubic),
        });
        return;
      }

      const animateIn =
        previous !== null && previous.mode !== 'idle' && previous.active && !current.reduce;
      if (animateIn) {
        height.value = withTiming(idle, { duration: 200, easing: Easing.linear });
      }
      else height.value = idle;
    }
  );

  const animatedProps = useAnimatedProps(() => {
    const h = height.value;
    return {
      x,
      y: (ROW_HEIGHT - h) / 2,
      width: BAR_WIDTH,
      height: h,
      rx: BAR_RADIUS,
      ry: BAR_RADIUS,
      fill: interpolateColor(colorMix.value, [0, 1], [IDLE_BAR_COLOR, LIVE_BAR_COLOR]),
      opacity: barOpacity(
        mode.value,
        reduceMotion.value,
        shimmer.value,
        indexFromInner,
        shimmerMix.value
      ),
    };
  });

  return (
    <AnimatedRect
      x={x}
      y={(ROW_HEIGHT - idleHeightFromInner(indexFromInner)) / 2}
      width={BAR_WIDTH}
      height={idleHeightFromInner(indexFromInner)}
      rx={BAR_RADIUS}
      ry={BAR_RADIUS}
      fill={IDLE_BAR_COLOR}
      opacity={barOpacity('idle', false, 0, indexFromInner, 0)}
      animatedProps={animatedProps}
    />
  );
}

function useCaptureReducedMotion(): boolean {
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

  return live ?? reducedAtLaunch;
}

export function VoiceWave({
  recording,
  transcribing,
  active,
  meteringDb,
  meteringTick,
  onPress,
}: {
  recording: boolean;
  transcribing: boolean;
  active: boolean;
  meteringDb: SharedValue<number>;
  meteringTick: SharedValue<number>;
  onPress: () => void;
}) {
  const reduceMotion = useCaptureReducedMotion();
  const [width, setWidth] = useState(0);
  const history = useSharedValue(emptyLevels());
  const mode = useSharedValue<WaveMode>('idle');
  const displayLevel = useSharedValue(0);
  const ema = useSharedValue(0);
  const lastSnap = useSharedValue(0);
  const reduceMotionSv = useSharedValue(reduceMotion);
  const activeSv = useSharedValue(active);
  const colorMix = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const shimmerMix = useSharedValue(0);

  const wasRecording = useRef(false);
  const wasTranscribing = useRef(false);
  const wasActive = useRef(active);

  useAnimatedReaction(
    () => meteringTick.value,
    (tick, previous) => {
      if (previous === null || tick === previous) return;
      if (mode.value !== 'recording' || !activeSv.value) return;

      const smoothed = smoothLevel(ema.value, normalizeMetering(meteringDb.value));
      ema.value = smoothed;
      if (reduceMotionSv.value) {
        const now = Date.now();
        if (shouldCommitReducedFrame(now, lastSnap.value)) {
          lastSnap.value = now;
          displayLevel.value = smoothed;
        }
      }
      history.value = pushLevel(history.value, smoothed);
    }
  );

  useEffect(() => {
    const next: WaveMode = recording ? 'recording' : transcribing ? 'transcribing' : 'idle';
    const reset = recording && !wasRecording.current;
    const enteringTranscribe = transcribing && !wasTranscribing.current;
    const resume = active && !wasActive.current;
    wasRecording.current = recording;
    wasTranscribing.current = transcribing;
    wasActive.current = active;

    runOnUI(() => {
      reduceMotionSv.value = reduceMotion;
      activeSv.value = active;

      if (reset) {
        ema.value = 0;
        displayLevel.value = 0;
        lastSnap.value = 0;
        history.value = emptyLevels();
      }

      mode.value = next;

      if (!active) {
        cancelAnimation(shimmer);
        cancelAnimation(shimmerMix);
        shimmer.value = 0;
        if (next === 'idle') {
          colorMix.value = 0;
          shimmerMix.value = 0;
        } else if (next === 'transcribing' || next === 'recording') {
          if (next === 'transcribing') shimmerMix.value = 0;
          colorMix.value = 1;
        }
        return;
      }

      if (next === 'recording') {
        cancelAnimation(shimmer);
        cancelAnimation(shimmerMix);
        shimmer.value = 0;
        shimmerMix.value = 0;
        colorMix.value = 1;
        return;
      }

      if (next === 'transcribing') {
        colorMix.value = 1;
        cancelAnimation(shimmer);
        cancelAnimation(shimmerMix);
        if (reduceMotion) {
          shimmer.value = 0;
          shimmerMix.value = 0;
          return;
        }
        if (enteringTranscribe && !resume) {
          shimmer.value = 0;
          shimmerMix.value = 0;
          shimmer.value = withDelay(
            250,
            withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1, false)
          );
          shimmerMix.value = withDelay(250, withTiming(1, { duration: 200, easing: Easing.linear }));
          return;
        }
        shimmer.value = 0;
        shimmer.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.linear }), -1, false);
        shimmerMix.value = 1;
        return;
      }

      cancelAnimation(shimmer);
      shimmer.value = 0;
      if (reduceMotion) {
        colorMix.value = 0;
        shimmerMix.value = 0;
        return;
      }
      colorMix.value = withTiming(0, { duration: 200, easing: Easing.linear });
      shimmerMix.value = withTiming(0, { duration: 200, easing: Easing.linear });
    })();

    return () => {
      cancelAnimation(shimmer);
    };
  }, [
    active,
    activeSv,
    colorMix,
    displayLevel,
    ema,
    history,
    lastSnap,
    mode,
    recording,
    reduceMotion,
    reduceMotionSv,
    shimmer,
    shimmerMix,
    transcribing,
  ]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: mode.value === 'recording' && !reduceMotionSv.value ? HALO_OPACITY : 0,
    transform: [{ scale: haloScale(ema.value) }],
  }));

  const label = recording ? 'Stop recording' : transcribing ? 'Transcribing' : 'Talk';
  const bars = [];
  if (width > 0) {
    const centerX = width / 2;
    for (let side = 0; side < 2; side++) {
      for (let indexFromInner = 0; indexFromInner < BAR_COUNT; indexFromInner++) {
        bars.push(
          <WaveBar
            key={`${side}-${indexFromInner}`}
            side={side as 0 | 1}
            indexFromInner={indexFromInner}
            centerX={centerX}
            history={history}
            mode={mode}
            displayLevel={displayLevel}
            reduceMotion={reduceMotionSv}
            active={activeSv}
            colorMix={colorMix}
            shimmer={shimmer}
            shimmerMix={shimmerMix}
          />
        );
      }
    }
  }

  return (
    <View
      style={styles.row}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        setWidth((current) => (current === next ? current : next));
      }}
    >
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.decor}
      >
        {width > 0 ? (
          <Svg width={width} height={ROW_HEIGHT} style={styles.wave}>
            {bars}
          </Svg>
        ) : null}
        <Animated.View pointerEvents="none" style={[styles.halo, haloStyle]} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={transcribing}
        onPress={onPress}
        style={({ pressed }) => [
          styles.mic,
          recording && styles.micRecording,
          transcribing && styles.micTranscribing,
          pressed && !transcribing && styles.micPressed,
        ]}
      >
        <IconSymbol
          name="mic.fill"
          size={28}
          color={recording || transcribing ? Theme.color.white : Theme.color.accent}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: MIC_SIZE,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  decor: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'visible',
  },
  wave: {
    marginTop: ROW_BLEED,
  },
  halo: {
    position: 'absolute',
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: MIC_SIZE / 2,
    backgroundColor: LIVE_BAR_COLOR,
    left: '50%',
    top: '50%',
    marginLeft: -MIC_SIZE / 2,
    marginTop: -MIC_SIZE / 2,
  },
  mic: {
    position: 'absolute',
    width: MIC_SIZE,
    height: MIC_SIZE,
    borderRadius: MIC_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.color.white,
    borderWidth: 1,
    borderColor: MIC_BORDER_COLOR,
    left: '50%',
    top: '50%',
    marginLeft: -MIC_SIZE / 2,
    marginTop: -MIC_SIZE / 2,
    zIndex: 2,
  },
  micRecording: {
    backgroundColor: Theme.color.accent,
    borderColor: Theme.color.accent,
  },
  micTranscribing: {
    backgroundColor: Theme.color.accent,
    borderColor: Theme.color.accent,
    opacity: TRANSCRIBING_MIC_OPACITY,
  },
  micPressed: {
    opacity: 0.8,
  },
});
