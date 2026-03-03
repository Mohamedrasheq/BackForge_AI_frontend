import { GlassButton } from '@/components/ui/glass-button';
import { GlassCard } from '@/components/ui/glass-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getAllMemories } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Image as RNImage, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import haptics from '@/lib/haptics';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useFocusEffect } from 'expo-router';
import { isProActive, presentCustomerCenter } from '../services/revenuecat';

interface Stats {
    tasks: number;
    followUps: number;
    notes: number;
    total: number;
}

function getTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export default function ProfileScreen() {
    const { user } = useUser();
    const { signOut } = useAuth();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const insets = useSafeAreaInsets();
    const [stats, setStats] = useState<Stats>({ tasks: 0, followUps: 0, notes: 0, total: 0 });
    const [signOutVisible, setSignOutVisible] = useState(false);
    const [proActive, setProActive] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            const checkPro = async () => {
                const active = await isProActive();
                setProActive(active);
            };
            checkPro();
        }, [])
    );

    const handleSubscription = async () => {
        haptics.medium();
        if (proActive) {
            await presentCustomerCenter();
        } else {
            router.push('/paywall');
        }
    };

    useEffect(() => {
        async function fetchStats() {
            if (!user?.id) return;
            try {
                const { items } = await getAllMemories(user.id);
                const counts: Stats = { tasks: 0, followUps: 0, notes: 0, total: items.length };
                items.forEach((item) => {
                    if (item.type === 'task') counts.tasks++;
                    else if (item.type === 'follow_up') counts.followUps++;
                    else if (item.type === 'note') counts.notes++;
                });
                setStats(counts);
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            }
        }
        fetchStats();
    }, [user?.id]);

    const handleSignOut = () => {
        haptics.medium();
        setSignOutVisible(true);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

            {/* Header */}
            <View
                style={[
                    styles.header,
                    {
                        paddingTop: insets.top + Spacing.sm,
                        backgroundColor: colors.background,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                    },
                    Shadows.subtle,
                ]}
            >
                <View style={styles.headerContent}>
                    <Pressable
                        onPress={() => {
                            haptics.light();
                            router.back();
                        }}
                        style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.6 : 1 }]}
                    >
                        <IconSymbol name="chevron.left" size={28} color={colors.tint} />
                        <Text style={[styles.backText, { color: colors.tint }]}>Back</Text>
                    </Pressable>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
                    <View style={styles.headerSpacer} />
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + Spacing.xl },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Hero */}
                <Animated.View entering={FadeIn.delay(100).duration(500)}>
                    <LinearGradient
                        colors={['#4F46E5', '#7C3AED']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.profileHero}
                    >
                        <View style={styles.avatarContainer}>
                            {user?.imageUrl ? (
                                <RNImage
                                    source={{ uri: user.imageUrl }}
                                    style={styles.avatar}
                                />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>
                                        {user?.firstName?.charAt(0) ?? '?'}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.nameContainer}>
                            <Text style={styles.profileName}>
                                {user?.firstName} {user?.lastName}
                            </Text>
                            {proActive && (
                                <RNImage
                                    source={require('../assets/images/pro-icon.png')}
                                    style={styles.nameProBadge}
                                    resizeMode="contain"
                                />
                            )}
                        </View>
                        <Text style={styles.profileEmail}>
                            {user?.primaryEmailAddress?.emailAddress}
                        </Text>
                    </LinearGradient>
                </Animated.View>

                {/* Stats Cards */}
                <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                        YOUR ACTIVITY
                    </Text>
                    <View style={styles.statsGrid}>
                        <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                            <View style={[styles.statIconCircle, { backgroundColor: '#4F46E5' + '15' }]}>
                                <IconSymbol name="checkmark.circle.fill" size={20} color="#4F46E5" />
                            </View>
                            <Text style={[styles.statValue, { color: colors.text }]}>{stats.tasks}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tasks</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                            <View style={[styles.statIconCircle, { backgroundColor: '#7C3AED' + '15' }]}>
                                <IconSymbol name="arrow.uturn.left.circle.fill" size={20} color="#7C3AED" />
                            </View>
                            <Text style={[styles.statValue, { color: colors.text }]}>{stats.followUps}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Follow-ups</Text>
                        </View>
                        <View style={[styles.statCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                            <View style={[styles.statIconCircle, { backgroundColor: '#0D9488' + '15' }]}>
                                <IconSymbol name="note.text" size={20} color="#0D9488" />
                            </View>
                            <Text style={[styles.statValue, { color: colors.text }]}>{stats.notes}</Text>
                            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Notes</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Account Details */}
                <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                        ACCOUNT DETAILS
                    </Text>
                    <GlassCard style={styles.card} animate={false}>
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <IconSymbol name="envelope.fill" size={18} color={colors.tint} />
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
                            </View>
                            <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
                                {user?.primaryEmailAddress?.emailAddress}
                            </Text>
                        </View>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <IconSymbol name="globe" size={18} color={colors.tint} />
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Timezone</Text>
                            </View>
                            <Text style={[styles.value, { color: colors.text }]}>{getTimezone()}</Text>
                        </View>
                        <View style={[styles.divider, { backgroundColor: colors.border }]} />
                        <View style={styles.row}>
                            <View style={styles.rowLeft}>
                                <IconSymbol name="tray.full.fill" size={18} color={colors.tint} />
                                <Text style={[styles.label, { color: colors.textSecondary }]}>Total Items</Text>
                            </View>
                            <Text style={[styles.value, { color: colors.text }]}>{stats.total}</Text>
                        </View>
                    </GlassCard>
                </Animated.View>

                {/* Subscription */}
                <Animated.View entering={FadeInDown.delay(350).duration(500)}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                        SUBSCRIPTION
                    </Text>
                    <GlassCard
                        style={[styles.card, proActive && styles.proCard]}
                        animate={false}
                    >
                        <Pressable onPress={handleSubscription} style={styles.subscriptionContent}>
                            <View style={styles.rowLeft}>
                                <View style={[styles.proIconCircle, { backgroundColor: 'transparent' }]}>
                                    <RNImage
                                        source={require('../assets/images/pro-icon.png')}
                                        style={[styles.proIconImage, !proActive && { opacity: 0.4 }]}
                                        resizeMode="contain"
                                    />
                                </View>
                                <View>
                                    <Text style={[styles.proTitle, { color: colors.text }]}>
                                        BackForge AI Pro {proActive ? 'Active' : ''}
                                    </Text>
                                    <Text style={[styles.proSubtitle, { color: colors.textSecondary }]}>
                                        {proActive ? 'You have unlimited AI messages' : 'Limit: 5 AI messages per day'}
                                    </Text>
                                </View>
                            </View>
                            <IconSymbol name="chevron.right" size={18} color={colors.textSecondary} />
                        </Pressable>
                    </GlassCard>
                </Animated.View>

                {/* Sign Out */}
                <Animated.View entering={FadeInDown.delay(400).duration(500)}>
                    <GlassButton
                        title="Sign Out"
                        onPress={handleSignOut}
                        variant="primary"
                        style={styles.signOutButton}
                    />
                </Animated.View>
            </ScrollView>

            {/* Sign Out Confirmation */}
            <Modal
                visible={signOutVisible}
                animationType="fade"
                transparent
                onRequestClose={() => setSignOutVisible(false)}
            >
                <View style={styles.confirmOverlay}>
                    <View style={[styles.confirmCard, { backgroundColor: colors.backgroundSecondary }]}>
                        <View style={styles.confirmIconRow}>
                            <View style={[styles.confirmIconCircle, { backgroundColor: colors.tint + '15' }]}>
                                <IconSymbol name="arrow.uturn.left.circle.fill" size={24} color={colors.tint} />
                            </View>
                        </View>
                        <Text style={[styles.confirmTitle, { color: colors.text }]}>Sign Out</Text>
                        <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
                            Are you sure you want to sign out of your account?
                        </Text>
                        <View style={styles.confirmButtons}>
                            <Pressable
                                onPress={() => setSignOutVisible(false)}
                                style={({ pressed }) => [
                                    styles.confirmBtn,
                                    { backgroundColor: colors.border + '40', opacity: pressed ? 0.7 : 1 },
                                ]}
                            >
                                <Text style={[styles.confirmBtnText, { color: colors.text }]}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={() => {
                                    setSignOutVisible(false);
                                    signOut();
                                }}
                                style={({ pressed }) => [
                                    styles.confirmBtn,
                                    { backgroundColor: colors.tint, opacity: pressed ? 0.7 : 1 },
                                ]}
                            >
                                <Text style={[styles.confirmBtnText, { color: '#FFFFFF' }]}>Sign Out</Text>
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
    header: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.sm,
        zIndex: 10,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 44,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    backText: {
        fontSize: 17,
        fontWeight: '500',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    headerSpacer: {
        width: 60,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.md,
    },
    // Profile Hero
    profileHero: {
        borderRadius: 20,
        padding: Spacing.xl,
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    avatarContainer: {
        marginBottom: Spacing.md,
    },
    avatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarPlaceholder: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    avatarText: {
        fontSize: 36,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    nameProBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        overflow: 'hidden',
    },
    profileName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.3,
    },
    profileEmail: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 4,
        fontWeight: '500',
    },
    // Stats Grid
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
        marginLeft: Spacing.xs,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        padding: Spacing.md,
        alignItems: 'center',
        gap: 6,
    },
    statIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Account Cards
    card: {
        marginBottom: Spacing.sm,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    label: {
        fontSize: 15,
    },
    value: {
        fontSize: 15,
        fontWeight: '500',
        maxWidth: '50%',
    },
    divider: {
        height: 1,
        marginVertical: Spacing.sm,
    },
    signOutButton: {
        marginTop: Spacing.md,
    },
    // Subscription Styles
    proCard: {
        borderColor: '#34D399',
        borderWidth: 1.5,
    },
    subscriptionContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    proIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    proIconImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
    },
    proTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    proSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    // Confirm dialog
    confirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    confirmCard: {
        width: '100%',
        borderRadius: 20,
        padding: Spacing.xl,
        alignItems: 'center',
    },
    confirmIconRow: {
        marginBottom: Spacing.md,
    },
    confirmIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    confirmMessage: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    confirmButtons: {
        flexDirection: 'row',
        gap: Spacing.sm,
        width: '100%',
    },
    confirmBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmBtnText: {
        fontSize: 15,
        fontWeight: '700',
    },
});
