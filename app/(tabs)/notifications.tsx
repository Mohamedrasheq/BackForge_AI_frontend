import { Header } from '@/components/ui/header';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Notification } from '@/types/api';
import { useUser } from '@clerk/clerk-expo';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotificationsScreen() {
    const { user } = useUser();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const insets = useSafeAreaInsets();

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        try {
            // Using a relative path helper or environment variable is best
            // Assuming EXPO_PUBLIC_API_URL is set in .env
            const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
            const response = await fetch(`${apiUrl}/notifications?userId=${user.id}`);
            const data = await response.json();
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
        const getStatusColor = (status: string) => {
            switch (status) {
                case 'sent': return '#10B981';
                case 'failed': return '#EF4444';
                default: return colors.tint;
            }
        };

        const statusColor = getStatusColor(item.status);

        return (
            <View style={[styles.card, { backgroundColor: colors.backgroundSecondary, borderLeftColor: statusColor }]}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                    <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.badgeText, { color: statusColor }]}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                </View>
                <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={2}>
                    {item.body}
                </Text>
                <Text style={[styles.date, { color: colors.icon }]}>
                    ⏰ {new Date(item.scheduled_at).toLocaleString()}
                </Text>
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

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            <Header />

            <FlatList
                data={notifications}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[styles.list, notifications.length === 0 && { flex: 1 }]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
                }
                ListEmptyComponent={
                    <Animated.View entering={FadeInDown.duration(400)} style={styles.empty}>
                        <View style={[styles.emptyIcon, { backgroundColor: colors.tint + '15' }]}>
                            <IconSymbol name="bell.fill" size={32} color={colors.tint} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: colors.text }]}>No alerts yet</Text>
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                            We'll notify you when something needs your attention.
                        </Text>
                    </Animated.View>
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
        padding: 16,
    },
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        flex: 1,
        marginRight: 8,
    },
    body: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    date: {
        fontSize: 12,
        fontWeight: '600',
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
});
