import { BriefItem } from '@/components/ui/brief-item';
import { Header } from '@/components/ui/header';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/lib/haptics';
import { subscribeToMemoryChanges } from '@/lib/supabase';
import { closeMemory, getDailyBrief } from '@/services/api';
import type { DailyBriefItem } from '@/types/api';
import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
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

    const [items, setItems] = useState<DailyBriefItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'task' | 'follow_up' | 'note'>('all');


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

    const renderEmptyState = () => (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.tint + '15' }]}>
                <IconSymbol name="tray" size={32} color={colors.tint} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>All clear</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Nothing you need to act on today.
            </Text>
        </Animated.View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

            <Header />

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <TextInput
                    style={[styles.searchInput, {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: colors.border,
                        color: colors.text,
                    }]}
                    placeholder="Search items..."
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
                        onPress={() => {
                            haptics.selection();
                            setActiveFilter(option.key);
                        }}
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

            {/* Content */}
            <ScrollView
                style={styles.content}
                contentContainerStyle={[
                    styles.contentContainer,
                    { paddingBottom: insets.bottom + Spacing.lg },
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
            >


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
