import { FeatureGuideModal } from '@/components/ui/feature-guide-modal';
import { Header } from '@/components/ui/header';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { subscribeToMemoryChanges } from '@/lib/supabase';
import { closeMemory, getAllMemories, getDailyBrief } from '@/services/api';
import type { DailyBriefItem } from '@/types/api';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    FadeInDown,
    FadeInRight,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { useUser } from '@clerk/clerk-expo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type HomeStatus = {
    statusMessage: string;
    topItems: DailyBriefItem[];
    hasPendingItems: boolean;
    pendingCount: number;
    confidenceMessage: string;
};

const INITIAL_STATUS: HomeStatus = {
    statusMessage: "Checking your day...",
    topItems: [],
    hasPendingItems: false,
    pendingCount: 0,
    confidenceMessage: "Syncing with BackForge AI...",
};

type DailyProgress = {
    total: number;
    completed: number;
    percentage: number;
};

// Quick action data
const QUICK_ACTIONS = [
    { id: 'brief', label: 'Daily Brief', icon: 'list.bullet.clipboard.fill', route: '/brief' },
    { id: 'memory', label: 'Memory', icon: 'brain.head.profile', route: '/memory' },
    { id: 'chat', label: 'Chat', icon: 'bubble.left.and.bubble.right.fill', route: '/chat' },
] as const;

// Tips data with gradient colors
const TIPS_DATA = [
    {
        id: 'capture',
        emoji: '💬',
        title: 'Capture',
        description: 'Voice or text, I understand',
        gradientColors: ['#4F46E5', '#6366F1'] as const,
    },
    {
        id: 'brief',
        emoji: '📋',
        title: 'Brief',
        description: 'Prioritized daily view',
        gradientColors: ['#7C3AED', '#A78BFA'] as const,
    },
    {
        id: 'memory',
        emoji: '🧠',
        title: 'Memory',
        description: 'Nothing gets forgotten',
        gradientColors: ['#2563EB', '#60A5FA'] as const,
    },
    {
        id: 'smart',
        emoji: '✨',
        title: 'Smart',
        description: 'Context-aware reminders',
        gradientColors: ['#0D9488', '#5EEAD4'] as const,
    },
];


// Get time-based greeting
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
};

// Animated wave component
const AnimatedWave = () => {
    const rotation = useSharedValue(0);

    useEffect(() => {
        rotation.value = withRepeat(
            withSequence(
                withTiming(20, { duration: 150, easing: Easing.ease }),
                withTiming(-20, { duration: 150, easing: Easing.ease }),
                withTiming(20, { duration: 150, easing: Easing.ease }),
                withTiming(0, { duration: 150, easing: Easing.ease })
            ),
            -1,
            false
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    return (
        <Animated.Text style={[styles.waveEmoji, animatedStyle]}>
            👋
        </Animated.Text>
    );
};

export default function HomeScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const { user } = useUser();
    const [status, setStatus] = useState<HomeStatus>(INITIAL_STATUS);
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState<DailyProgress>({ total: 0, completed: 0, percentage: 0 });
    const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
    const [isNewUser, setIsNewUser] = useState(false);

    const fetchHomeData = useCallback(async () => {
        if (!user) return;
        try {
            const [briefResponse, memoriesResponse] = await Promise.all([
                getDailyBrief(user.id),
                getAllMemories(user.id),
            ]);
            const items = briefResponse.items;
            const pendingCount = items.length;
            const hasPendingItems = pendingCount > 0;
            const topItems = items.slice(0, 2);

            // Calculate today's progress from all memories
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            // Track if the user has zero memories ever
            setIsNewUser(memoriesResponse.items.length === 0);

            const todayMemories = memoriesResponse.items.filter(m => {
                const createdDate = new Date(m.created_at);
                createdDate.setHours(0, 0, 0, 0);
                return createdDate.getTime() === today.getTime();
            });
            const totalToday = todayMemories.length;
            const completedToday = todayMemories.filter(m => m.status === 'closed').length;
            setProgress({
                total: totalToday,
                completed: completedToday,
                percentage: totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0,
            });

            let statusMessage = "You're all caught up!";
            let confidence = "Nothing is slipping.";

            if (pendingCount === 0) {
                statusMessage = "All clear for now";
                confidence = "Items are prioritized.";
            } else if (pendingCount === 1) {
                statusMessage = "1 item needs attention";
                confidence = "Items are prioritized.";
            } else {
                statusMessage = `${pendingCount} items to review`;
                confidence = "Items are prioritized.";
            }

            setStatus({
                statusMessage,
                topItems,
                hasPendingItems,
                pendingCount,
                confidenceMessage: confidence,
            });
        } catch (error) {
            console.error('Failed to fetch home data:', error);
            setStatus(prev => ({ ...prev, statusMessage: "Offline mode", confidenceMessage: "Could not sync." }));
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchHomeData();
    }, [fetchHomeData]);

    // Supabase Realtime subscription
    useEffect(() => {
        if (!user) return;

        const unsubscribe = subscribeToMemoryChanges(user.id, () => {
            console.log('[Home] Realtime update received');
            fetchHomeData();
        });

        return () => unsubscribe();
    }, [user, fetchHomeData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchHomeData();
    }, [fetchHomeData]);

    const handleMarkDone = async (item: DailyBriefItem) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (item.id === 'welcome-tutorial') {
            router.push('/chat');
            return;
        }

        try {
            await closeMemory({ memoryItemId: item.id });
            fetchHomeData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleQuickAction = async (route: string) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(route as any);
    };

    const handleChat = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/chat');
    };

    const handleViewBrief = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/brief');
    };

    const handleTipPress = async (tipId: string) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedFeature(tipId);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

            <Header />

            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    { paddingBottom: insets.bottom + Spacing.md },
                ]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* 1. Personalized Greeting Section */}
                <Animated.View entering={FadeIn.duration(600)} style={styles.greetingSection}>
                    <View style={styles.greetingRow}>
                        <AnimatedWave />
                        <View style={styles.greetingTextContainer}>
                            <Text style={[styles.greetingText, { color: colors.text }]}>
                                {getGreeting()}{user?.firstName ? `, ${user.firstName}` : ''}
                            </Text>
                            <Text style={[styles.greetingSubtext, { color: colors.textSecondary }]}>
                                {status.statusMessage}
                            </Text>
                        </View>
                    </View>
                </Animated.View>

                {/* 2. Status Card with Gradient */}
                <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.statusCardWrapper}>
                    <LinearGradient
                        colors={['#4F46E5', '#7C3AED']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.statusCard}
                    >
                        <View style={styles.statusCardContent}>
                            <View style={styles.statusIconContainer}>
                                <IconSymbol name="sparkles" size={28} color="#FFFFFF" />
                            </View>
                            <View style={styles.statusTextContainer}>
                                <Text style={styles.statusCardTitle}>BackForge AI is watching</Text>
                                <Text style={styles.statusCardSubtitle}>I'm keeping track of everything for you</Text>
                            </View>
                            <View style={styles.statusBadge}>
                                <IconSymbol name="checkmark.circle.fill" size={20} color="#10B981" />
                            </View>
                        </View>

                        {/* Pending count indicator */}
                        {status.pendingCount > 0 && (
                            <Pressable
                                onPress={handleViewBrief}
                                style={({ pressed }) => [
                                    styles.pendingIndicator,
                                    { opacity: pressed ? 0.8 : 1 }
                                ]}
                            >
                                <View style={styles.pendingDot} />
                                <Text style={styles.pendingText}>
                                    {status.pendingCount} item{status.pendingCount > 1 ? 's' : ''} pending
                                </Text>
                                <IconSymbol name="chevron.right" size={14} color="rgba(255,255,255,0.8)" />
                            </Pressable>
                        )}
                    </LinearGradient>
                </Animated.View>

                {/* 2.5. Daily Progress Card */}
                <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.progressCardWrapper}>
                    <LinearGradient
                        colors={['#0F2027', '#134E4A']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.progressCard}
                    >
                        <View style={styles.progressCardContent}>
                            {/* Left: Ring */}
                            <View style={styles.progressRingContainer}>
                                <Svg width={72} height={72} viewBox="0 0 72 72">
                                    <Circle
                                        cx={36}
                                        cy={36}
                                        r={30}
                                        stroke="rgba(255,255,255,0.15)"
                                        strokeWidth={6}
                                        fill="none"
                                    />
                                    <Circle
                                        cx={36}
                                        cy={36}
                                        r={30}
                                        stroke={progress.percentage === 100 ? '#34D399' : '#2DD4BF'}
                                        strokeWidth={6}
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeDasharray={`${2 * Math.PI * 30}`}
                                        strokeDashoffset={`${2 * Math.PI * 30 * (1 - (progress.total > 0 ? progress.percentage / 100 : 0))}`}
                                        transform="rotate(-90 36 36)"
                                    />
                                </Svg>
                                <View style={styles.progressRingCenter}>
                                    <Text style={styles.progressRingPercent}>
                                        {progress.total > 0 ? progress.percentage : 0}
                                    </Text>
                                    <Text style={styles.progressRingUnit}>%</Text>
                                </View>
                            </View>

                            {/* Right: Details */}
                            <View style={styles.progressDetails}>
                                <Text style={styles.progressCardTitle}>Today's Progress</Text>
                                <Text style={styles.progressCardSub}>
                                    {progress.total === 0
                                        ? 'No tasks captured yet'
                                        : progress.percentage === 100
                                            ? '🎉 All done for today!'
                                            : `${progress.completed} of ${progress.total} items completed`}
                                </Text>
                                {/* Mini bar */}
                                <View style={styles.progressMiniBarBg}>
                                    <View
                                        style={[
                                            styles.progressMiniBarFill,
                                            {
                                                width: `${progress.total > 0 ? progress.percentage : 0}%`,
                                                backgroundColor: progress.percentage === 100 ? '#34D399' : '#2DD4BF',
                                            },
                                        ]}
                                    />
                                </View>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* 3. Quick Actions Row */}
                <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.quickActionsSection}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>QUICK ACTIONS</Text>
                    <View style={styles.quickActionsRow}>
                        {QUICK_ACTIONS.map((action, index) => (
                            <Animated.View
                                key={action.id}
                                entering={FadeInRight.delay(300 + index * 80).duration(400)}
                                style={styles.quickActionWrapper}
                            >
                                <Pressable
                                    onPress={() => handleQuickAction(action.route)}
                                    style={({ pressed }) => [
                                        styles.quickActionButton,
                                        {
                                            backgroundColor: colors.backgroundSecondary,
                                            borderColor: colors.border,
                                            transform: [{ scale: pressed ? 0.95 : 1 }],
                                        },
                                    ]}
                                >
                                    <View style={[styles.quickActionIcon, { backgroundColor: colors.tint + '15' }]}>
                                        <IconSymbol name={action.icon as any} size={22} color={colors.tint} />
                                    </View>
                                    <Text style={[styles.quickActionLabel, { color: colors.text }]} numberOfLines={1}>
                                        {action.label}
                                    </Text>
                                </Pressable>
                            </Animated.View>
                        ))}
                    </View>
                </Animated.View>

                {/* 4. Priority Items Cards */}
                <Animated.View entering={FadeInDown.delay(350).duration(500)} style={styles.prioritySection}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PRIORITY TODAY</Text>
                        {status.pendingCount > status.topItems.length && (
                            <Pressable onPress={handleViewBrief}>
                                <Text style={[styles.seeAllText, { color: colors.tint }]}>
                                    See all ({status.pendingCount})
                                </Text>
                            </Pressable>
                        )}
                    </View>

                    {status.topItems.length > 0 ? (
                        status.topItems.map((item, index) => (
                            <Animated.View
                                key={item.id}
                                entering={FadeInDown.delay(400 + (index * 80)).duration(400)}
                            >
                                <Pressable
                                    onPress={() => handleMarkDone(item)}
                                    style={({ pressed }) => [
                                        styles.priorityCard,
                                        {
                                            backgroundColor: colors.backgroundSecondary,
                                            borderColor: colors.border,
                                            transform: [{ scale: pressed ? 0.98 : 1 }],
                                        },
                                    ]}
                                >
                                    <View style={[styles.priorityAccent, { backgroundColor: colors.tint }]} />
                                    <View style={styles.priorityContent}>
                                        <View style={styles.priorityHeader}>
                                            <View style={[styles.priorityBadge, { backgroundColor: colors.tint + '15' }]}>
                                                <IconSymbol name="bolt.fill" size={12} color={colors.tint} />
                                                <Text style={[styles.priorityBadgeText, { color: colors.tint }]}>Priority</Text>
                                            </View>
                                            <Text style={[styles.priorityType, { color: colors.textSecondary }]}>
                                                {item.type === 'follow_up' ? 'Follow-up' : item.type || 'Task'}
                                            </Text>
                                        </View>
                                        <Text style={[styles.priorityTitle, { color: colors.text }]} numberOfLines={2}>
                                            {item.title}
                                        </Text>
                                    </View>
                                    <View style={[styles.priorityAction, { backgroundColor: colors.tint }]}>
                                        <IconSymbol name="checkmark" size={16} color="#FFFFFF" />
                                    </View>
                                </Pressable>
                            </Animated.View>
                        ))
                    ) : (
                        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.emptyStateContainer}>
                            {/* Floating accent bubbles */}
                            <View style={styles.emptyStateIllustration}>
                                <Animated.Text
                                    entering={FadeIn.delay(600).duration(600)}
                                    style={[styles.floatingEmoji, styles.floatingEmoji1]}
                                >
                                    {isNewUser ? '💬' : '⭐'}
                                </Animated.Text>
                                <Animated.Text
                                    entering={FadeIn.delay(750).duration(600)}
                                    style={[styles.floatingEmoji, styles.floatingEmoji2]}
                                >
                                    {isNewUser ? '✨' : '💪'}
                                </Animated.Text>
                                <Animated.Text
                                    entering={FadeIn.delay(900).duration(600)}
                                    style={[styles.floatingEmoji, styles.floatingEmoji3]}
                                >
                                    {isNewUser ? '🎯' : '🏆'}
                                </Animated.Text>

                                {/* Central icon */}
                                <Animated.View
                                    entering={FadeIn.delay(500).duration(500)}
                                    style={[styles.emptyStateCenterIcon, { backgroundColor: isNewUser ? colors.tint + '12' : '#10B98118' }]}
                                >
                                    <Text style={styles.emptyStateCenterEmoji}>
                                        {isNewUser ? '🚀' : '🎉'}
                                    </Text>
                                </Animated.View>
                            </View>

                            {/* Text */}
                            <Animated.Text
                                entering={FadeInDown.delay(650).duration(400)}
                                style={[styles.emptyStateHeadline, { color: colors.text }]}
                            >
                                {isNewUser ? 'Welcome to BackForge AI!' : 'You crushed it!'}
                            </Animated.Text>
                            <Animated.Text
                                entering={FadeInDown.delay(750).duration(400)}
                                style={[styles.emptyStateBody, { color: colors.textSecondary }]}
                            >
                                {isNewUser
                                    ? 'Capture your first thought in chat — I\'ll handle the rest.'
                                    : 'All tasks completed. Enjoy the rest of your day.'}
                            </Animated.Text>

                            {/* CTA for new users */}
                            {isNewUser && (
                                <Animated.View entering={FadeInDown.delay(850).duration(400)}>
                                    <Pressable
                                        onPress={handleChat}
                                        style={({ pressed }) => [
                                            styles.emptyStatePill,
                                            {
                                                backgroundColor: colors.tint,
                                                transform: [{ scale: pressed ? 0.95 : 1 }],
                                            },
                                        ]}
                                    >
                                        <IconSymbol name="bubble.left.fill" size={15} color="#FFFFFF" />
                                        <Text style={styles.emptyStatePillText}>Start a chat</Text>
                                        <IconSymbol name="arrow.right" size={14} color="rgba(255,255,255,0.7)" />
                                    </Pressable>
                                </Animated.View>
                            )}
                        </Animated.View>
                    )}
                </Animated.View>

                {/* 5. Chat Input */}
                <Animated.View entering={FadeInDown.delay(450).duration(500)} style={styles.chatSection}>
                    <Pressable
                        onPress={handleChat}
                        style={({ pressed }) => [
                            styles.chatInputLike,
                            Shadows.glass,
                            {
                                backgroundColor: colors.glass,
                                borderColor: colors.glassBorder,
                                transform: [{ scale: pressed ? 0.98 : 1 }]
                            }
                        ]}
                    >
                        <View style={styles.chatInputContent}>
                            <IconSymbol name="mic.fill" size={20} color={colors.textSecondary} />
                            <Text style={[styles.chatPlaceholder, { color: colors.textSecondary }]}>
                                What's on your mind?
                            </Text>
                        </View>
                        <View style={[styles.chatSendButton, { backgroundColor: colors.tint }]}>
                            <IconSymbol name="arrow.up" size={18} color="#FFFFFF" />
                        </View>
                    </Pressable>
                </Animated.View>

                {/* 6. Horizontal Tips Carousel */}
                <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.tipsSection}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>HOW BACKFORGE AI HELPS</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tipsScrollContent}
                        snapToInterval={140}
                        decelerationRate="fast"
                    >
                        {TIPS_DATA.map((tip, index) => (
                            <Animated.View
                                key={tip.id}
                                entering={FadeInRight.delay(550 + index * 60).duration(400)}
                            >
                                <Pressable onPress={() => handleTipPress(tip.id)}>
                                    <LinearGradient
                                        colors={tip.gradientColors}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.tipCard}
                                    >
                                        <Text style={styles.tipEmoji}>{tip.emoji}</Text>
                                        <Text style={styles.tipTitle}>{tip.title}</Text>
                                        <Text style={styles.tipDescription}>{tip.description}</Text>
                                    </LinearGradient>
                                </Pressable>
                            </Animated.View>
                        ))}
                    </ScrollView>
                </Animated.View>
            </ScrollView>

            {/* Feature Guide Modal */}
            <FeatureGuideModal
                visible={selectedFeature !== null}
                featureId={selectedFeature}
                onClose={() => setSelectedFeature(null)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: Spacing.md,
    },
    // Greeting Section
    greetingSection: {
        marginTop: Spacing.xs,
        marginBottom: Spacing.md,
    },
    greetingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    waveEmoji: {
        fontSize: 32,
        marginRight: Spacing.sm,
    },
    greetingTextContainer: {
        flex: 1,
    },
    greetingText: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    greetingSubtext: {
        fontSize: 14,
        marginTop: 2,
    },
    // Status Card
    statusCardWrapper: {
        marginBottom: Spacing.md,
    },
    statusCard: {
        borderRadius: 20,
        padding: Spacing.md,
        overflow: 'hidden',
    },
    statusCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusTextContainer: {
        flex: 1,
        marginLeft: Spacing.sm,
    },
    statusCardTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    statusCardSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 2,
    },
    statusBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Progress Card
    progressCardWrapper: {
        marginBottom: Spacing.md,
    },
    progressCard: {
        borderRadius: 20,
        padding: Spacing.md,
        overflow: 'hidden',
    },
    progressCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressRingContainer: {
        width: 72,
        height: 72,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressRingCenter: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    progressRingPercent: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    progressRingUnit: {
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
        marginLeft: 1,
    },
    progressDetails: {
        flex: 1,
        marginLeft: Spacing.md,
    },
    progressCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    progressCardSub: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 10,
    },
    progressMiniBarBg: {
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.15)',
        overflow: 'hidden',
    },
    progressMiniBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    pendingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.sm,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
    },
    pendingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FCD34D',
        marginRight: 8,
    },
    pendingText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
    },
    // Quick Actions
    quickActionsSection: {
        marginBottom: Spacing.md,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: Spacing.sm,
    },
    quickActionsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    quickActionWrapper: {
        flex: 1,
    },
    quickActionButton: {
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.sm,
        borderRadius: 16,
        borderWidth: 1,
    },
    quickActionIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.xs,
    },
    quickActionLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Priority Section
    prioritySection: {
        marginBottom: Spacing.md,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    seeAllText: {
        fontSize: 13,
        fontWeight: '600',
    },
    priorityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: Spacing.xs,
        overflow: 'hidden',
    },
    priorityAccent: {
        width: 4,
        alignSelf: 'stretch',
    },
    priorityContent: {
        flex: 1,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
    },
    priorityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 6,
        marginRight: Spacing.sm,
    },
    priorityBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        marginLeft: 4,
    },
    priorityType: {
        fontSize: 10,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    priorityTitle: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 20,
    },
    priorityAction: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm,
    },
    // Empty State — Open Illustration Style
    emptyStateContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.lg,
    },
    emptyStateIllustration: {
        width: 140,
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    floatingEmoji: {
        position: 'absolute',
        fontSize: 22,
    },
    floatingEmoji1: {
        top: 4,
        right: 8,
    },
    floatingEmoji2: {
        bottom: 10,
        left: 4,
    },
    floatingEmoji3: {
        top: 14,
        left: 16,
    },
    emptyStateCenterIcon: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyStateCenterEmoji: {
        fontSize: 40,
    },
    emptyStateHeadline: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.3,
        marginBottom: 6,
    },
    emptyStateBody: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
    },
    emptyStatePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 22,
        borderRadius: 24,
        gap: 8,
    },
    emptyStatePillText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    // Chat Section
    chatSection: {
        marginBottom: Spacing.md,
    },
    chatInputLike: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingLeft: Spacing.md,
        paddingRight: 6,
        borderRadius: Radius.xl,
        borderWidth: 1,
    },
    chatInputContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    chatPlaceholder: {
        fontSize: 15,
        fontWeight: '500',
        marginLeft: Spacing.sm,
    },
    chatSendButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Tips Section
    tipsSection: {
        marginBottom: Spacing.sm,
    },
    tipsScrollContent: {
        paddingRight: Spacing.md,
        gap: Spacing.sm,
    },
    tipCard: {
        width: 130,
        height: 130,
        borderRadius: 16,
        padding: Spacing.md,
        justifyContent: 'space-between',
    },
    tipEmoji: {
        fontSize: 28,
    },
    tipTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    tipDescription: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 14,
    },
});
