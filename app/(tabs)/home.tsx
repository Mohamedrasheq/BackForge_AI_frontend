import { FeatureGuideModal } from '@/components/ui/feature-guide-modal';
import { Header } from '@/components/ui/header';
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
import { Dimensions, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    FadeInDown,
    FadeInRight,
    FadeOut,
    LinearTransition,
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

            <Header showBranding={false} />

            <ScrollView
                contentContainerStyle={[
                    styles.content,
                    { paddingBottom: insets.bottom + 80 },
                ]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
                }
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
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

                {/* 2. Intelligence Board (Merged Status/Progress) */}
                <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.boardWrapper}>
                    <LinearGradient
                        colors={colorScheme === 'dark' ? ['#312E81', '#1E1B4B'] : ['#4F46E5', '#3730A3']}
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
                                <Svg width={80} height={80} viewBox="0 0 80 80">
                                    <Circle
                                        cx={40}
                                        cy={40}
                                        r={34}
                                        stroke="rgba(255,255,255,0.15)"
                                        strokeWidth={6}
                                        fill="none"
                                    />
                                    <Circle
                                        cx={40}
                                        cy={40}
                                        r={34}
                                        stroke="#34D399"
                                        strokeWidth={6}
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeDasharray={`${2 * Math.PI * 34}`}
                                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - (progress.total > 0 ? progress.percentage / 100 : 0))}`}
                                        transform="rotate(-90 40 40)"
                                    />
                                </Svg>
                                <Text style={styles.boardProgressText}>
                                    {progress.total > 0 ? progress.percentage : 0}%
                                </Text>
                            </View>
                        </View>

                        {/* Footer / Pending Items */}
                        {status.pendingCount > 0 && (
                            <Pressable
                                onPress={handleViewBrief}
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

                {/* 3. Quick Actions Row */}
                <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.quickActionsSection}>
                    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>QUICK ACTIONS</Text>
                    <View style={styles.quickActionsContainer}>
                        {QUICK_ACTIONS.map((action, index) => (
                            <Pressable
                                key={action.id}
                                onPress={() => handleQuickAction(action.route)}
                                style={({ pressed }) => [
                                    styles.quickActionItem,
                                    {
                                        backgroundColor: pressed ? `${colors.tint}15` : 'transparent',
                                        transform: [{ scale: pressed ? 0.98 : 1 }],
                                    },
                                ]}
                            >
                                <IconSymbol name={action.icon as any} size={18} color={colors.tint} />
                                <Text style={[styles.quickActionLabel, { color: colors.text }]}>
                                    {action.label.split(' ')[action.label.split(' ').length - 1]}
                                </Text>
                            </Pressable>
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
                                exiting={FadeOut.duration(300)}
                                layout={LinearTransition}
                            >
                                <Pressable
                                    onPress={() => handleMarkDone(item)}
                                    style={({ pressed }) => [
                                        styles.priorityCard,
                                        Shadows.glass,
                                        {
                                            backgroundColor: colors.background,
                                            borderColor: colors.border,
                                            transform: [{ scale: pressed ? 0.98 : 1 }],
                                        },
                                    ]}
                                >
                                    {/* Left Urgency Bar */}
                                    {/* Urgency Glow Background */}
                                    <View style={[
                                        styles.priorityUrgencyGlow,
                                        { backgroundColor: item.urgency === 'high' ? `${colors.urgencyHigh}08` : (item.urgency === 'medium' ? `${colors.urgencyMedium}06` : `${colors.urgencyLow}04`) }
                                    ]} />

                                    <View style={styles.priorityContent}>
                                        <View style={styles.priorityCardHeader}>
                                            <View style={styles.priorityTypeBadge}>
                                                <View style={[styles.typeIconBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                                    <IconSymbol
                                                        name={item.type === 'task' ? 'checkmark.circle' : (item.type === 'follow_up' ? 'bubble.left' : 'doc.text')}
                                                        size={10}
                                                        color={colors.textSecondary}
                                                    />
                                                </View>
                                                <Text style={[styles.priorityTypeText, { color: colors.textSecondary }]}>
                                                    {item.type === 'follow_up' ? 'Action' : (item.type || 'Task')}
                                                </Text>
                                            </View>
                                            <View style={[
                                                styles.priorityUrgencyBadge,
                                                { backgroundColor: item.urgency === 'high' ? `${colors.urgencyHigh}12` : (item.urgency === 'medium' ? `${colors.urgencyMedium}12` : `${colors.urgencyLow}12`) }
                                            ]}>
                                                {item.urgency === 'high' && (
                                                    <IconSymbol name="flame.fill" size={8} color={colors.urgencyHigh} style={{ marginRight: 2 }} />
                                                )}
                                                <Text style={[
                                                    styles.priorityUrgencyText,
                                                    { color: item.urgency === 'high' ? colors.urgencyHigh : (item.urgency === 'medium' ? colors.urgencyMedium : colors.urgencyLow) }
                                                ]}>
                                                    {item.urgency === 'high' ? 'Priority' : (item.urgency === 'medium' ? 'Upcoming' : 'Routine')}
                                                </Text>
                                            </View>
                                        </View>

                                        <Text style={[styles.priorityTitleText, { color: colors.text }]} numberOfLines={2}>
                                            {item.title}
                                        </Text>

                                        <View style={styles.priorityCardFooter}>
                                            <View style={styles.priorityMetaContainer}>
                                                <Text style={[styles.priorityDueTag, { color: colors.textSecondary }]}>
                                                    {item.dueAt ? `Due ${new Date(item.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'Today'}
                                                </Text>
                                            </View>
                                            <View style={[styles.priorityDoneButton, { backgroundColor: colors.tint }]}>
                                                <IconSymbol name="checkmark" size={12} color="#FFFFFF" weight="bold" />
                                            </View>
                                        </View>
                                    </View>
                                </Pressable>
                            </Animated.View>
                        ))
                    ) : (
                        <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.emptyStateContainer}>
                            {/* Lottie Animation */}
                            <Animated.View
                                entering={FadeIn.delay(500).duration(600)}
                                style={styles.emptyStateIllustration}
                            >
                                <LottieView
                                    source={require('@/assets/animations/Business decisions Lottie JSON animation.json')}
                                    autoPlay
                                    loop
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </Animated.View>

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

                {/* 5. Chat Command Bar */}
                <Animated.View entering={FadeInDown.delay(450).duration(500)} style={styles.chatSection}>
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
                <Animated.View entering={FadeInDown.delay(500).duration(500)} style={styles.tipsSection}>
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
                                entering={FadeInRight.delay(550 + index * 60).duration(400)}
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
    priorityCard: {
        flexDirection: 'row',
        borderRadius: 24,
        marginBottom: Spacing.sm,
        overflow: 'hidden',
        borderWidth: 1,
    },
    priorityUrgencyGlow: {
        ...StyleSheet.absoluteFillObject,
    },
    priorityContent: {
        flex: 1,
        padding: 18,
    },
    priorityCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    priorityTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    typeIconBox: {
        padding: 4,
        borderRadius: 6,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    priorityTypeText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    priorityUrgencyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 10,
    },
    priorityUrgencyText: {
        fontSize: 9,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    priorityTitleText: {
        fontSize: 17,
        fontWeight: '700',
        lineHeight: 23,
        marginBottom: 16,
        letterSpacing: -0.2,
    },
    priorityCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priorityMetaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    priorityDueTag: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    priorityDoneButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    prioritySeparator: {
        width: 1,
        height: 12,
        backgroundColor: 'rgba(0,0,0,0.1)',
        marginHorizontal: 8,
    },
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    priorityBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        marginLeft: 4,
    },
    priorityChevron: {
        marginLeft: 8,
        opacity: 0.5,
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
        width: 220,
        height: 220,
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
