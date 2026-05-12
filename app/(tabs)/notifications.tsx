import { EmptyState } from '@/components/ui/empty-state';
import { IconSymbol } from '@/components/ui/icon-symbol';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/lib/haptics';
import { useTabBar } from '@/lib/tab-bar-context';
import { getNotifications } from '@/services/api';
import { Notification } from '@/types/api';
import { useUser } from '@clerk/clerk-expo';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotificationsScreen() {
    const { user } = useUser();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { handleScroll } = useTabBar();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'sent' | 'scheduled'>('all');

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            const data = await getNotifications(user.id);
            setNotifications(data.notifications || []);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            fetchNotifications();
        }, [fetchNotifications])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const renderItem = ({ item }: { item: Notification }) => {
        const getStatusConfig = (status: string) => {
            switch (status) {
                case 'sent': return { color: '#10B981', label: 'Sent', icon: 'checkmark.circle.fill' as const };
                case 'failed': return { color: '#EF4444', label: 'Failed', icon: 'xmark.circle.fill' as const };
                default: return { color: colors.tint, label: 'Scheduled', icon: 'clock.fill' as const };
            }
        };

        const statusConfig = getStatusConfig(item.status);
        const scheduledDate = new Date(item.scheduled_at);
        const now = new Date();
        const diffMs = now.getTime() - scheduledDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        let timeAgo = '';
        if (diffMins < 1) timeAgo = 'Just now';
        else if (diffMins < 60) timeAgo = `${diffMins}m ago`;
        else if (diffHours < 24) timeAgo = `${diffHours}h ago`;
        else if (diffDays < 7) timeAgo = `${diffDays}d ago`;
        else timeAgo = scheduledDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        return (
            <View style={[styles.card, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                {/* Accent strip */}
                <View style={[styles.cardAccent, { backgroundColor: statusConfig.color }]} />

                <View style={styles.cardInner}>
                    {/* Top row: Icon + Title + Badge */}
                    <View style={styles.cardTopRow}>
                        <View style={[styles.statusIconCircle, { backgroundColor: statusConfig.color + '15' }]}>
                            <IconSymbol name={statusConfig.icon} size={16} color={statusConfig.color} />
                        </View>
                        <View style={styles.cardTitleBlock}>
                            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                                {item.title}
                            </Text>
                            <Text style={[styles.cardTimeAgo, { color: colors.textSecondary }]}>
                                {timeAgo}
                            </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '12' }]}>
                            <View style={[styles.statusBadgeDot, { backgroundColor: statusConfig.color }]} />
                            <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                                {statusConfig.label}
                            </Text>
                        </View>
                    </View>

                    {/* Body */}
                    <Text style={[styles.cardBody, { color: colors.textSecondary }]} numberOfLines={2}>
                        {item.body}
                    </Text>

                    {/* Footer */}
                    <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                        <View style={styles.cardFooterRow}>
                            <IconSymbol name="bell.fill" size={11} color={colors.textSecondary} />
                            <Text style={[styles.cardFooterText, { color: colors.textSecondary }]}>
                                {scheduledDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                {' · '}
                                {scheduledDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    if (isLoading) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.tint} />
            </View>
        );
    }

    const filteredNotifications = notifications.filter(n => {
        const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.body.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        if (activeFilter === 'sent') return n.status === 'sent';
        if (activeFilter === 'scheduled') return n.status === 'cancelled' || n.status === 'scheduled';
        return true;
    });

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

            {/* Search Bar */}
            <View style={[styles.searchBarContainer, { paddingTop: insets.top + Spacing.md }]}>
                <View style={[styles.searchBarWrapper, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                    <IconSymbol name="magnifyingglass" size={18} color={colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search notifications..."
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
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
                    {(['all', 'sent', 'scheduled'] as const).map((filterKey) => {
                        const label = filterKey === 'all' ? 'All' : filterKey === 'sent' ? 'Sent' : 'Scheduled';
                        const isActive = activeFilter === filterKey;
                        return (
                            <Pressable
                                key={filterKey}
                                onPress={() => {
                                    haptics.selection();
                                    setActiveFilter(filterKey);
                                }}
                                style={[
                                    styles.filterChip,
                                    {
                                        backgroundColor: isActive ? colors.tint : `${colors.textSecondary}10`,
                                        borderColor: isActive ? colors.tint : 'transparent',
                                    }
                                ]}
                            >
                                <Text style={[
                                    styles.filterChipText,
                                    {
                                        color: isActive ? '#FFFFFF' : colors.textSecondary,
                                        fontWeight: isActive ? '700' : '500'
                                    }
                                ]}>
                                    {label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>

            <FlatList
                data={filteredNotifications}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                    styles.list, 
                    { 
                        paddingBottom: insets.bottom + 100 
                    }, 
                    filteredNotifications.length === 0 && { flex: 1 }
                ]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
                }
                onScroll={handleScroll}
                scrollEventThrottle={16}
                ListEmptyComponent={
                    <EmptyState
                        lottieSource={require('@/assets/animations/empty-notifications.json')}
                        title="Quiet for Now"
                        description="You're all caught up! We'll notify you here if anything needs your immediate attention."
                        actionLabel="Check My Brief"
                        onAction={() => router.push('/(tabs)/home')}
                    />
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        padding: 20,
        paddingTop: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
    },
    headerSub: {
        fontSize: 15,
        marginTop: 4,
    },
    list: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.sm,
    },
    card: {
        borderRadius: Radius.lg,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        overflow: 'hidden',
    },
    cardAccent: {
        height: 3,
        width: '100%',
    },
    cardInner: {
        padding: Spacing.md,
    },
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    statusIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    cardTitleBlock: {
        flex: 1,
        marginRight: 8,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    cardTimeAgo: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 1,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 4,
    },
    statusBadgeDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    cardBody: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    cardFooter: {
        borderTopWidth: 1,
        paddingTop: 10,
    },
    cardFooterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    cardFooterText: {
        fontSize: 12,
        fontWeight: '500',
    },
    empty: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
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
    searchBarContainer: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.xs,
    },
    searchBarWrapper: {
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
});
