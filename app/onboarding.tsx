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
import { SafeAreaView } from 'react-native-safe-area-context';

const PAGES = [
  {
    key: 'dump',
    title: 'Dump the mess',
    body: 'Type or speak everything you’re planning. No perfect list required.',
    Art: DumpArt,
  },
  {
    key: 'confirm',
    title: 'Confirm the list',
    body: 'We break it into action items. Edit any row, then confirm once.',
    Art: ConfirmArt,
  },
  {
    key: 'today',
    title: 'See what needs you today',
    body: 'Dated items show up when they matter. Undated ones stay in All items.',
    Art: TodayArt,
  },
] as const;

export default function OnboardingScreen() {
  const { markSeen } = useOnboarding();
  const scrollRef = useRef<ScrollView>(null);
  const pageRef = useRef(0);
  const [page, setPage] = useState(0);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    if (viewport.width <= 0) return;
    scrollRef.current?.scrollTo({ x: pageRef.current * viewport.width, animated: false });
  }, [viewport.width]);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (viewport.width <= 0) return;
    const next = Math.round(event.nativeEvent.contentOffset.x / viewport.width);
    const clamped = Math.min(Math.max(next, 0), PAGES.length - 1);
    setPage((current) => (current === clamped ? current : clamped));
  };

  const onContinue = () => {
    if (page < PAGES.length - 1) {
      const next = page + 1;
      scrollRef.current?.scrollTo({ x: next * viewport.width, animated: true });
      setPage(next);
      return;
    }
    markSeen();
  };

  const isLastPage = page === PAGES.length - 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <View
        style={styles.pager}
        onLayout={(event) => {
          const nextWidth = Math.round(event.nativeEvent.layout.width);
          const nextHeight = Math.round(event.nativeEvent.layout.height);
          setViewport((current) =>
            current.width === nextWidth && current.height === nextHeight
              ? current
              : { width: nextWidth, height: nextHeight }
          );
        }}
      >
        {viewport.width > 0 ? (
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
            {PAGES.map((item, index) => {
              const Art = item.Art;
              const visible = index === page;
              return (
                <View
                  key={item.key}
                  style={[styles.page, { width: viewport.width, height: viewport.height }]}
                  accessibilityElementsHidden={!visible}
                  importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
                >
                  <Art />
                  <Text style={styles.title} accessibilityRole="header">
                    {item.title}
                  </Text>
                  <Text style={styles.body}>{item.body}</Text>
                </View>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityLabel={`Page ${page + 1} of ${PAGES.length}`}>
          {PAGES.map((item, index) => (
            <View key={item.key} style={[styles.dot, index === page && styles.dotActive]} />
          ))}
        </View>
        <PrimaryButton label={isLastPage ? 'Get started' : 'Continue'} onPress={onContinue} />
        <TextButton label="Skip" tone="secondary" onPress={markSeen} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Theme.color.background,
  },
  pager: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  page: {
    paddingHorizontal: Theme.space.screenX,
    paddingBottom: Theme.space.lg,
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
    paddingTop: Theme.space.sm,
    paddingBottom: Theme.space.sm,
    gap: Theme.space.sm,
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
