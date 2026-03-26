import { FeatureGuideModal } from '@/components/ui/feature-guide-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { subscribeToMemoryChanges } from '@/lib/supabase';
import { useTabBar } from '@/lib/tab-bar-context';
import { closeMemory, getAllMemories, getDailyBrief } from '@/services/api';
import type { DailyBriefItem } from '@/types/api';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInRight,
    FadeOut,
    LinearTransition
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


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
    { id: 'memory', label: 'Memory', icon: 'brain.head.profile', route: '/memory' },
    { id: 'chat', label: 'Chat', icon: 'bubble.left.and.bubble.right.fill', route: '/chat' },
] as const;

// Tips data with gradient colors
// Tips data with slightly darker premium gradients for a more professional look
const TIPS_DATA = [
    {
        id: 'capture',
        icon: 'mic.fill',
        title: 'Capture',
        description: 'Voice or text, I understand',
        gradient: ['#4F46E5', '#4338CA'] as const,
    },
    {
        id: 'brief',
        icon: 'list.bullet.rectangle',
        title: 'Brief',
        description: 'Prioritized daily view',
        gradient: ['#2563EB', '#1D4ED8'] as const,
    },
    {
        id: 'memory',
        icon: 'brain.head.profile',
        title: 'Memory',
        description: 'Nothing gets forgotten',
        gradient: ['#E11D48', '#BE123C'] as const,
    },
    {
        id: 'smart',
        icon: 'wand.and.stars',
        title: 'Smart',
        description: 'Context-aware help',
        gradient: ['#059669', '#047857'] as const,
    },
];


// Get time-based greeting
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
};



export default function HomeScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const { user } = useUser();
    const { handleScroll } = useTabBar();
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

    // ── Task completion confirmation flow ──
    const [pendingDoneItem, setPendingDoneItem] = useState<DailyBriefItem | null>(null);

    const handleCheckmarkTap = async (item: DailyBriefItem) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        if (item.id === 'welcome-tutorial') {
            router.push('/chat');
            return;
        }

        setPendingDoneItem(item);
    };

    const handleConfirmDone = async () => {
        if (!pendingDoneItem) return;
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            await closeMemory({ memoryItemId: pendingDoneItem.id });
            fetchHomeData();
        } catch (e) {
            console.error(e);
        }
        setPendingDoneItem(null);
    };

    const handleCancelDone = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPendingDoneItem(null);
    };

    const handleQuickAction = async (route: string) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(route as any);
    };

    const handleChat = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/chat');
    };


    const handleTipPress = async (tipId: string) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedFeature(tipId);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

            <ScrollView
                style={{ paddingTop: insets.top }}
                contentContainerStyle={[
                    styles.content,
                    { paddingTop: Spacing.sm, paddingBottom: insets.bottom + 80 },
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.tint}
                        progressViewOffset={insets.top}
                    />
                }
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
            >
                {/* 1. Personalized Greeting Section */}
                <Animated.View entering={Platform.OS === 'android' ? undefined : FadeIn.duration(600)} style={styles.greetingSection}>
                    <View style={styles.greetingRow}>
                        <Text style={styles.waveEmoji}>👋</Text>
                        <Text style={[styles.greetingText, { color: colors.text }]}>
                            {getGreeting()},
                        </Text>
                    </View>
                    {user?.firstName && (
                        <Text style={[styles.greetingName, { color: colors.tint }]}>
                            {user.firstName}
                        </Text>
                    )}
                </Animated.View>

                {/* 2. Intelligence Board (Merged Status/Progress) */}
                <Animated.View entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(100).duration(500)} style={styles.boardWrapper}>
                    <LinearGradient
                        colors={colorScheme === 'dark' ? ['#312E81', '#0e0e0eff'] : ['#4F46E5', '#3730A3']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.intelligenceBoard}
                    >
                        <View style={styles.boardHeader}>
                            <View style={styles.boardStatus}>
                                <View style={styles.liveDot} />
                                <Text style={styles.boardStatusText}>BackForge AI Live</Text>
                            </View>
                            <View style={styles.statusBadge}>
                                <IconSymbol name="brain.head.profile" size={18} color="#FFFFFF" />
                            </View>
                        </View>

                        <View style={styles.boardMainContent}>
                            <View style={styles.boardTextContent}>
                                <Text style={styles.boardTitle}>Watching over your day</Text>
                                <Text style={styles.boardSubtitle}>
                                    {progress.total === 0
                                        ? 'Capturing and prioritizing your tasks...'
                                        : `${progress.completed} of ${progress.total} items completed today`}
                                </Text>
                            </View>

                            <View style={styles.boardProgressContainer}>
                                <View style={styles.progressRingOuter}>
                                    <View style={styles.progressRingInner}>
                                        <Text style={styles.boardProgressText}>
                                            {progress.total > 0 ? progress.percentage : 0}%
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Footer / Pending Items */}
                        {status.pendingCount > 0 && (
                            <Pressable
                                onPress={() => handleQuickAction('/memory')}
                                style={({ pressed }) => [
                                    styles.boardFooter,
                                    { opacity: pressed ? 0.8 : 1 }
                                ]}
                            >
                                <Text style={styles.boardFooterText}>
                                    {status.pendingCount} item{status.pendingCount > 1 ? 's' : ''} awaiting your review
                                </Text>
                                <IconSymbol name="chevron.right" size={14} color="rgba(255,255,255,0.8)" />
                            </Pressable>
                        )}
                    </LinearGradient>
                </Animated.View>


                {/* 4. Priority Items Cards */}
                <Animated.View entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(350).duration(500)} style={styles.prioritySection}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>PRIORITY TODAY</Text>
                        {status.pendingCount > status.topItems.length && (
                            <Pressable onPress={() => handleQuickAction('/memory')}>
                                <Text style={[styles.seeAllText, { color: colors.tint }]}>
                                    See all ({status.pendingCount})
                                </Text>
                            </Pressable>
                        )}
                    </View>

                    {status.topItems.length > 0 ? (
                        status.topItems.length === 1 ? (
                            /* Single item — no timeline, just a clean card */
                            (() => {
                                const item = status.topItems[0];
                                const urgencyColor = item.urgency === 'high' ? colors.urgencyHigh : (item.urgency === 'medium' ? colors.urgencyMedium : colors.urgencyLow);
                                const dueDate = item.dueAt ? new Date(item.dueAt) : null;
                                const hasTime = dueDate ? (dueDate.getHours() !== 0 || dueDate.getMinutes() !== 0) : false;
                                return (
                                    <Animated.View
                                        key={item.id}
                                        entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(400).duration(400)}
                                        exiting={FadeOut.duration(300)}
                                        layout={LinearTransition}
                                    >
                                        <View
                                            style={[
                                                styles.timelineContent,
                                                {
                                                    backgroundColor: colors.backgroundSecondary,
                                                    borderColor: colors.border,
                                                },
                                            ]}
                                        >
                                            <View style={styles.timelineTopRow}>
                                                <View style={styles.timelineTypeBadge}>
                                                    <IconSymbol
                                                        name={item.type === 'task' ? 'checkmark.circle' : (item.type === 'follow_up' ? 'bubble.left' : 'doc.text')}
                                                        size={10}
                                                        color={colors.textSecondary}
                                                    />
                                                    <Text style={[styles.timelineTypeText, { color: colors.textSecondary }]}>
                                                        {item.type === 'follow_up' ? 'Action' : (item.type || 'Task')}
                                                    </Text>
                                                </View>
                                                <View style={styles.timelineUrgencyRow}>
                                                    {item.urgency === 'high' && (
                                                        <IconSymbol name="flame.fill" size={9} color={urgencyColor} />
                                                    )}
                                                    <Text style={[styles.timelineUrgencyLabel, { color: urgencyColor }]}>
                                                        {item.urgency === 'high' ? 'Priority' : (item.urgency === 'medium' ? 'Upcoming' : 'Routine')}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={[styles.timelineTitleText, { color: colors.text }]} numberOfLines={2}>
                                                {item.title}
                                            </Text>
                                            <View style={styles.timelineBottomRow}>
                                                <Text style={[styles.timelineDueText, { color: colors.textSecondary }]}>
                                                    {dueDate
                                                        ? `Due ${dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}${hasTime ? ` · ${dueDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : ''}`
                                                        : 'Today'}
                                                </Text>
                                                <Pressable
                                                    onPress={() => handleCheckmarkTap(item)}
                                                    hitSlop={8}
                                                    style={({ pressed }) => [
                                                        styles.timelineDoneBtn,
                                                        pendingDoneItem?.id === item.id
                                                            ? { backgroundColor: '#22C55E', borderColor: '#22C55E' }
                                                            : { backgroundColor: pressed ? `${colors.tint}25` : `${colors.tint}15`, borderColor: `${colors.tint}30` },
                                                        { transform: [{ scale: pressed ? 0.9 : 1 }] },
                                                    ]}
                                                >
                                                    <IconSymbol name="checkmark" size={11} color={pendingDoneItem?.id === item.id ? '#FFFFFF' : colors.tint} weight="bold" />
                                                </Pressable>
                                            </View>
                                        </View>
                                    </Animated.View>
                                );
                            })()
                        ) : (
                            /* Multiple items — full timeline with connector */
                            <View style={styles.timelineContainer}>
                                {/* Vertical connector line */}
                                <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                                {status.topItems.map((item, index) => {
                                    const urgencyColor = item.urgency === 'high' ? colors.urgencyHigh : (item.urgency === 'medium' ? colors.urgencyMedium : colors.urgencyLow);
                                    const isLast = index === status.topItems.length - 1;
                                    const dueDate = item.dueAt ? new Date(item.dueAt) : null;
                                    const hasTime = dueDate ? (dueDate.getHours() !== 0 || dueDate.getMinutes() !== 0) : false;
                                    return (
                                        <Animated.View
                                            key={item.id}
                                            entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(400 + (index * 100)).duration(400)}
                                            exiting={FadeOut.duration(300)}
                                            layout={LinearTransition}
                                        >
                                            <View
                                                style={[
                                                    styles.timelineRow,
                                                    !isLast && { marginBottom: 4 },
                                                ]}
                                            >
                                                {/* Timeline dot + optional time label */}
                                                <View style={styles.timelineDotColumn}>
                                                    {hasTime && dueDate && (
                                                        <Text style={[styles.timelineTimeLabel, { color: urgencyColor }]}>
                                                            {dueDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                                        </Text>
                                                    )}
                                                    <View style={[styles.timelineDotOuter, { borderColor: urgencyColor }]}>
                                                        <View style={[styles.timelineDotInner, { backgroundColor: urgencyColor }]} />
                                                    </View>
                                                </View>

                                                {/* Content */}
                                                <View style={[
                                                    styles.timelineContent,
                                                    {
                                                        backgroundColor: colors.backgroundSecondary,
                                                        borderColor: colors.border,
                                                    },
                                                ]}>
                                                    {/* Top row: type + urgency */}
                                                    <View style={styles.timelineTopRow}>
                                                        <View style={styles.timelineTypeBadge}>
                                                            <IconSymbol
                                                                name={item.type === 'task' ? 'checkmark.circle' : (item.type === 'follow_up' ? 'bubble.left' : 'doc.text')}
                                                                size={10}
                                                                color={colors.textSecondary}
                                                            />
                                                            <Text style={[styles.timelineTypeText, { color: colors.textSecondary }]}>
                                                                {item.type === 'follow_up' ? 'Action' : (item.type || 'Task')}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.timelineUrgencyRow}>
                                                            {item.urgency === 'high' && (
                                                                <IconSymbol name="flame.fill" size={9} color={urgencyColor} />
                                                            )}
                                                            <Text style={[styles.timelineUrgencyLabel, { color: urgencyColor }]}>
                                                                {item.urgency === 'high' ? 'Priority' : (item.urgency === 'medium' ? 'Upcoming' : 'Routine')}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    {/* Title */}
                                                    <Text style={[styles.timelineTitleText, { color: colors.text }]} numberOfLines={2}>
                                                        {item.title}
                                                    </Text>

                                                    {/* Bottom row: due + action */}
                                                    <View style={styles.timelineBottomRow}>
                                                        <Text style={[styles.timelineDueText, { color: colors.textSecondary }]}>
                                                            {dueDate
                                                                ? `Due ${dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}${hasTime ? ` · ${dueDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : ''}`
                                                                : 'Today'}
                                                        </Text>
                                                        <Pressable
                                                            onPress={() => handleCheckmarkTap(item)}
                                                            hitSlop={8}
                                                            style={({ pressed }) => [
                                                                styles.timelineDoneBtn,
                                                                pendingDoneItem?.id === item.id
                                                                    ? { backgroundColor: '#22C55E', borderColor: '#22C55E' }
                                                                    : { backgroundColor: pressed ? `${colors.tint}25` : `${colors.tint}15`, borderColor: `${colors.tint}30` },
                                                                { transform: [{ scale: pressed ? 0.9 : 1 }] },
                                                            ]}
                                                        >
                                                            <IconSymbol name="checkmark" size={11} color={pendingDoneItem?.id === item.id ? '#FFFFFF' : colors.tint} weight="bold" />
                                                        </Pressable>
                                                    </View>
                                                </View>
                                            </View>
                                        </Animated.View>
                                    );
                                })}
                            </View>
                        )
                    ) : (
                        <Animated.View entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(400).duration(500)} style={styles.emptyStateContainer}>
                            {/* Lottie Animation */}
                            <Animated.View
                                entering={FadeIn.delay(500).duration(600)}
                                style={styles.emptyStateIllustration}
                            >
                                <LottieView
                                    source={require('@/assets/animations/Man Working on Laptop.json')}
                                    autoPlay
                                    loop
                                    style={{ width: '98%', height: '99%', transform: [{ scale: 1.3 }] }}
                                />
                            </Animated.View>

                            {/* Text */}
                            <Animated.Text
                                entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(650).duration(400)}
                                style={[styles.emptyStateHeadline, { color: colors.text }]}
                            >
                                {isNewUser ? 'Welcome to BackForge AI!' : 'You crushed it!'}
                            </Animated.Text>
                            <Animated.Text
                                entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(750).duration(400)}
                                style={[styles.emptyStateBody, { color: colors.textSecondary }]}
                            >
                                {isNewUser
                                    ? 'Capture your first thought in chat — I\'ll handle the rest.'
                                    : 'All tasks completed. Enjoy the rest of your day.'}
                            </Animated.Text>

                            {/* CTA for new users */}
                            {isNewUser && (
                                <Animated.View entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(850).duration(400)}>
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

                {/* 5. Chat Command Bar */}
                <Animated.View entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(450).duration(500)} style={styles.chatSection}>
                    <Pressable
                        onPress={handleChat}
                        style={({ pressed }) => [
                            styles.chatInputLike,
                            {
                                backgroundColor: colors.backgroundSecondary,
                                borderColor: colors.border,
                                transform: [{ scale: pressed ? 0.99 : 1 }],
                                shadowColor: colors.tint,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: pressed ? 0.1 : 0.05,
                                shadowRadius: 12,
                                elevation: 2,
                            }
                        ]}
                    >
                        <View style={styles.chatInputContent}>
                            <IconSymbol name="wand.and.stars" size={18} color={colors.tint} />
                            <Text style={[styles.chatPlaceholder, { color: colors.textSecondary }]}>
                                Ask BackForge AI anything...
                            </Text>
                        </View>
                        <View style={[styles.chatSendButton, { backgroundColor: colors.tint }]}>
                            <IconSymbol name="mic.fill" size={16} color="#FFFFFF" />
                        </View>
                    </Pressable>
                </Animated.View>

                {/* 6. Horizontal Tips Carousel */}
                <Animated.View entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(500).duration(500)} style={styles.tipsSection}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>HOW BACKFORGE AI HELPS</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tipsScrollContent}
                        snapToInterval={150 + 10}
                        decelerationRate="fast"
                    >
                        {TIPS_DATA.map((tip, index) => (
                            <Animated.View
                                key={tip.id}
                                entering={Platform.OS === 'android' ? undefined : FadeInRight.delay(550 + index * 60).duration(400)}
                            >
                                <Pressable
                                    onPress={() => handleTipPress(tip.id)}
                                    style={({ pressed }) => [
                                        styles.tipCard,
                                        Shadows.subtle,
                                        {
                                            backgroundColor: colors.background,
                                            borderColor: `${tip.gradient[0]}20`,
                                            transform: [{ scale: pressed ? 0.98 : 1 }],
                                        }
                                    ]}
                                >
                                    <LinearGradient
                                        colors={[`${tip.gradient[0]}15`, `${tip.gradient[1]}05`]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <View style={styles.tipIconContainer}>
                                        <LinearGradient
                                            colors={tip.gradient}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.tipIconGradient}
                                        />
                                        <IconSymbol name={tip.icon as any} size={15} color="#FFFFFF" />
                                    </View>
                                    <View style={styles.tipTextContent}>
                                        <Text style={[styles.tipTitle, { color: colors.text }]}>{tip.title.toUpperCase()}</Text>
                                        <Text style={[styles.tipDescription, { color: colors.textSecondary }]} numberOfLines={2}>{tip.description}</Text>
                                    </View>
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
            {/* Confirmation Modal */}
            <Modal
                visible={!!pendingDoneItem}
                transparent
                animationType="fade"
                onRequestClose={handleCancelDone}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                        <View style={styles.modalIconRow}>
                            <View style={styles.modalCheckCircle}>
                                <IconSymbol name="checkmark" size={20} color="#FFFFFF" weight="bold" />
                            </View>
                        </View>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Mark as complete?</Text>
                        {pendingDoneItem && (
                            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                                {pendingDoneItem.title}
                            </Text>
                        )}
                        <View style={styles.modalButtons}>
                            <Pressable
                                onPress={handleCancelDone}
                                style={({ pressed }) => [
                                    styles.modalBtn,
                                    { backgroundColor: `${colors.textSecondary}15`, opacity: pressed ? 0.7 : 1 },
                                ]}
                            >
                                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={handleConfirmDone}
                                style={({ pressed }) => [
                                    styles.modalBtn,
                                    styles.modalBtnPrimary,
                                    { opacity: pressed ? 0.8 : 1 },
                                ]}
                            >
                                <IconSymbol name="checkmark" size={14} color="#FFFFFF" weight="bold" />
                                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Done</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
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
        marginTop: Spacing.sm,
        marginBottom: Spacing.lg,
        alignItems: 'center',
    },
    greetingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    waveEmoji: {
        fontSize: 28,
    },
    greetingText: {
        fontSize: 30,
        fontWeight: '800',
        letterSpacing: -0.8,
        lineHeight: 36,
    },
    greetingName: {
        fontSize: 30,
        fontWeight: '800',
        letterSpacing: -0.8,
        lineHeight: 36,
    },
    // Intelligence Board (Merged Status/Progress)
    boardWrapper: {
        marginBottom: Spacing.md,
    },
    intelligenceBoard: {
        borderRadius: 24,
        padding: Spacing.md,
        overflow: 'hidden',
    },
    boardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.md,
    },
    boardStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 6,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
    },
    boardStatusText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    boardMainContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    boardTextContent: {
        flex: 1,
    },
    boardTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    boardSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
    boardProgressContainer: {
        width: 80,
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressRingOuter: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 5,
        borderColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    progressRingInner: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    boardProgressText: {
        position: 'absolute',
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    boardFooter: {
        marginTop: Spacing.md,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    boardFooterText: {
        fontSize: 13,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
    },
    statusBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Quick Actions - Cleaner Row
    quickActionsSection: {
        marginBottom: Spacing.lg,
    },
    quickActionsContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.03)',
        padding: 6,
        borderRadius: 20,
        gap: 6,
    },
    quickActionItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 14,
        gap: 8,
    },
    quickActionLabel: {
        fontSize: 13,
        fontWeight: '700',
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: Spacing.sm,
    },
    quickActionWrapper: {
        flex: 1,
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
    // Timeline View
    timelineContainer: {
        position: 'relative',
        paddingLeft: 4,
    },
    timelineLine: {
        position: 'absolute',
        left: 27,
        top: 28,
        bottom: 28,
        width: 2,
        borderRadius: 1,
        opacity: 0.4,
    },
    timelineRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    timelineDotColumn: {
        width: 48,
        alignItems: 'center',
        paddingTop: 14,
    },
    timelineTimeLabel: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.3,
        marginBottom: 4,
    },
    timelineDotOuter: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2.5,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    timelineDotInner: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    timelineContent: {
        flex: 1,
        marginLeft: 8,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
    },
    timelineTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    timelineTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    timelineTypeText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    timelineUrgencyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    timelineUrgencyLabel: {
        fontSize: 9,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    timelineTitleText: {
        fontSize: 16,
        fontWeight: '700',
        lineHeight: 22,
        letterSpacing: -0.2,
        marginBottom: 10,
    },
    timelineBottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timelineDueText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    timelineDoneBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Confirmation Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    modalContent: {
        width: '100%',
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        borderWidth: 1,
    },
    modalIconRow: {
        marginBottom: 16,
    },
    modalCheckCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#22C55E',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.3,
        marginBottom: 6,
    },
    modalSubtitle: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    modalBtn: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    modalBtnPrimary: {
        backgroundColor: '#22C55E',
    },
    modalBtnText: {
        fontSize: 15,
        fontWeight: '700',
    },
    // Empty State — Open Illustration Style
    emptyStateContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xs, // Reduced from lg
    },
    emptyStateIllustration: {
        width: 320,
        height: 320,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm,
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
        width: 150,
        height: 140,
        borderRadius: 24,
        marginRight: 10,
        padding: 16,
        borderWidth: 1,
        justifyContent: 'space-between',
        overflow: 'hidden',
    },
    tipIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    tipIconGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    tipTextContent: {
        marginTop: 10,
    },
    tipTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    tipDescription: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 16,
    },
});
