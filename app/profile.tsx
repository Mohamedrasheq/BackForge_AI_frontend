import { GlassCard } from '@/components/ui/glass-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getAllMemories } from '@/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, Image as RNImage, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Skeleton } from '@/components/ui/skeleton';
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

// ─── Profile Skeleton Component ────────────────────────────────────────────────
function ProfileSkeleton({ colors, insets }: { colors: any, insets: any }) {
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header Mirror */}
            <View style={[styles.header, { paddingTop: insets.top + Spacing.sm, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={styles.headerContent}>
                    <Skeleton width={26} height={26} borderRadius={13} />
                    <Skeleton width={80} height={20} />
                    <View style={styles.headerSpacer} />
                </View>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Hero Skeleton */}
                <View style={styles.heroContainer}>
                    <Skeleton width={100} height={100} borderRadius={50} style={{ marginBottom: Spacing.md }} />
                    <Skeleton width={180} height={28} style={{ marginBottom: 8 }} />
                    <Skeleton width={220} height={16} />
                </View>

                {/* Stats Grid Skeleton */}
                <View style={styles.modernGridRow}>
                    <Skeleton width="55%" height="100%" borderRadius={24} />
                    <View style={styles.secondaryCol}>
                        <Skeleton width="100%" height="48%" borderRadius={20} />
                        <Skeleton width="100%" height="48%" borderRadius={20} />
                    </View>
                </View>

                {/* List Skeleton */}
                <GlassCard style={styles.groupedCard} animate={false}>
                    {[1, 2, 3, 4].map((item, i) => (
                        <View key={i}>
                            <View style={styles.settingItem}>
                                <View style={styles.itemLeft}>
                                    <Skeleton width={38} height={38} borderRadius={12} />
                                    <View style={{ gap: 4 }}>
                                        <Skeleton width={60} height={12} />
                                        <Skeleton width={140} height={18} />
                                    </View>
                                </View>
                            </View>
                            {i < 3 && <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />}
                        </View>
                    ))}
                </GlassCard>
            </ScrollView>
        </View>
    );
}

export default function ProfileScreen() {
    const { user, isLoaded } = useUser();
    const { signOut } = useAuth();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const insets = useSafeAreaInsets();
    const [stats, setStats] = useState<Stats>({ tasks: 0, followUps: 0, notes: 0, total: 0 });
    const [signOutVisible, setSignOutVisible] = useState(false);
    const [proActive, setProActive] = useState(false);
    const [loading, setLoading] = useState(true);

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
                setLoading(true);
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
            } finally {
                // Keep skeleton visible for a moment for smooth feel
                setTimeout(() => setLoading(false), 800);
            }
        }
        if (isLoaded && user?.id) {
            fetchStats();
        }
    }, [user?.id, isLoaded]);

    const handleSignOut = () => {
        haptics.medium();
        setSignOutVisible(true);
    };

    if (!isLoaded || loading) {
        return <ProfileSkeleton colors={colors} insets={insets} />;
    }

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
                        style={({ pressed }) => [
                            styles.backButton,
                            { opacity: pressed ? 0.5 : 1 },
                        ]}
                    >
                        <IconSymbol name="chevron.left" size={26} color={colors.tint} />
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
                <Animated.View entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(100).duration(600)}>
                    <View style={styles.heroContainer}>
                        <LinearGradient
                            colors={[colors.tint + '10', colors.tint + '05']}
                            style={styles.heroBg}
                        />
                        <View style={styles.avatarMain}>
                            {user?.imageUrl ? (
                                <RNImage
                                    source={{ uri: user.imageUrl }}
                                    style={styles.avatarLarge}
                                />
                            ) : (
                                <View style={[styles.avatarPlaceholderLarge, { backgroundColor: colors.tint }]}>
                                    <Text style={styles.avatarTextLarge}>
                                        {user?.firstName?.charAt(0) ?? '?'}
                                    </Text>
                                </View>
                            )}
                            {proActive && (
                                <View style={styles.proIndicator}>
                                    <RNImage
                                        source={require('../assets/images/pro-icon.png')}
                                        style={styles.proBadgeMini}
                                        resizeMode="contain"
                                    />
                                </View>
                            )}
                        </View>
                        <Text style={[styles.profileNameMain, { color: colors.text }]}>
                            {user?.firstName} {user?.lastName}
                        </Text>
                        <Text style={[styles.profileEmailMain, { color: colors.textSecondary }]}>
                            {user?.primaryEmailAddress?.emailAddress}
                        </Text>
                    </View>
                </Animated.View>

                {/* Modern Stats Grid */}
                <Animated.View entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(200).duration(600)}>
                    <View style={styles.modernGridRow}>
                        {/* Primary Card - Tasks */}
                        <View style={[styles.primaryStatCard, Shadows.float, { backgroundColor: '#4F46E5', overflow: 'hidden' }]}>
                            <LinearGradient
                                colors={['#4F46E5', '#7C3AED']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={{ padding: Spacing.lg, flex: 1, justifyContent: 'space-between' }}>
                                <View style={styles.primaryTopRow}>
                                    <View style={styles.primaryIconCircle}>
                                        <IconSymbol name="checkmark.circle.fill" size={24} color="#FFFFFF" />
                                    </View>
                                    <Text style={styles.primaryLabel}>Tasks</Text>
                                </View>
                                <View style={styles.primaryValueContainer}>
                                    <Text style={styles.primaryValue}>{stats.tasks}</Text>
                                    <Text style={styles.primarySubtitle}>Completed</Text>
                                </View>
                                <View style={styles.progressBarBg}>
                                    <View style={[styles.progressBarFill, { width: stats.tasks > 0 ? '70%' : '5%' }]} />
                                </View>
                            </View>
                        </View>

                        {/* Secondary Cards Column */}
                        <View style={styles.secondaryCol}>
                            {/* Follow-ups */}
                            <View style={[styles.secondaryStatCard, Shadows.subtle, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, overflow: 'hidden' }]}>
                                <LinearGradient
                                    colors={['#7C3AED' + '20', '#7C3AED' + '05']}
                                    style={StyleSheet.absoluteFill}
                                />
                                <View style={{ padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                    <View style={[styles.secondaryIconCircle, { backgroundColor: '#7C3AED' + '20' }]}>
                                        <IconSymbol name="arrow.uturn.left.circle.fill" size={18} color="#7C3AED" />
                                    </View>
                                    <View>
                                        <Text style={[styles.secondaryValue, { color: colors.text }]}>{stats.followUps}</Text>
                                        <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>Follow-ups</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Notes */}
                            <View style={[styles.secondaryStatCard, Shadows.subtle, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, overflow: 'hidden' }]}>
                                <LinearGradient
                                    colors={['#0D9488' + '20', '#0D9488' + '05']}
                                    style={StyleSheet.absoluteFill}
                                />
                                <View style={{ padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                                    <View style={[styles.secondaryIconCircle, { backgroundColor: '#0D9488' + '20' }]}>
                                        <IconSymbol name="note.text" size={18} color="#0D9488" />
                                    </View>
                                    <View>
                                        <Text style={[styles.secondaryValue, { color: colors.text }]}>{stats.notes}</Text>
                                        <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>Notes</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/* Unified Grouped List */}
                <Animated.View entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(300).duration(600)}>
                    <GlassCard style={styles.groupedCard} animate={false}>
                        <Text style={[styles.groupTitle, { color: colors.textSecondary }]}>Account Settings</Text>

                        <View style={styles.settingItem}>
                            <View style={styles.itemLeft}>
                                <View style={[styles.itemIcon, { backgroundColor: colors.tint + '10' }]}>
                                    <IconSymbol name="envelope.fill" size={18} color={colors.tint} />
                                </View>
                                <View>
                                    <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>Email</Text>
                                    <Text style={[styles.itemValue, { color: colors.text }]} numberOfLines={1}>
                                        {user?.primaryEmailAddress?.emailAddress}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />

                        <View style={styles.settingItem}>
                            <View style={styles.itemLeft}>
                                <View style={[styles.itemIcon, { backgroundColor: '#7C3AED' + '10' }]}>
                                    <IconSymbol name="globe" size={18} color="#7C3AED" />
                                </View>
                                <View>
                                    <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>Timezone</Text>
                                    <Text style={[styles.itemValue, { color: colors.text }]}>{getTimezone()}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />

                        <Pressable onPress={handleSubscription} style={({ pressed }) => [
                            styles.settingItem,
                            { opacity: pressed ? 0.7 : 1 }
                        ]}>
                            <View style={styles.itemLeft}>
                                <View style={[styles.itemIcon, { backgroundColor: proActive ? '#34D39915' : colors.tint + '10' }]}>
                                    <IconSymbol name="star.fill" size={18} color={proActive ? '#34D399' : colors.tint} />
                                </View>
                                <View>
                                    <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>Subscription</Text>
                                    <Text style={[styles.itemValue, { color: colors.text }]}>
                                        {proActive ? 'BackForge AI Pro Active' : 'Upgrade to Pro'}
                                    </Text>
                                </View>
                            </View>
                            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
                        </Pressable>

                        <View style={[styles.itemDivider, { backgroundColor: colors.border }]} />

                        <View style={styles.settingItem}>
                            <View style={styles.itemLeft}>
                                <View style={[styles.itemIcon, { backgroundColor: '#0D9488' + '10' }]}>
                                    <IconSymbol name="tray.full.fill" size={18} color="#0D9488" />
                                </View>
                                <View>
                                    <Text style={[styles.itemLabel, { color: colors.textSecondary }]}>Knowledge Base</Text>
                                    <Text style={[styles.itemValue, { color: colors.text }]}>{stats.total} total items synced</Text>
                                </View>
                            </View>
                        </View>
                    </GlassCard>
                </Animated.View>

                {/* Sign Out Button */}
                <Animated.View entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(400).duration(600)}>
                    <Pressable
                        onPress={handleSignOut}
                        style={({ pressed }) => [
                            styles.signOutBtnRefined,
                            {
                                backgroundColor: colors.backgroundSecondary,
                                borderColor: colors.border,
                                opacity: pressed ? 0.7 : 1
                            }
                        ]}
                    >
                        <IconSymbol name="arrow.right.circle.fill" size={18} color="#EF4444" />
                        <Text style={[styles.signOutTextRefined, { color: '#EF4444' }]}>Sign Out</Text>
                    </Pressable>
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
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    headerSpacer: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.md,
    },
    // Redesigned Hero
    heroContainer: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
        marginBottom: Spacing.lg,
        position: 'relative',
    },
    heroBg: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 24,
    },
    avatarMain: {
        position: 'relative',
        marginBottom: Spacing.md,
    },
    avatarLarge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#FFFFFF',
    },
    avatarPlaceholderLarge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#FFFFFF',
    },
    avatarTextLarge: {
        fontSize: 40,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    proIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
        ...Shadows.subtle,
    },
    proBadgeMini: {
        width: 20,
        height: 20,
    },
    profileNameMain: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    profileEmailMain: {
        fontSize: 14,
        marginTop: 4,
        fontWeight: '500',
    },
    // Modern Asymmetrical Grid
    modernGridRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
        height: 180,
    },
    primaryStatCard: {
        flex: 1.2,
        borderRadius: 24,
        justifyContent: 'space-between',
        position: 'relative',
        ...Shadows.float,
    },
    primaryTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    primaryIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    primaryValueContainer: {
        marginTop: Spacing.xs,
    },
    primaryValue: {
        fontSize: 48,
        fontWeight: '800',
        color: '#FFFFFF',
        lineHeight: 52,
    },
    primarySubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        fontWeight: '600',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 3,
        marginTop: Spacing.sm,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 3,
    },
    secondaryCol: {
        flex: 1,
        gap: Spacing.sm,
    },
    secondaryStatCard: {
        flex: 1,
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        position: 'relative',
    },
    secondaryIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryValue: {
        fontSize: 18,
        fontWeight: '800',
    },
    secondaryLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    // Grouped List
    groupedCard: {
        padding: Spacing.md,
        borderRadius: 24,
        marginBottom: Spacing.lg,
    },
    groupTitle: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: Spacing.md,
        marginLeft: Spacing.xs,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.sm,
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    itemIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
    },
    itemValue: {
        fontSize: 15,
        fontWeight: '700',
    },
    itemDivider: {
        height: 1,
        marginVertical: 4,
        opacity: 0.5,
    },
    // Redesigned Sign Out
    signOutBtnRefined: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        borderRadius: 20,
        borderWidth: 1,
        gap: 8,
        marginBottom: Spacing.xl,
    },
    signOutTextRefined: {
        fontSize: 16,
        fontWeight: '700',
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
        borderRadius: 24,
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
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 8,
    },
    confirmMessage: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: Spacing.lg,
        opacity: 0.8,
    },
    confirmButtons: {
        flexDirection: 'row',
        gap: Spacing.sm,
        width: '100%',
    },
    confirmBtn: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
});
