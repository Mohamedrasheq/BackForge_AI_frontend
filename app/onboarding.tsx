import { ConfirmArt, DumpArt, TodayArt } from '@/components/onboarding/page-art';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextButton } from '@/components/ui/text-button';
import { Theme } from '@/constants/theme';
import { useOnboarding } from '@/lib/onboarding';
import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

/** Signed-off stage corner. Theme.radius.xl is 20, so this stays a local 24. */
const STAGE_RADIUS = 24;
const ENTER_SPRING = { duration: 320, dampingRatio: 0.92, overshootClamping: true } as const;

const PAGES = [
  {
    key: 'dump',
    title: 'Dump the mess',
    body: 'Type or speak everything you’re planning. No perfect list required.',
  },
  {
    key: 'confirm',
    title: 'Confirm the list',
    body: 'We break it into action items. Edit any row, then confirm once.',
  },
  {
    key: 'today',
    title: 'See what needs you today',
    body: 'Dated items show up when they matter. Undated ones stay in All items.',
  },
] as const;

function OnboardingPage({
  index,
  title,
  body,
  active,
  pageKey,
  width,
  pageHeight,
  stageHeight,
  scrollX,
  widthSv,
  micPulse,
}: {
  index: number;
  title: string;
  body: string;
  active: boolean;
  pageKey: (typeof PAGES)[number]['key'];
  width: number;
  pageHeight: number;
  stageHeight: number;
  scrollX: SharedValue<number>;
  widthSv: SharedValue<number>;
  micPulse: boolean;
}) {
  const stageArrive = useSharedValue(0);
  const copyArrive = useSharedValue(0);
  const entered = useRef(false);

  useEffect(() => {
    if (!active || entered.current) return;
    entered.current = true;
    stageArrive.value = withSpring(1, ENTER_SPRING);
    copyArrive.value = withDelay(80, withSpring(1, ENTER_SPRING));
  }, [active, copyArrive, stageArrive]);

  const stageStyle = useAnimatedStyle(() => {
    const w = widthSv.value;
    const dist = w > 0 ? Math.abs(scrollX.value / w - index) : 0;
    const vis = interpolate(dist, [0, 1], [1, 0], Extrapolation.CLAMP);
    const fade = index === 0 ? stageArrive.value : 1;
    const travel = interpolate(dist, [0, 1], [0, 14], Extrapolation.CLAMP);
    return {
      opacity: vis * fade,
      transform: [{ translateY: travel + (1 - stageArrive.value) * 14 }],
    };
  });

  const copyStyle = useAnimatedStyle(() => {
    const w = widthSv.value;
    const dist = w > 0 ? Math.abs(scrollX.value / w - index) : 0;
    const vis = interpolate(dist, [0, 0.7], [1, 0], Extrapolation.CLAMP);
    const fade = index === 0 ? copyArrive.value : 1;
    const travel = interpolate(dist, [0, 0.7], [0, 8], Extrapolation.CLAMP);
    return {
      opacity: vis * fade,
      transform: [{ translateY: travel + (1 - copyArrive.value) * 8 }],
    };
  });

  return (
    <View
      style={[styles.page, { width, height: pageHeight }]}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    >
      <Animated.View style={[styles.stage, { height: stageHeight }, stageStyle]}>
        <View style={styles.stageClip}>
          {pageKey === 'dump' ? <DumpArt pulseMic={micPulse} /> : null}
          {pageKey === 'confirm' ? <ConfirmArt active={active} /> : null}
          {pageKey === 'today' ? <TodayArt active={active} /> : null}
        </View>
      </Animated.View>
      <Animated.View style={[styles.copy, copyStyle]}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.body}>{body}</Text>
      </Animated.View>
    </View>
  );
}

export default function OnboardingScreen() {
  const { markSeen } = useOnboarding();
  const scrollRef = useRef<ScrollView>(null);
  const pageRef = useRef(0);
  const [page, setPage] = useState(0);
  const [frameHeight, setFrameHeight] = useState(0);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [micPulse, setMicPulse] = useState(true);
  const scrollX = useSharedValue(0);
  const widthSv = useSharedValue(0);
  const ctaIntro = useSharedValue(0);
  const firstCta = useRef(true);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    const delay = firstCta.current ? 190 : 110;
    firstCta.current = false;
    ctaIntro.value = 0;
    ctaIntro.value = withDelay(delay, withTiming(1, { duration: 220 }));
  }, [ctaIntro, page]);

  useEffect(() => {
    if (viewport.width <= 0) return;
    scrollRef.current?.scrollTo({ x: pageRef.current * viewport.width, animated: false });
  }, [viewport.width]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    scrollX.value = x;
    if (viewport.width <= 0) return;
    const next = Math.round(x / viewport.width);
    const clamped = Math.min(Math.max(next, 0), PAGES.length - 1);
    setPage((current) => (current === clamped ? current : clamped));
  };

  const onContinue = () => {
    if (page < PAGES.length - 1) {
      setMicPulse(false);
      const next = page + 1;
      scrollRef.current?.scrollTo({ x: next * viewport.width, animated: true });
      return;
    }
    markSeen();
  };

  const stageHeight =
    frameHeight > 0 && viewport.height > 0
      ? Math.min(Math.round(frameHeight * 0.55), Math.max(168, viewport.height - 156))
      : 0;

  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaIntro.value,
  }));

  const isLastPage = page === PAGES.length - 1;

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['top', 'bottom', 'left', 'right']}
      onLayout={(event) => {
        const nextHeight = Math.round(event.nativeEvent.layout.height);
        setFrameHeight((current) => (current === nextHeight ? current : nextHeight));
      }}
    >
      <View style={styles.topBar}>
        <TextButton label="Skip" tone="secondary" onPress={markSeen} style={styles.skip} />
      </View>

      <View
        style={styles.pager}
        onLayout={(event) => {
          const nextWidth = Math.round(event.nativeEvent.layout.width);
          const nextHeight = Math.round(event.nativeEvent.layout.height);
          widthSv.value = nextWidth;
          setViewport((current) =>
            current.width === nextWidth && current.height === nextHeight
              ? current
              : { width: nextWidth, height: nextHeight },
          );
        }}
      >
        {viewport.width > 0 && stageHeight > 0 ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            bounces={false}
            overScrollMode="never"
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            snapToInterval={Platform.OS === 'web' ? viewport.width : undefined}
            snapToAlignment="start"
            disableIntervalMomentum={Platform.OS === 'web'}
            scrollEventThrottle={16}
            onScroll={onScroll}
            style={styles.scroll}
          >
            {PAGES.map((item, index) => (
              <OnboardingPage
                key={item.key}
                index={index}
                title={item.title}
                body={item.body}
                active={index === page}
                pageKey={item.key}
                width={viewport.width}
                pageHeight={viewport.height}
                stageHeight={stageHeight}
                scrollX={scrollX}
                widthSv={widthSv}
                micPulse={micPulse}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityLabel={`Page ${page + 1} of ${PAGES.length}`}>
          {PAGES.map((item, index) => (
            <View key={item.key} style={[styles.dot, index === page && styles.dotActive]} />
          ))}
        </View>
        <Animated.View style={ctaStyle}>
          <PrimaryButton label={isLastPage ? 'Get started' : 'Continue'} onPress={onContinue} />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Theme.color.background,
  },
  topBar: {
    minHeight: 36,
    paddingHorizontal: Theme.space.sm,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  skip: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
  },
  pager: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  page: {
    paddingBottom: Theme.space.sm,
  },
  stage: {
    marginHorizontal: Theme.space.screenX,
    borderRadius: STAGE_RADIUS,
    backgroundColor: Theme.color.card,
    borderWidth: 1,
    borderColor: Theme.color.border,
    ...Theme.shadow.card,
  },
  stageClip: {
    flex: 1,
    borderRadius: STAGE_RADIUS - 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    paddingHorizontal: Theme.space.screenX,
    paddingTop: Theme.space.lg,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: Theme.type.screenTitle,
    fontWeight: '700',
    color: Theme.color.text,
    textAlign: 'center',
    letterSpacing: Platform.OS === 'web' ? 0 : -0.5,
  },
  body: {
    marginTop: Theme.space.sm,
    fontSize: Theme.type.body,
    lineHeight: 24,
    color: Theme.color.textSecondary,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Theme.space.screenX,
    paddingTop: Theme.space.xs,
    paddingBottom: Theme.space.sm,
    gap: Theme.space.md,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 24,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.color.border,
  },
  dotActive: {
    width: 20,
    backgroundColor: Theme.color.accent,
  },
});
