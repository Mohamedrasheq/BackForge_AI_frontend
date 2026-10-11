import { IconSymbol } from '@/components/ui/icon-symbol';
import { cardSurface, Theme } from '@/constants/theme';
import {
  buildMonthGrid,
  calendarDayFromDate,
  countItemsByDueDay,
  dayAccessibilityLabel,
  dayKey,
  dueDot,
  localeWeekStartsOn,
  monthDelta,
  monthSwipeDelta,
  monthTitle,
  shiftMonth,
  toggleSelectedDay,
  weekdayInitials,
  type CalendarDay,
  type CalendarMonth,
} from '@/lib/date-filter';
import { haptics } from '@/lib/haptics';
import type { Item } from '@/types/api';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';

const DOT_GREY = '#9CA3AF';
const MONTH_SLIDE = 28;

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

function HeaderTextButton({
  label,
  accessibilityLabel,
  accessibilityHint,
  onPress,
}: {
  label: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      hitSlop={8}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
    >
      <Text style={styles.headerActionText}>{label}</Text>
    </Pressable>
  );
}

export function MonthCalendar({
  items,
  month,
  onMonthChange,
  selected,
  onSelectedChange,
}: {
  items: readonly Item[];
  month: CalendarMonth;
  onMonthChange: (month: CalendarMonth) => void;
  selected: CalendarDay | null;
  onSelectedChange: (day: CalendarDay | null) => void;
}) {
  const reduceMotion = useReduceMotionEnabled();
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;
  const monthRef = useRef(month);
  monthRef.current = month;
  const onMonthChangeRef = useRef(onMonthChange);
  onMonthChangeRef.current = onMonthChange;

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const animating = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    const shift = translateX;
    const fade = opacity;
    return () => {
      generation.current += 1;
      animating.current = false;
      shift.stopAnimation();
      fade.stopAnimation();
    };
  }, [opacity, translateX]);

  const snapBack = () => {
    if (animating.current) return;
    if (reduceMotionRef.current) {
      translateX.setValue(0);
      opacity.setValue(1);
      return;
    }
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: 0,
        duration: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const runMonthChange = (delta: number, target: CalendarMonth) => {
    if (delta === 0 || animating.current) return false;
    const gen = generation.current;
    if (reduceMotionRef.current) {
      translateX.setValue(0);
      opacity.setValue(1);
      onMonthChangeRef.current(target);
      return true;
    }

    animating.current = true;
    const out = delta > 0 ? -MONTH_SLIDE : MONTH_SLIDE;
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: out,
        duration: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0.35,
        duration: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (!finished || gen !== generation.current) {
        animating.current = false;
        return;
      }
      translateX.setValue(-out);
      opacity.setValue(0.35);
      onMonthChangeRef.current(target);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 140,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 140,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (gen === generation.current) animating.current = false;
      });
    });
    return true;
  };

  const goToMonth = (target: CalendarMonth) => {
    const current = monthRef.current;
    runMonthChange(monthDelta(current, target), target);
  };

  const onSwipeMove = (dx: number) => {
    if (reduceMotionRef.current || animating.current) return;
    translateX.stopAnimation();
    opacity.stopAnimation();
    const clamped = Math.max(-MONTH_SLIDE, Math.min(MONTH_SLIDE, dx));
    translateX.setValue(clamped);
    const fade = Math.min(1, Math.abs(dx) / (MONTH_SLIDE * 2));
    opacity.setValue(1 - fade * 0.35);
  };

  const onSwipeEnd = (dx: number, velocityX: number) => {
    const delta = monthSwipeDelta(dx, velocityX);
    if (delta === 0) {
      snapBack();
      return;
    }
    haptics.selection();
    const current = monthRef.current;
    const started = runMonthChange(delta, shiftMonth(current.year, current.month, delta));
    if (!started) snapBack();
  };

  const swipeMoveRef = useRef(onSwipeMove);
  swipeMoveRef.current = onSwipeMove;
  const swipeEndRef = useRef(onSwipeEnd);
  swipeEndRef.current = onSwipeEnd;
  const snapBackRef = useRef(snapBack);
  snapBackRef.current = snapBack;

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-16, 16])
        .failOffsetY([-14, 14])
        .onUpdate((event) => {
          swipeMoveRef.current(event.translationX);
        })
        .onEnd((event) => {
          swipeEndRef.current(event.translationX, event.velocityX);
        })
        .onFinalize((_event, success) => {
          if (!success) snapBackRef.current();
        }),
    []
  );

  const weekStartsOn = localeWeekStartsOn();
  const weeks = useMemo(
    () => buildMonthGrid(month.year, month.month, weekStartsOn),
    [month.year, month.month, weekStartsOn]
  );
  const initials = useMemo(() => weekdayInitials(weekStartsOn), [weekStartsOn]);
  const counts = useMemo(() => countItemsByDueDay(items), [items]);
  const todayKey = dayKey(calendarDayFromDate(new Date()));
  const selectedKey = selected ? dayKey(selected) : null;
  const gridShift = useMemo(
    () => ({ transform: [{ translateX }], opacity }),
    [opacity, translateX]
  );

  // Today moves the visible month only. It does not select a day.
  const jumpToCurrentMonth = () => {
    const today = calendarDayFromDate(new Date());
    goToMonth({ year: today.year, month: today.month });
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text
          style={styles.month}
          numberOfLines={1}
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
        >
          {monthTitle(month.year, month.month)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          hitSlop={6}
          onPress={() => {
            haptics.selection();
            const current = monthRef.current;
            goToMonth(shiftMonth(current.year, current.month, -1));
          }}
          style={({ pressed }) => [styles.chevron, pressed && styles.pressed]}
        >
          <IconSymbol name="chevron.left" size={20} color={Theme.color.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          hitSlop={6}
          onPress={() => {
            haptics.selection();
            const current = monthRef.current;
            goToMonth(shiftMonth(current.year, current.month, 1));
          }}
          style={({ pressed }) => [styles.chevron, pressed && styles.pressed]}
        >
          <IconSymbol name="chevron.right" size={20} color={Theme.color.text} />
        </Pressable>
        <View style={styles.headerSpacer} />
        <View style={styles.headerActions}>
          {selected ? (
            <HeaderTextButton
              label="Clear"
              accessibilityLabel="Clear date"
              onPress={() => onSelectedChange(null)}
            />
          ) : null}
          <HeaderTextButton
            label="Today"
            accessibilityHint="Jumps to the current month"
            onPress={jumpToCurrentMonth}
          />
        </View>
      </View>

      <GestureDetector gesture={pan}>
        <View style={styles.gridClip}>
          <View
            style={styles.weekdayRow}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {initials.map((label, index) => (
              <Text key={`${label}-${index}`} style={styles.weekday}>
                {label}
              </Text>
            ))}
          </View>
          <Animated.View style={gridShift}>
            {weeks.map((week, weekIndex) => (
              <View key={`${month.year}-${month.month}-${weekIndex}`} style={styles.week}>
                {week.map((day, dayIndex) => {
                  if (!day) {
                    return <View key={`blank-${weekIndex}-${dayIndex}`} style={styles.cell} />;
                  }
                  const key = dayKey(day);
                  const isSelected = key === selectedKey;
                  const dot = dueDot(counts.get(key));
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="button"
                      accessibilityLabel={dayAccessibilityLabel(day, counts.get(key), isSelected)}
                      accessibilityState={{ selected: isSelected }}
                      onPress={() => {
                        if (animating.current) return;
                        haptics.selection();
                        onSelectedChange(toggleSelectedDay(selected, day));
                      }}
                      style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
                    >
                      <View
                        style={[
                          styles.dayFace,
                          key === todayKey && !isSelected && styles.todayRing,
                          isSelected && styles.selectedFace,
                        ]}
                      >
                        <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                          {day.day}
                        </Text>
                      </View>
                      <View style={styles.dotSlot}>
                        {dot ? (
                          <View
                            style={[styles.dot, dot === 'amber' ? styles.dotAmber : styles.dotGrey]}
                          />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...cardSurface,
    padding: Theme.space.md,
  },
  header: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  month: {
    flexShrink: 1,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: Theme.color.text,
  },
  chevron: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerAction: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  headerActionText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    color: Theme.color.accent,
  },
  gridClip: {
    overflow: 'hidden',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    color: Theme.color.textTertiary,
    paddingBottom: 2,
  },
  week: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    height: 40,
    alignItems: 'center',
  },
  dayFace: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayRing: {
    borderWidth: 1.5,
    borderColor: Theme.color.accent,
  },
  selectedFace: {
    backgroundColor: Theme.color.accent,
  },
  dayText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
    color: Theme.color.text,
  },
  dayTextSelected: {
    color: Theme.color.white,
    fontWeight: '600',
  },
  dotSlot: {
    height: 4,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dotAmber: {
    backgroundColor: Theme.color.accent,
  },
  dotGrey: {
    backgroundColor: DOT_GREY,
  },
  pressed: {
    opacity: 0.7,
  },
});
