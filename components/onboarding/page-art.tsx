import { IconSymbol } from '@/components/ui/icon-symbol';
import { cardSurface, Theme } from '@/constants/theme';
import { NUDGE_ART_BELL, NUDGE_ART_HALO_SIZE, artEntryMotion } from '@/lib/onboarding-layout';
import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const ENTER_SPRING = { duration: 320, dampingRatio: 1 } as const;

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

function ArtFrame({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={styles.frame}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {children}
    </View>
  );
}

export function DumpArt({ pulseMic }: { pulseMic: boolean }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!pulseMic) {
      cancelAnimation(scale);
      cancelAnimation(opacity);
      scale.value = withTiming(1, { duration: 180 });
      opacity.value = withTiming(1, { duration: 180 });
      return;
    }

    scale.value = withRepeat(withTiming(1.04, { duration: 600 }), -1, true);
    opacity.value = withRepeat(withTiming(0.72, { duration: 600 }), -1, true);
  }, [opacity, pulseMic, scale]);

  const chipStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <ArtFrame>
      <View style={styles.halo} />
      <View style={styles.noteStack}>
        <View style={[styles.note, styles.noteBack]}>
          <View style={[styles.line, { width: '78%' }]} />
          <View style={[styles.line, { width: '54%' }]} />
          <View style={[styles.line, { width: '66%' }]} />
        </View>
        <View style={[styles.note, styles.noteMid]}>
          <View style={[styles.line, { width: '90%' }]} />
          <View style={[styles.line, { width: '64%' }]} />
          <View style={[styles.line, { width: '76%' }]} />
        </View>
        <View style={[styles.note, styles.noteFront]}>
          <View style={[styles.line, styles.lineStrong, { width: '94%' }]} />
          <View style={[styles.line, { width: '72%' }]} />
          <View style={[styles.line, { width: '84%' }]} />
          <View style={[styles.line, styles.lineWarm, { width: '40%' }]} />
        </View>
        <Animated.View style={[styles.micChip, chipStyle]}>
          <IconSymbol name="mic.fill" size={18} color={Theme.color.white} />
        </Animated.View>
      </View>
    </ArtFrame>
  );
}

function Caret({ active }: { active: boolean }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!active) return;

    opacity.value = 1;
    opacity.value = withSequence(
      withTiming(0, { duration: 170 }),
      withTiming(1, { duration: 170 }),
      withTiming(0, { duration: 170 }),
      withTiming(1, { duration: 170 }),
      withTiming(0, { duration: 170 }),
      withTiming(1, { duration: 170 }),
    );
  }, [active, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.caret, style]} />;
}

export function ConfirmArt({ active }: { active: boolean }) {
  const rows = [
    { done: true, width: '74%' as const, focus: false },
    { done: false, width: '58%' as const, focus: true },
    { done: false, width: '66%' as const, focus: false },
  ];

  return (
    <ArtFrame>
      <View style={styles.list}>
        {rows.map((row, index) => (
          <View key={index} style={[styles.row, row.focus && styles.rowFocus]}>
            <View style={[styles.check, row.done && styles.checkDone]}>
              {row.done ? <IconSymbol name="checkmark" size={12} color={Theme.color.white} /> : null}
            </View>
            <View style={styles.lineSlot}>
              <View style={styles.lineStack}>
                <View
                  style={[styles.line, { width: row.width }, row.focus && styles.lineStrong]}
                />
                <View style={[styles.line, styles.lineThin, { width: row.focus ? '46%' : '38%' }]} />
              </View>
              {row.focus ? <Caret active={active} /> : null}
            </View>
          </View>
        ))}
      </View>
    </ArtFrame>
  );
}

function DatedCard({
  active,
  delay,
  titleWidth,
  dateWidth,
  reduceMotion = false,
}: {
  active: boolean;
  delay: number;
  titleWidth: `${number}%`;
  dateWidth: `${number}%`;
  reduceMotion?: boolean;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) return;

    const motion = artEntryMotion(active, reduceMotion);
    if (motion.settled) {
      progress.value = 1;
      return;
    }

    progress.value = 0;
    progress.value = withDelay(delay, withSpring(1, ENTER_SPRING));
  }, [active, delay, progress, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 14 }],
  }));

  return (
    <Animated.View style={[styles.itemCard, style]}>
      <View style={styles.accentBar} />
      <View style={styles.itemCopy}>
        <View style={[styles.line, styles.lineStrong, { width: titleWidth }]} />
        <View style={styles.dateChip}>
          <IconSymbol name="calendar" size={12} color={Theme.color.accent} />
          <View style={[styles.line, styles.lineWarm, styles.dateLine, { width: dateWidth }]} />
        </View>
      </View>
    </Animated.View>
  );
}

export function NudgeArt({ active }: { active: boolean }) {
  const reduceMotion = useReduceMotionEnabled();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) return;

    const motion = artEntryMotion(active, reduceMotion);
    if (motion.settled) {
      progress.value = 1;
      return;
    }

    progress.value = 0;
    progress.value = withDelay(80, withSpring(1, ENTER_SPRING));
  }, [active, progress, reduceMotion]);

  const bellStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 14 }],
  }));

  return (
    <ArtFrame>
      <View style={styles.halo} />
      <View style={styles.nudgeScene}>
        <DatedCard
          active={active}
          delay={0}
          titleWidth="86%"
          dateWidth="46%"
          reduceMotion={reduceMotion}
        />
        <Animated.View style={[styles.bellChip, bellStyle]}>
          <IconSymbol name={NUDGE_ART_BELL} size={18} color={Theme.color.white} />
        </Animated.View>
      </View>
    </ArtFrame>
  );
}

export function TodayArt({ active }: { active: boolean }) {
  const reduceMotion = useReduceMotionEnabled();

  return (
    <ArtFrame>
      <View style={styles.today}>
        <View style={styles.hero}>
          <View style={styles.heroMark} />
          <View style={styles.heroCopy}>
            <View style={[styles.line, styles.lineStrong, { width: '78%' }]} />
            <View style={[styles.line, styles.lineWarm, { width: '42%' }]} />
          </View>
          <View style={styles.heroPill} />
        </View>
        <DatedCard
          active={active}
          delay={0}
          titleWidth="86%"
          dateWidth="46%"
          reduceMotion={reduceMotion}
        />
        <DatedCard
          active={active}
          delay={60}
          titleWidth="70%"
          dateWidth="34%"
          reduceMotion={reduceMotion}
        />
      </View>
    </ArtFrame>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: NUDGE_ART_HALO_SIZE,
    height: NUDGE_ART_HALO_SIZE,
    borderRadius: NUDGE_ART_HALO_SIZE / 2,
    backgroundColor: Theme.color.accentSoft,
  },
  noteStack: {
    width: 280,
    height: 248,
  },
  note: {
    position: 'absolute',
    width: 214,
    paddingVertical: 16,
    paddingHorizontal: Theme.space.md,
    gap: 10,
    ...cardSurface,
  },
  noteBack: {
    top: 0,
    left: 8,
    backgroundColor: Theme.color.accentSoft,
    transform: [{ rotate: '-8deg' }],
  },
  noteMid: {
    top: 46,
    left: 52,
    transform: [{ rotate: '6deg' }],
  },
  noteFront: {
    top: 96,
    left: 18,
    transform: [{ rotate: '-2deg' }],
  },
  micChip: {
    position: 'absolute',
    right: 4,
    bottom: 6,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.card,
  },
  line: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.color.border,
  },
  lineWarm: {
    backgroundColor: Theme.color.accent,
    opacity: 0.4,
  },
  lineStrong: {
    backgroundColor: Theme.color.textTertiary,
  },
  list: {
    width: '88%',
    maxWidth: 320,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: Theme.radius.sm,
    backgroundColor: Theme.color.card,
    borderWidth: 1,
    borderColor: Theme.color.border,
  },
  rowFocus: {
    backgroundColor: Theme.color.accentSoft,
    borderColor: Theme.color.accent,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Theme.color.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: Theme.color.accent,
    borderColor: Theme.color.accent,
  },
  lineSlot: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lineStack: {
    flex: 1,
    gap: 8,
  },
  lineThin: {
    height: 6,
    opacity: 0.85,
  },
  caret: {
    width: 2,
    height: 16,
    borderRadius: 1,
    backgroundColor: Theme.color.accent,
  },
  today: {
    width: '88%',
    maxWidth: 320,
    gap: 14,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: Theme.radius.lg,
    backgroundColor: Theme.color.accentSoft,
  },
  heroMark: {
    width: 8,
    height: 36,
    borderRadius: 4,
    backgroundColor: Theme.color.accent,
  },
  heroCopy: {
    flex: 1,
    gap: 8,
  },
  heroPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Theme.color.card,
    borderWidth: 1,
    borderColor: Theme.color.border,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.color.background,
    borderWidth: 1,
    borderColor: Theme.color.border,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: Theme.color.accent,
  },
  itemCopy: {
    flex: 1,
    gap: 8,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateLine: {
    height: 6,
  },
  nudgeScene: {
    width: '88%',
    maxWidth: 320,
    paddingBottom: 20,
  },
  bellChip: {
    position: 'absolute',
    right: 4,
    bottom: 0,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.card,
  },
});
