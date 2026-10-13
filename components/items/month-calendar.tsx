import { IconSymbol } from '@/components/ui/icon-symbol';
import { cardSurface, Theme } from '@/constants/theme';
import {
  buildMonthGrid,
  countItemsByDueDay,
  dayAccessibilityLabel,
  dayKey,
  dayTint,
  isTodayCell,
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
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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

/** Accent `#B45309` at ~14% opacity. Days with an open item, including overdue. */
const DAY_TINT_AMBER = `${Theme.color.accent}24`;
const DAY_TINT_GREY = '#E5E7EB';
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
  // 'use no memo': the today ring has to be computed in this render from the
  // month shown in the header. React Compiler memoizes the day-cell JSX by
  // grid slot, so the ring stays on that cell after prev/next or swipe.
  'use no memo';

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
  const pendingEnter = useRef(false);

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
      // Commit the next month before the slide-in. Starting that native
      // animation in this callback keeps the previous grid's cells, so the
      // today ring stays on the same slot under the new month title.
      pendingEnter.current = true;
      onMonthChangeRef.current(target);
    });
    return true;
  };

  useLayoutEffect(() => {
    if (!pendingEnter.current) return;
    pendingEnter.current = false;
    const gen = generation.current;
    if (reduceMotionRef.current) {
      translateX.setValue(0);
      opacity.setValue(1);
      animating.current = false;
      return;
    }
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
  }, [month.year, month.month, opacity, translateX]);

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
  // Header and grid both read this prop in the same render. monthRef is only
  // for gestures, so a swipe cannot show a grid for a different month than the title.
  const year = month.year;
  const monthNumber = month.month;
  const weeks = useMemo(
    () => buildMonthGrid(year, monthNumber, weekStartsOn),
    [year, monthNumber, weekStartsOn]
  );
  const initials = useMemo(() => weekdayInitials(weekStartsOn), [weekStartsOn]);
  const counts = useMemo(() => countItemsByDueDay(items), [items]);
  const now = new Date();
  const selectedKey = selected ? dayKey(selected) : null;
  const gridShift = useMemo(
    () => ({ transform: [{ translateX }], opacity }),
    [opacity, translateX]
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.monthSlot}>
          <Text
            style={styles.month}
            numberOfLines={1}
            ellipsizeMode="tail"
            accessibilityRole="header"
            accessibilityLiveRegion="polite"
          >
            {monthTitle(year, monthNumber, now)}
          </Text>
        </View>
        <View style={styles.monthNav}>
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
            <View key={`${year}-${monthNumber}`} collapsable={false}>
              {weeks.map((week, weekIndex) => (
                <View key={`${year}-${monthNumber}-${weekIndex}`} style={styles.week}>
                  {week.map((day, dayIndex) => {
                    if (!day) {
                      return (
                        <View
                          key={`blank-${year}-${monthNumber}-${weekIndex}-${dayIndex}`}
                          style={styles.cell}
                        />
                      );
                    }
                    const key = dayKey(day);
                    const isSelected = key === selectedKey;
                    const isToday = isTodayCell(day, now);
                    const tint = dayTint(counts.get(key));
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
                            tint === 'amber' && styles.dayTintAmber,
                            tint === 'grey' && styles.dayTintGrey,
                            isToday && !isSelected && styles.todayRing,
                            isSelected && styles.selectedFace,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayText,
                              tint === 'amber' && !isSelected && styles.dayTextOpen,
                              isSelected && styles.dayTextSelected,
                            ]}
                          >
                            {day.day}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
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
  monthSlot: {
    flex: 1,
    minWidth: 72,
    marginRight: Theme.space.xs,
  },
  month: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: Theme.color.text,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  chevron: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
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
    justifyContent: 'center',
  },
  dayFace: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    // Always set the border and fill. Dropping them leaves the previous
    // today ring or tint on a reused cell after the month changes.
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  dayTintAmber: {
    backgroundColor: DAY_TINT_AMBER,
  },
  dayTintGrey: {
    backgroundColor: DAY_TINT_GREY,
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
  dayTextOpen: {
    color: Theme.color.accent,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: Theme.color.white,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
