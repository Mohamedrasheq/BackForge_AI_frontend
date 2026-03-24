import { BriefItem } from '@/components/ui/brief-item';
import { EmptyState } from '@/components/ui/empty-state';
import { Header } from '@/components/ui/header';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/lib/haptics';
import { subscribeToMemoryChanges } from '@/lib/supabase';
import { useTabBar } from '@/lib/tab-bar-context';
import { closeMemory, getDailyBrief } from '@/services/api';
import type { DailyBriefItem } from '@/types/api';
import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Dimensions,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BriefScreen() {
    const { user } = useUser();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { handleScroll } = useTabBar();

    const [items, setItems] = useState<DailyBriefItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'task' | 'follow_up' | 'note'>('all');
    const [activeSpotlightIndex, setActiveSpotlightIndex] = useState(0);

    const stats = useMemo(() => ({
        total: items.length,
        tasks: items.filter(i => i.type === 'task').length,
        high: items.filter(i => i.urgency === 'high').length,
    }), [items]);

    const spotlightItems = useMemo(() => {
        return items
            .filter(i => i.urgency === 'high' || i.urgency === 'medium')
            .slice(0, 3);
    }, [items]);

    const SCREEN_WIDTH = Dimensions.get('window').width;
    const SPOTLIGHT_CARD_WIDTH = SCREEN_WIDTH - (Spacing.md * 2);


    // Filter types available
    const FILTER_OPTIONS = [
        { key: 'all', label: 'All' },
        { key: 'task', label: 'Tasks' },
        { key: 'follow_up', label: 'Follow-ups' },
        { key: 'note', label: 'Notes' },
    ] as const;

    // Filtered items based on search and filter
    const filteredItems = items.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = activeFilter === 'all' || item.type === activeFilter;
        return matchesSearch && matchesFilter;
    });

    const fetchBrief = useCallback(async () => {
        if (!user) return;
        try {
            const response = await getDailyBrief(user.id);
            setItems(response.items);
        } catch (error) {
            console.error('Failed to fetch daily brief:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        fetchBrief();
    }, [fetchBrief]);



    // Supabase Realtime subscription
    useEffect(() => {
        if (!user) return;

        const unsubscribe = subscribeToMemoryChanges(user.id, () => {
            console.log('[Brief] Realtime update received');
            fetchBrief();
        });

        return () => unsubscribe();
    }, [user, fetchBrief]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchBrief();
    }, [fetchBrief]);

    const handleDone = async (itemId: string) => {
        haptics.medium();
        try {
            await closeMemory({ memoryItemId: itemId });
            setItems((prev) => prev.filter((item) => item.id !== itemId));
        } catch (error) {
            console.error('Failed to mark as done:', error);
        }
    };

    const handleSnooze = async (itemId: string) => {
        haptics.light();
        // Snooze is not supported by backend yet
        console.warn('Snooze not supported yet');
    };

    const handleDraft = (item: DailyBriefItem) => {
        haptics.light();
        router.push({
            pathname: '/modal',
            params: { itemId: item.id, itemTitle: item.title },
        });
    };

    const handleSpotlightScroll = (event: any) => {
        const slideSize = SCREEN_WIDTH - Spacing.md;
        const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
        if (index !== activeSpotlightIndex) {
            setActiveSpotlightIndex(index);
        }
    };

    const renderEmptyState = () => (
        <EmptyState
            lottieSource={require('@/assets/animations/Businessman looking for career opportunities.json')}
            title="All Clear"
            description="Your personal agent has processed everything. You're all caught up for today!"
            actionLabel="Start a Conversation"
            onAction={() => router.push('/chat')}
        />
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

            <Header showBranding={false} />

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={[styles.searchWrapper, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                    <IconSymbol name="magnifyingglass" size={18} color={colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search your brief..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        clearButtonMode="while-editing"
                    />
                </View>
            </View>

            {/* Filter Chips */}
            <View>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.filterContainer}
                >
                    {FILTER_OPTIONS.map((option) => (
                        <Pressable
                            key={option.key}
                            onPress={() => {
                                haptics.selection();
                                setActiveFilter(option.key);
                            }}
                            style={[
                                styles.filterChip,
                                {
                                    backgroundColor: activeFilter === option.key ? colors.tint : `${colors.textSecondary}10`,
                                    borderColor: activeFilter === option.key ? colors.tint : 'transparent',
                                }
                            ]}
                        >
                            <Text style={[
                                styles.filterChipText,
                                { 
                                    color: activeFilter === option.key ? '#FFFFFF' : colors.textSecondary,
                                    fontWeight: activeFilter === option.key ? '700' : '500'
                                }
                            ]}>
                                {option.label}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            {/* Content */}
            <ScrollView
                style={styles.content}
                contentContainerStyle={[
                    styles.contentContainer,
                    { paddingBottom: insets.bottom + 100 },
                    filteredItems.length === 0 && !isLoading && styles.emptyContentContainer,
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.tint}
                    />
                }
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
            >
                {!isLoading && spotlightItems.length > 0 && activeFilter === 'all' && searchQuery === '' && (
                    <View style={styles.spotlightSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Priority Spotlight</Text>
                            <View style={styles.sectionBadge}>
                                <Text style={styles.sectionBadgeText}>Top {spotlightItems.length}</Text>
                            </View>
                        </View>
                        <ScrollView 
                            horizontal 
                            decelerationRate="fast"
                            snapToInterval={SCREEN_WIDTH - Spacing.md}
                            snapToAlignment="start"
                            showsHorizontalScrollIndicator={false}
                            style={styles.spotlightScroll}
                            contentContainerStyle={styles.spotlightContent}
                            onScroll={handleSpotlightScroll}
                            scrollEventThrottle={16}
                        >
                            {spotlightItems.map((item, index) => (
                                <Pressable 
                                    key={item.id} 
                                    onPress={() => item.type === 'follow_up' && handleDraft(item)}
                                    style={({ pressed }) => [
                                        styles.spotlightCardContainer, 
                                        { 
                                            width: SPOTLIGHT_CARD_WIDTH, 
                                            opacity: pressed ? 0.95 : 1,
                                            marginRight: index === spotlightItems.length - 1 ? 0 : Spacing.md
                                        }
                                    ]}
                                >
                                    <LinearGradient
                                        colors={
                                            item.urgency === 'high' 
                                                ? ['#E11D48', '#BE123C'] // Deep Rose
                                                : index === 1 
                                                    ? ['#4F46E5', '#3730A3'] // Deep Indigo
                                                    : ['#2563EB', '#1E40AF'] // Deep Blue
                                        }
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.spotlightCard}
                                    >
                                        <View style={styles.spotlightHeader}>
                                            <IconSymbol name={item.type === 'task' ? 'checkmark.circle.fill' : 'wand.and.stars'} size={18} color="#FFFFFF" />
                                            <Text style={styles.spotlightUrgency}>
                                                {item.urgency.toUpperCase()} PRIORITY
                                            </Text>
                                        </View>
                                        <Text style={styles.spotlightTitle} numberOfLines={2}>
                                            {item.title}
                                        </Text>
                                        <View style={styles.spotlightFooter}>
                                            <Text style={styles.spotlightAction}>
                                                {item.type === 'follow_up' ? 'Draft response →' : 'View task details'}
                                            </Text>
                                        </View>
                                    </LinearGradient>
                                </Pressable>
                            ))}
                        </ScrollView>
                        <View style={styles.paginationRow}>
                            {spotlightItems.map((_, i) => (
                                <View key={i} style={[styles.paginationDot, { backgroundColor: colors.tint, opacity: i === activeSpotlightIndex ? 1 : 0.2 }]} />
                            ))}
                        </View>
                    </View>
                )}

                {!isLoading && items.length > 0 && activeFilter === 'all' && (
                    <Text style={[styles.listHeader, { color: colors.textSecondary }]}>Your Brief Feed</Text>
                )}

                {!isLoading && filteredItems.length === 0
                    ? renderEmptyState()
                    : filteredItems.map((item, index) => (
                        <BriefItem
                            key={item.id}
                            item={item}
                            onDone={() => handleDone(item.id)}
                            onSnooze={() => handleSnooze(item.id)}
                            onDraft={() => handleDraft(item)}
                            delay={index * 100}
                            style={styles.briefItem}
                        />
                    ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
    },
    headerSubtitle: {
        fontSize: 15,
        marginTop: 2,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: Spacing.md,
        gap: Spacing.md,
    },
    briefItem: {
        marginBottom: Spacing.sm,
    },
    emptyContentContainer: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    emptyEmoji: {
        fontSize: 28,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '600',
        marginBottom: Spacing.sm,
    },
    emptyText: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    searchContainer: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.xs,
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: Spacing.md,
    },
    searchIcon: {
        marginRight: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    filterContainer: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        gap: Spacing.sm,
    },
    filterChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    filterChipText: {
        fontSize: 14,
    },
    spotlightSection: {
        marginBottom: Spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    sectionBadge: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    sectionBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: 'rgba(0,0,0,0.5)',
    },
    spotlightScroll: {
        marginHorizontal: -Spacing.md,
    },
    spotlightContent: {
        paddingHorizontal: Spacing.md,
    },
    spotlightCardContainer: {
        marginRight: Spacing.md,
    },
    spotlightCard: {
        padding: Spacing.lg,
        borderRadius: 24,
        height: 160,
        justifyContent: 'space-between',
    },
    spotlightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    spotlightUrgency: {
        fontSize: 10,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.8)',
        letterSpacing: 1,
    },
    spotlightTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        lineHeight: 28,
        letterSpacing: -0.5,
    },
    spotlightFooter: {
        alignItems: 'flex-start',
    },
    spotlightAction: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
        opacity: 0.9,
    },
    paginationRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        marginTop: Spacing.md,
    },
    paginationDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    listHeader: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: Spacing.sm,
    },
});
