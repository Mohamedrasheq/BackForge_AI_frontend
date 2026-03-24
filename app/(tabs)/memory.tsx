import { EmptyState } from '@/components/ui/empty-state';
import { Header } from '@/components/ui/header';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { subscribeToMemoryChanges } from '@/lib/supabase';
import { useTabBar } from '@/lib/tab-bar-context';
import { getAllMemories } from '@/services/api';
import { MemoryItem, Urgency } from '@/types/api';
import { useFocusEffect, useRouter } from 'expo-router';

import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';



import { useUser } from '@clerk/clerk-expo';

export default function MemoryScreen() {
    const { user } = useUser();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { handleScroll } = useTabBar();

    const [memories, setMemories] = useState<MemoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'open' | 'closed'>('all');

    // Filter options
    const FILTER_OPTIONS = [
        { key: 'all', label: 'All' },
        { key: 'open', label: 'Open' },
        { key: 'closed', label: 'Completed' },
    ] as const;

    // Filtered memories based on search and filter
    const filteredMemories = memories.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = activeFilter === 'all' || item.status === activeFilter;
        return matchesSearch && matchesFilter;
    });

    const fetchMemories = useCallback(async () => {
        if (!user) return;
        try {
            const response = await getAllMemories(user.id);
            // Sort by creation date descending
            const sorted = response.items.sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            setMemories(sorted);
        } catch (error) {
            console.error('Failed to fetch memories:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            fetchMemories();
        }, [fetchMemories])
    );

    // Supabase Realtime subscription
    useEffect(() => {
        if (!user) return;

        const unsubscribe = subscribeToMemoryChanges(user.id, () => {
            console.log('[Memory] Realtime update received');
            fetchMemories();
        });

        return () => unsubscribe();
    }, [user, fetchMemories]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchMemories();
    }, [fetchMemories]);

    const getUrgencyColor = (urgency: Urgency) => {
        switch (urgency) {
            case 'high':
                return colors.urgencyHigh;
            case 'medium':
                return colors.urgencyMedium;
            case 'low':
                return colors.urgencyLow;
            default:
                return colors.textSecondary;
        }
    };

    const getTypeIcon = (type: string): React.ComponentProps<typeof IconSymbol>['name'] => {
        switch (type) {
            case 'task':
                return 'checkmark.circle';
            case 'follow_up':
                return 'bubble.left';
            case 'note':
                return 'doc.text';
            default:
                return 'list.bullet.rectangle';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'task': return '#4F46E5';
            case 'follow_up': return '#7C3AED';
            case 'note': return '#0D9488';
            default: return colors.textSecondary;
        }
    };

    const getRelativeTime = (dateStr: string) => {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffHr = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHr / 24);
        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHr < 24) return `${diffHr}h ago`;
        if (diffDay < 7) return `${diffDay}d ago`;
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const formatDueDate = (dateStr: string | null) => {
        if (!dateStr) return null;
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const isToday = date.toDateString() === now.toDateString();
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            const isTomorrow = date.toDateString() === tomorrow.toDateString();

            const timeStr = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

            if (isToday) return `Today at ${timeStr}`;
            if (isTomorrow) return `Tomorrow at ${timeStr}`;

            return date.toLocaleDateString(undefined, { 
                month: 'short', 
                day: 'numeric', 
                hour: 'numeric', 
                minute: '2-digit' 
            });
        } catch (e) {
            return dateStr;
        }
    };

    const renderItem = ({ item }: { item: MemoryItem }) => {
        const isCompleted = item.status === 'closed';
        const urgencyColor = getUrgencyColor(item.urgency);
        const typeColor = getTypeColor(item.type);

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.card,
                    {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: colors.border,
                        opacity: isCompleted ? 0.6 : (pressed ? 0.95 : 1),
                    },
                ]}
            >
                {/* Type icon circle */}
                <View style={[styles.typeCircle, { backgroundColor: typeColor + '15' }]}>
                    <IconSymbol name={getTypeIcon(item.type)} size={18} color={typeColor} />
                </View>

                {/* Content */}
                <View style={styles.cardContent}>
                    {/* Title */}
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                        {item.title}
                    </Text>

                    {/* Meta row: type label + chips + time */}
                    <View style={styles.metaRow}>
                        <Text style={[styles.cardType, { color: colors.textSecondary }]}>
                            {item.type === 'follow_up' ? 'Follow-up' : item.type}
                        </Text>

                        {!isCompleted && (
                            <View style={[styles.urgencyDot, { backgroundColor: urgencyColor }]} />
                        )}
                        {!isCompleted && (
                            <Text style={[styles.urgencyLabel, { color: urgencyColor }]}>
                                {item.urgency}
                            </Text>
                        )}
                        {isCompleted && (
                            <View style={[styles.statusChip, { backgroundColor: colors.tint + '15' }]}>
                                <IconSymbol name="checkmark" size={10} color={colors.tint} />
                                <Text style={[styles.statusChipText, { color: colors.tint }]}>Done</Text>
                            </View>
                        )}

                        <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                            {getRelativeTime(item.created_at)}
                        </Text>
                    </View>

                    {(item.due_at || item.scheduled_message_id) && item.status === 'open' && (
                        <View style={[styles.scheduledBadge, { backgroundColor: colors.tint + '15' }]}>
                            <IconSymbol name="bell.fill" size={10} color={colors.tint} />
                            <Text style={[styles.scheduledBadgeText, { color: colors.tint }]}>
                                {item.due_at ? `Scheduled: ${formatDueDate(item.due_at)}` : 'Scheduled Reminder'}
                            </Text>
                        </View>
                    )}
                </View>
            </Pressable>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

            <Header showBranding={false} />

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={[styles.searchInput, {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: colors.border,
                        color: colors.text,
                    }]}
                    placeholder="Search memories..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Filter Chips */}
            <View style={styles.filterContainer}>
                {FILTER_OPTIONS.map((option) => (
                    <Pressable
                        key={option.key}
                        onPress={() => setActiveFilter(option.key)}
                        style={[
                            styles.filterChip,
                            {
                                backgroundColor: activeFilter === option.key ? colors.tint : 'transparent',
                                borderColor: activeFilter === option.key ? colors.tint : colors.border,
                            }
                        ]}
                    >
                        <Text style={[
                            styles.filterChipText,
                            { color: activeFilter === option.key ? '#FFFFFF' : colors.text }
                        ]}>
                            {option.label}
                        </Text>
                    </Pressable>
                ))}
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.tint} />
                </View>
            ) : (
                <FlatList
                    data={filteredMemories}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[
                        styles.listContent,
                        { paddingBottom: insets.bottom + 100 },
                        filteredMemories.length === 0 && styles.emptyListContent,
                    ]}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
                    }
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    ListEmptyComponent={
                        <EmptyState
                            lottieSource={require('@/assets/animations/empty-memory.json')}
                            title="No Memories Yet"
                            description="Your personal agent captures key info from your chats. Start a conversation to build your memory bank."
                            actionLabel="Start Chatting"
                            onAction={() => router.push('/chat')}
                        />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.sm,
    },
    emptyListContent: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: Spacing.sm,
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    typeCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 21,
        marginBottom: 6,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cardType: {
        fontSize: 12,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    urgencyDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    urgencyLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        gap: 3,
    },
    statusChipText: {
        fontSize: 11,
        fontWeight: '600',
    },
    timeText: {
        fontSize: 11,
        fontWeight: '400',
        marginLeft: 'auto',
    },
    scheduledBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 4,
        alignSelf: 'flex-start',
    },
    scheduledBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    emptyContainer: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    emptyIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: Spacing.xs,
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
    },
    searchContainer: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.sm,
    },
    searchInput: {
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: Spacing.md,
        fontSize: 16,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    filterChip: {
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.md,
        borderRadius: 20,
        borderWidth: 1,
    },
    filterChipText: {
        fontSize: 14,
        fontWeight: '500',
    },
});

