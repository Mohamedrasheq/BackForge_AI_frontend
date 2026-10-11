import { IconSymbol } from '@/components/ui/icon-symbol';
import { TextButton } from '@/components/ui/text-button';
import { Theme } from '@/constants/theme';
import {
  buildMonthGrid,
  calendarDayFromDate,
  countItemsByDueDay,
  dayAccessibilityLabel,
  dayKey,
  dueDot,
  localeWeekStartsOn,
  monthTitle,
  shiftMonth,
  weekdayInitials,
  type CalendarDay,
} from '@/lib/date-filter';
import { haptics } from '@/lib/haptics';
import type { Item } from '@/types/api';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DOT_GREY = '#9CA3AF';
const SWIPE_DISTANCE = 40;
const MONTH_SLIDE = 36;

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

  return live ?? reducedAtLaunch;
}

export function DateFilterSheet({
  visible,
  items,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  items: readonly Item[];
  selected: CalendarDay | null;
  onSelect: (day: CalendarDay) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotionEnabled();
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [cursor, setCursor] = useState(() => {
    const anchor = selected ?? calendarDayFromDate(new Date());
    return { year: anchor.year, month: anchor.month };
  });
  const [shown, setShown] = useState(visible);
  if (visible !== shown) {
    setShown(visible);
    if (visible) {
      const anchor = selected ?? calendarDayFromDate(new Date());
      setCursor((current) =>
        current.year === anchor.year && current.month === anchor.month
          ? current
          : { year: anchor.year, month: anchor.month }
      );
    }
  }

  const translateX = useRef(new Animated.Value(0)).current;
  const animating = useRef(false);
  const generation = useRef(0);

  useEffect(() => {
    generation.current += 1;
    animating.current = false;
    translateX.stopAnimation();
    translateX.setValue(0);
  }, [visible, translateX]);

  const changeMonth = (delta: number) => {
    if (animating.current) return;
    haptics.selection();
    if (reduceMotionRef.current) {
      translateX.setValue(0);
      setCursor((current) => shiftMonth(current.year, current.month, delta));
      return;
    }

    const gen = generation.current;
    animating.current = true;
    const out = delta > 0 ? -MONTH_SLIDE : MONTH_SLIDE;
    Animated.timing(translateX, {
      toValue: out,
      duration: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || gen !== generation.current) {
        animating.current = false;
        return;
      }
      translateX.setValue(-out);
      setCursor((current) => shiftMonth(current.year, current.month, delta));
      Animated.timing(translateX, {
        toValue: 0,
        duration: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        if (gen === generation.current) animating.current = false;
      });
    });
  };

  const changeMonthRef = useRef(changeMonth);
  changeMonthRef.current = changeMonth;

  const snapBack = () => {
    if (reduceMotionRef.current) {
      translateX.setValue(0);
      return;
    }
    Animated.timing(translateX, {
      toValue: 0,
      duration: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };
  const snapBackRef = useRef(snapBack);
  snapBackRef.current = snapBack;

  const gridPan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) => {
          if (animating.current) return false;
          const horizontal = Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
          const vertical = gesture.dy > 16 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
          return horizontal || vertical;
        },
        onPanResponderMove: (_, gesture) => {
          if (reduceMotionRef.current || animating.current) return;
          if (Math.abs(gesture.dy) > Math.abs(gesture.dx)) return;
          const dx = Math.max(-MONTH_SLIDE, Math.min(MONTH_SLIDE, gesture.dx));
          translateX.setValue(dx);
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 48 && gesture.dy > Math.abs(gesture.dx)) {
            snapBackRef.current();
            onCloseRef.current();
            return;
          }
          const next = gesture.dx <= -SWIPE_DISTANCE || gesture.vx <= -0.5;
          const prev = gesture.dx >= SWIPE_DISTANCE || gesture.vx >= 0.5;
          if (next && !prev) {
            changeMonthRef.current(1);
            return;
          }
          if (prev && !next) {
            changeMonthRef.current(-1);
            return;
          }
          if (next && prev) {
            changeMonthRef.current(gesture.dx <= 0 ? 1 : -1);
            return;
          }
          snapBackRef.current();
        },
        onPanResponderTerminate: () => snapBackRef.current(),
      }),
    [translateX]
  );

  const dismissPan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gesture) =>
          gesture.dy > 16 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 48 || gesture.vy > 0.75) onCloseRef.current();
        },
      }),
    []
  );

  const weekStartsOn = localeWeekStartsOn();
  const weeks = useMemo(
    () => buildMonthGrid(cursor.year, cursor.month, weekStartsOn),
    [cursor.year, cursor.month, weekStartsOn]
  );
  const initials = weekdayInitials(weekStartsOn);
  const gridShift = useMemo(() => ({ transform: [{ translateX }] }), [translateX]);
  const counts = useMemo(() => countItemsByDueDay(items), [items]);
  const todayKey = dayKey(calendarDayFromDate(new Date()));
  const selectedKey = selected ? dayKey(selected) : null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType={reduceMotion ? 'fade' : 'slide'}
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss date filter"
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, Theme.space.md) }]}>
          <View {...dismissPan.panHandlers}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text
                style={styles.month}
                numberOfLines={1}
                accessibilityRole="header"
                accessibilityLiveRegion="polite"
              >
                {monthTitle(cursor.year, cursor.month)}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                onPress={() => changeMonth(-1)}
                hitSlop={4}
                style={({ pressed }) => [styles.chevron, pressed && styles.pressed]}
              >
                <IconSymbol name="chevron.left" size={22} color={Theme.color.text} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next month"
                onPress={() => changeMonth(1)}
                hitSlop={4}
                style={({ pressed }) => [styles.chevron, pressed && styles.pressed]}
              >
                <IconSymbol name="chevron.right" size={22} color={Theme.color.text} />
              </Pressable>
              <View style={styles.headerSpacer} />
              <TextButton
                label="Today"
                onPress={() => onSelect(calendarDayFromDate(new Date()))}
                style={styles.today}
              />
            </View>
          </View>

          <View style={styles.gridClip} {...gridPan.panHandlers}>
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
                <View key={weekIndex} style={styles.week}>
                  {week.map((day, dayIndex) => {
                    if (!day) return <View key={`blank-${weekIndex}-${dayIndex}`} style={styles.cell} />;
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
                          haptics.selection();
                          onSelect(day);
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
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Theme.color.overlay,
  },
  sheet: {
    zIndex: 1,
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    backgroundColor: Theme.color.card,
    borderTopLeftRadius: Theme.radius.xl,
    borderTopRightRadius: Theme.radius.xl,
    paddingTop: Theme.space.sm,
    paddingHorizontal: Theme.space.md,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.color.border,
    marginBottom: Theme.space.sm,
  },
  header: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: Theme.space.xs,
  },
  month: {
    flexShrink: 1,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: Theme.color.text,
  },
  chevron: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 8,
  },
  today: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
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
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    color: Theme.color.textTertiary,
    paddingVertical: 4,
  },
  week: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    height: 48,
    alignItems: 'center',
  },
  dayFace: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontSize: 15,
    lineHeight: 20,
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
