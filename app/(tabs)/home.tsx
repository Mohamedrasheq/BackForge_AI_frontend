import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { subscribeToMemoryChanges } from '@/lib/supabase';
import { useTabBar } from '@/lib/tab-bar-context';
import { closeMemory, getDailyBrief, getMemoriesByDate } from '@/services/api';
import type { DailyBriefItem, MemoryItem } from '@/types/api';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import { Image } from 'expo-image';
import LottieView from 'lottie-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Image as RNImage, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInLeft,
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

// Get time-based greeting
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
};


// Helper for local date string (YYYY-MM-DD)
const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Get agent-style narrative briefing
const getAgentNarrative = (status: HomeStatus, isNewUser: boolean, selectedDate: Date) => {
    const isToday = selectedDate.toDateString() === new Date().toDateString();

    if (isNewUser && isToday) {
        return "Welcome! I'm ready to be your second brain. Share a thought in chat to start organizing your life.";
    }

    if (!isToday) {
        const dateName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
        if (status.pendingCount === 0) {
            return `You had a clear schedule on ${dateName}. Everything was under control and preserved.`;
        }
        return `On ${dateName}, you had ${status.pendingCount} items recorded. I've preserved all the context for you.`;
    }

    if (status.pendingCount === 0) {
        return "You're all settled. I'm standing by if you need to capture a new memory or task right now.";
    }
    const topItem = status.topItems[0];
    if (status.pendingCount === 1) {
        return `I've noted one item: ${topItem?.title || 'a new task'}. Shall we take a look and get it done?`;
    }
    return `You have ${status.pendingCount} items today. I recommend focusing on ${topItem?.title || 'your priority'} first.`;
};


export default function HomeScreen() {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const { user } = useUser();
    const { handleScroll } = useTabBar();
    const [status, setStatus] = useState<HomeStatus>(INITIAL_STATUS);
    const calendarRef = React.useRef<ScrollView>(null);

    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [allMemories, setAllMemories] = useState<MemoryItem[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date(new Date().setHours(0, 0, 0, 0)));
    const [progress, setProgress] = useState<DailyProgress>({ total: 0, completed: 0, percentage: 0 });
    const [isNewUser, setIsNewUser] = useState(false);
    const [historyFilter, setHistoryFilter] = useState<'completed' | 'pending'>('completed');
    const [showAllHistory, setShowAllHistory] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    // Load selected avatar
    useEffect(() => {
        const loadAvatar = async () => {
            try {
                const pending = await SecureStore.getItemAsync('pending_avatar_url');
                if (pending) {
                    setAvatarUrl(pending);
                } else if (user?.imageUrl) {
                    setAvatarUrl(user.imageUrl);
                }
            } catch (e) {
                console.warn('[Home] Failed to load avatar:', e);
            }
        };
        loadAvatar();
    }, [user]);

    // Filtered items (Pending vs Completed) based on selected date
    const { pendingItems, completedItems } = React.useMemo(() => {
        const dayMemories = allMemories; // Backend already filtered by date!

        const pending = dayMemories
            .filter(m => m.status !== 'closed')
            .map(m => ({
                id: m.id,
                title: m.title,
                type: m.type,
                urgency: m.urgency,
                dueAt: m.due_at,
            }));

        const completed = dayMemories
            .filter(m => m.status === 'closed')
            .map(m => ({
                id: m.id,
                title: m.title,
                type: m.type,
                urgency: m.urgency,
                dueAt: m.due_at,
            }));

        return { pendingItems: pending, completedItems: completed };
    }, [allMemories]);

    useEffect(() => {
        setShowAllHistory(false);
    }, [selectedDate, historyFilter]);

    // 3. Dynamic Scroll to Today
    const scrollToToday = useCallback((animated = true) => {
        if (!calendarRef.current) return;
        
        // Calculate index of today based on isNewUser
        // New users start from today (index 0), existing start from -7 (index 7)
        const todayIndex = isNewUser ? 0 : 7;
        
        // Each chip is 60 width + 12 gap = 72px
        const chipWidth = 72;
        const scrollX = (todayIndex * chipWidth) - (SCREEN_WIDTH / 2) + (chipWidth / 2);
        
        setTimeout(() => {
            calendarRef.current?.scrollTo({ x: Math.max(0, scrollX), animated });
        }, animated ? 600 : 0);
    }, [isNewUser]);

    // Scroll on initial load and when isNewUser state is determined
    useEffect(() => {
        if (!isLoading) {
            scrollToToday(true);
        }
    }, [isLoading, isNewUser, scrollToToday]);

    // 4. Scroll to Today on screen focus
    useFocusEffect(
        useCallback(() => {
            scrollToToday(true);
        }, [scrollToToday])
    );

    const fetchHomeData = useCallback(async () => {
        if (!user) return;
        try {
            const dateStr = getLocalDateString(selectedDate);
            const [briefResponse, memoriesResponse] = await Promise.all([
                getDailyBrief(user.id),
                getMemoriesByDate(user.id, dateStr),
            ]);
            const pendingCount = briefResponse.items.length;
            const hasPendingItems = pendingCount > 0;
            const memories = Array.isArray(memoriesResponse) ? memoriesResponse : (memoriesResponse.items || []);
            setAllMemories(memories);

            // Calculate progress for TODAY specifically
            const todayStr = getLocalDateString(new Date());
            setIsNewUser(memories.length === 0);

            const todayMemories = memories.filter(m => {
                const createdDate = new Date(m.created_at);
                return getLocalDateString(createdDate) === todayStr;
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
                topItems: briefResponse.items.slice(0, 2), // Keep status.topItems for briefing
                hasPendingItems,
                pendingCount,
                confidenceMessage: confidence,
            });
        } catch (error) {
            console.error('[Home] Fetch error:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [user, selectedDate]);

    useEffect(() => {
        fetchHomeData();
    }, [fetchHomeData]);

    // Handle date selection and fetch tasks for that date
    const handleDateSelect = useCallback(async (date: Date) => {
        if (!user) return;
        setSelectedDate(date);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Fetch data for the selected date from the backend
        try {
            const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
            const response = await getMemoriesByDate(user.id, dateStr);
            const memories = Array.isArray(response) ? response : (response.items || []);
            setAllMemories(memories);
        } catch (error) {
            console.error('[Home] Error fetching date tasks:', error);
            // Fallback: If backend is not ready, we currently show empty list if setAllMemories fails
        }
    }, [user]);

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


    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[
                    styles.content,
                    { paddingTop: insets.top + Spacing.sm, paddingBottom: insets.bottom + 80 },
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
                    <Image
                        source={avatarUrl || user?.imageUrl}
                        style={styles.headerAvatar}
                        contentFit="cover"
                    />
                    <View style={styles.greetingTextContainer}>
                        <View style={styles.greetingRow}>
                            <Text style={styles.waveEmoji}>👋</Text>
                            <Text style={[styles.greetingText, { color: colors.text }]}>
                                {getGreeting()},
                            </Text>
                        </View>
                        {user && (
                            <Text style={[styles.greetingName, { color: colors.tint, textAlign: 'center' }]}>
                                {`${user.firstName || ''} ${user.lastName || ''}`.trim()}
                            </Text>
                        )}
                    </View>
                </Animated.View>

                {/* 2. Agent's Narrative Section */}
                <Animated.View
                    entering={Platform.OS === 'android' ? undefined : FadeInLeft.delay(200).duration(800).springify().damping(18)}
                    style={styles.narrativeSection}
                >
                    <View style={styles.narrativeHeader}>
                        <Text style={[styles.narrativeLabel, { color: colors.tint }]}>AGENT'S PERSPECTIVE</Text>
                        <LottieView
                            source={require('@/assets/animations/Live chatbot.json')}
                            autoPlay
                            loop
                            style={[styles.narrativeThinking, { transform: [{ scale: 1.6 }] }]}
                            renderMode="SOFTWARE"
                        />
                    </View>
                    <Text style={[styles.narrativeText, { color: colors.text, minHeight: 46 }]} numberOfLines={2}>
                        {getAgentNarrative(status, isNewUser, selectedDate)}
                    </Text>
                </Animated.View>

                {/* 3. Intelligence Board (Merged Status/Progress) */}
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

                {/* 4. Calendar Timeline */}
                <View style={styles.calendarSection}>
                    <ScrollView
                        ref={calendarRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.calendarScroll}
                    >
                        {(() => {
                            const dates = [];
                            const startOffset = isNewUser ? 0 : -7;
                            const endOffset = isNewUser ? 10 : 2;
                            for (let i = startOffset; i <= endOffset; i++) {
                                const d = new Date();
                                d.setDate(d.getDate() + i);
                                dates.push(d);
                            }
                            return dates.map((date, idx) => {
                                const isSelected = date.toDateString() === selectedDate.toDateString();
                                const isToday = date.toDateString() === new Date().toDateString();
                                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                                const dayDate = date.getDate();

                                return (
                                    <Pressable
                                        key={idx}
                                        onPress={() => handleDateSelect(date)}
                                        style={[
                                            styles.dateChip,
                                            isSelected && { backgroundColor: `${colors.tint}20`, borderColor: colors.tint }
                                        ]}
                                    >
                                        <Text style={[styles.dateDay, { color: isSelected ? colors.tint : colors.textSecondary }]}>
                                            {isToday ? 'TODAY' : dayName}
                                        </Text>
                                        <Text style={[styles.dateNumber, { color: isSelected ? colors.tint : colors.text }]}>
                                            {dayDate}
                                        </Text>
                                        {isSelected && <View style={[styles.activeDot, { backgroundColor: colors.tint }]} />}
                                    </Pressable>
                                );
                            });
                        })()}
                    </ScrollView>
                </View>

                {/* 5. Priority Items Cards */}
                <Animated.View entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(350).duration(500)} style={styles.prioritySection}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                            {selectedDate.toDateString() === new Date().toDateString() ? 'PRIORITY TODAY' : `${selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}`}
                        </Text>
                    </View>
                    {pendingItems.length > 0 ? (
                        pendingItems.length === 1 ? (
                            /* Single item — no timeline, just a clean card */
                            (() => {
                                const item = pendingItems[0];
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
                                                    marginLeft: 0,
                                                    borderLeftWidth: 4,
                                                    borderLeftColor: urgencyColor,
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
                                {pendingItems.map((item, index) => {
                                    const urgencyColor = item.urgency === 'high' ? colors.urgencyHigh : (item.urgency === 'medium' ? colors.urgencyMedium : colors.urgencyLow);
                                    const isLast = index === pendingItems.length - 1;
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
                                                <View style={styles.timelineDotColumn}>
                                                    {hasTime && dueDate && (
                                                        <Text style={[styles.timelineTimeLabel, { color: urgencyColor }]} numberOfLines={1}>
                                                            {dueDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).toLowerCase()}
                                                        </Text>
                                                    )}
                                                    <View style={styles.timelineDotOuter}>
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
                        /* Empty State Container */
                        <View style={styles.allDoneContainer}>
                            <View style={styles.emptyActivityContainer}>
                                <View style={styles.emptyStateIllustration}>
                                    <LottieView
                                        source={require('@/assets/animations/Man Working on Laptop.json')}
                                        autoPlay
                                        loop={false}
                                        style={styles.checkLottie}
                                        renderMode="SOFTWARE"
                                    />
                                </View>
                                <Text style={[styles.emptyActivityHeadline, { color: colors.text }]}>
                                    {isNewUser ? 'Your space is clear' : 'All tasks completed!'}
                                </Text>
                                {selectedDate < new Date(new Date().setHours(0, 0, 0, 0)) && !isNewUser && (
                                    <View style={styles.historyFilterContainer}>
                                        <Pressable
                                            style={[styles.historyFilterPill, historyFilter === 'completed' && { backgroundColor: `${colors.tint}15`, borderColor: `${colors.tint}40` }]}
                                            onPress={() => {
                                                setHistoryFilter('completed');
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }}
                                        >
                                            <IconSymbol name="checkmark.circle.fill" size={12} color={historyFilter === 'completed' ? colors.tint : colors.textSecondary} />
                                            <Text style={[styles.historyFilterText, { color: historyFilter === 'completed' ? colors.tint : colors.textSecondary }]}>Completed</Text>
                                        </Pressable>
                                        <Pressable
                                            style={[styles.historyFilterPill, historyFilter === 'pending' && { backgroundColor: `${colors.urgencyHigh}15`, borderColor: `${colors.urgencyHigh}40` }]}
                                            onPress={() => {
                                                setHistoryFilter('pending');
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }}
                                        >
                                            <IconSymbol name="clock.fill" size={12} color={historyFilter === 'pending' ? colors.urgencyHigh : colors.textSecondary} />
                                            <Text style={[styles.historyFilterText, { color: historyFilter === 'pending' ? colors.urgencyHigh : colors.textSecondary }]}>Not Completed</Text>
                                        </Pressable>
                                    </View>
                                )}
                            </View>

                            {/* Show toggled items below Lottie & Filters */}
                            {((historyFilter === 'completed' && completedItems.length > 0) || (historyFilter === 'pending' && pendingItems.length > 0)) && (
                                <View style={styles.completedRecordWrapper}>
                                    <View style={styles.completedHeaderRow}>
                                        <View style={[styles.completedLine, { backgroundColor: colors.border }]} />
                                        <Text style={[styles.completedHeaderLabel, { color: colors.textSecondary }]}>
                                            {historyFilter === 'completed' ? 'COMPLETED RECORDS' : 'NOT COMPLETED'}
                                        </Text>
                                        <View style={[styles.completedLine, { backgroundColor: colors.border }]} />

                                        {(historyFilter === 'completed' ? completedItems : pendingItems).length > 4 && (
                                            <Pressable
                                                style={styles.seeAllButton}
                                                onPress={() => {
                                                    setShowAllHistory(!showAllHistory);
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                }}
                                            >
                                                <Text style={[styles.seeAllText, { color: colors.tint }]}>
                                                    {showAllHistory ? 'Show Less' : 'See All'}
                                                </Text>
                                                <IconSymbol
                                                    name={showAllHistory ? "chevron.up" : "chevron.down"}
                                                    size={10}
                                                    color={colors.tint}
                                                />
                                            </Pressable>
                                        )}
                                    </View>

                                    {(historyFilter === 'completed' ? completedItems : pendingItems)
                                        .slice(0, showAllHistory ? undefined : 4)
                                        .map((item, idx) => (
                                            <Animated.View
                                                key={item.id}
                                                entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(100 * idx).duration(400)}
                                                style={[
                                                    styles.historicalRecordCard,
                                                    {
                                                        backgroundColor: `${colors.backgroundSecondary}40`,
                                                        borderColor: colors.border
                                                    }
                                                ]}
                                            >
                                                <View style={[
                                                    styles.historicalCardAccent,
                                                    { backgroundColor: historyFilter === 'completed' ? '#22C55E' : '#EF4444' }
                                                ]} />
                                                <View style={styles.historicalCardContent}>
                                                    <View style={styles.historicalCardHeader}>
                                                        <View style={styles.historicalTypeRow}>
                                                            <IconSymbol
                                                                name={item.type === 'task' ? 'checkmark.circle' : (item.type === 'follow_up' ? 'bubble.left' : 'doc.text')}
                                                                size={10}
                                                                color={colors.textSecondary}
                                                            />
                                                            <Text style={[styles.historicalTypeText, { color: colors.textSecondary }]}>
                                                                {item.type || 'Task'}
                                                            </Text>
                                                        </View>
                                                        <View style={[styles.historicalStatusBadge, { backgroundColor: historyFilter === 'completed' ? '#22C55E15' : '#EF444415' }]}>
                                                            <Text style={[styles.historicalStatusText, { color: historyFilter === 'completed' ? '#22C55E' : '#EF4444' }]}>
                                                                {historyFilter === 'completed' ? 'DONE' : 'MISSED'}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <Text style={[styles.historicalCardTitle, { color: colors.text }]} numberOfLines={2}>
                                                        {item.title}
                                                    </Text>
                                                </View>
                                            </Animated.View>
                                        ))}
                                </View>
                            )}
                        </View>
                    )}
                </Animated.View>


            </ScrollView>

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
                                {pendingDoneItem?.title}
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    headerAvatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    greetingTextContainer: {
        flex: 1,
        justifyContent: 'center',
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
        width: 56,
        alignItems: 'center',
        paddingTop: 14,
    },
    timelineTimeLabel: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.3,
        marginBottom: 4,
        textAlign: 'center', // Added to ensure centering in the new wider column
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
        alignItems: 'center',
        gap: 12,
    },
    timelineDueText: {
        flex: 1,
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
    // Agent Narrative Styles
    narrativeSection: {
        marginBottom: Spacing.sm,
        paddingHorizontal: Spacing.sm,
    },
    narrativeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 0,
    },
    narrativeThinking: {
        width: 42,
        height: 42,
    },
    narrativeLabel: {
        fontSize: 12.5,
        fontWeight: '900',
        letterSpacing: 1.2,
        opacity: 0.9,
    },
    narrativeText: {
        fontSize: 15.5,
        lineHeight: 22,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    // Calendar Styles
    calendarSection: {
        marginBottom: Spacing.md,
    },
    calendarScroll: {
        paddingHorizontal: Spacing.md,
        gap: 12,
        paddingBottom: 4,
    },
    dateChip: {
        width: 64,
        height: 80,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        backgroundColor: 'rgba(255,255,255,0.03)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    dateDay: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    dateNumber: {
        fontSize: 20,
        fontWeight: '800',
    },
    timelineMarker: {
        width: 32,
        alignItems: 'center',
        paddingTop: 14,
    },
    timelineDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
    },
    activeDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginTop: 2,
    },
    // Completed List Styles
    allDoneContainer: {
        alignItems: 'center',
        paddingTop: 0,
    },
    emptyActivityContainer: {
        alignItems: 'center',
        marginBottom: 8,
    },
    checkLottie: {
        width: 360,
        height: 360,
        marginTop: -20,
    },
    emptyActivityHeadline: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 4,
        letterSpacing: -0.2,
    },
    emptyActivityBody: {
        fontSize: 13,
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 18,
    },
    completedRecordWrapper: {
        width: '100%',
        marginTop: 8,
    },
    completedHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    seeAllButton: {
        position: 'absolute',
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    completedLine: {
        flex: 1,
        height: 1,
        opacity: 0.5,
    },
    completedHeaderLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    // Historical Filter & Card Styles
    historyFilterContainer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    historyFilterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    historyFilterText: {
        fontSize: 13,
        fontWeight: '600',
    },
    historicalRecordCard: {
        width: '100%',
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
        overflow: 'hidden',
        flexDirection: 'row',
    },
    historicalCardAccent: {
        width: 4,
        height: '100%',
        position: 'absolute',
        left: 0,
        top: 0,
    },
    historicalCardContent: {
        flex: 1,
        padding: 16,
        paddingLeft: 20,
    },
    historicalCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    historicalTypeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    historicalTypeText: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    historicalStatusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
    },
    historicalStatusText: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    historicalCardTitle: {
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 22,
    },
    completedCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    completedCardTitle: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
    },
});
