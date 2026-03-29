import { GlassCard } from '@/components/ui/glass-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deleteAccount } from '@/services/api';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import haptics from '@/lib/haptics';
import { useUser } from '@clerk/clerk-expo';

// ─── Section Row Component ──────────────────────────────────────────────────────
interface SettingsRowProps {
    icon: React.ComponentProps<typeof IconSymbol>['name'];
    iconBg?: string;
    label: string;
    value?: string;
    onPress?: () => void;
    showChevron?: boolean;
    rightElement?: React.ReactNode;
    colors: (typeof Colors)['light'];
}

function SettingsRow({
    icon,
    iconBg,
    label,
    value,
    onPress,
    showChevron = false,
    rightElement,
    colors,
}: SettingsRowProps) {
    const content = (
        <View style={styles.row}>
            <View style={styles.rowLeft}>
                <View style={[styles.iconCircle, { backgroundColor: iconBg ?? `${colors.tint}12` }]}>
                    <IconSymbol name={icon} size={18} color={colors.tint} />
                </View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
            </View>
            <View style={styles.rowRight}>
                {rightElement}
                {value && !rightElement && (
                    <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{value}</Text>
                )}
                {showChevron && (
                    <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
                )}
            </View>
        </View>
    );

    if (onPress) {
        return (
            <Pressable
                onPress={() => {
                    haptics.light();
                    onPress();
                }}
                style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
                {content}
            </Pressable>
        );
    }

    return content;
}

// ─── Divider ────────────────────────────────────────────────────────────────────
function Divider({ color }: { color: string }) {
    return <View style={[styles.divider, { backgroundColor: color }]} />;
}

import { Skeleton } from '@/components/ui/skeleton';

// ─── Settings Skeleton Component ────────────────────────────────────────────────
function SettingsSkeleton({ colors, insets }: { colors: any, insets: any }) {
    const delay = (index: number) => index * 80;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header Mirror */}
            <View style={[styles.header, { paddingTop: insets.top + Spacing.sm, backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={[styles.headerContent, { justifyContent: 'center' }]}>
                    <Skeleton width={100} height={20} />
                </View>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
                {/* Profile Card Skeleton */}
                <GlassCard style={styles.profileCard} animate={false}>
                    <View style={styles.profileRow}>
                        <Skeleton width={44} height={44} borderRadius={22} />
                        <View style={[styles.profileInfo, { gap: 4 }]}>
                            <Skeleton width={120} height={18} />
                            <Skeleton width={80} height={14} />
                        </View>
                        <Skeleton width={18} height={18} borderRadius={9} />
                    </View>
                </GlassCard>

                {/* Section Skeletons */}
                {[1, 2, 3].map((section, idx) => (
                    <View key={idx} style={{ marginTop: Spacing.lg }}>
                        <Skeleton width={80} height={14} style={{ marginBottom: Spacing.sm, marginLeft: Spacing.xs }} />
                        <GlassCard style={styles.card} animate={false}>
                            {[1, 2].map((row, i) => (
                                <View key={i}>
                                    <View style={styles.row}>
                                        <View style={styles.rowLeft}>
                                            <Skeleton width={32} height={32} borderRadius={10} />
                                            <Skeleton width={100} height={16} />
                                        </View>
                                        <Skeleton width={60} height={16} />
                                    </View>
                                    {i === 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                                </View>
                            ))}
                        </GlassCard>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function SettingsScreen() {
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const insets = useSafeAreaInsets();
    const [isDeleting, setIsDeleting] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        // isLoaded and logic can go here if needed
    }, []);

    React.useEffect(() => {
        if (isLoaded) {
            // Artificial delay for smooth skeleton experience
            const timer = setTimeout(() => setLoading(false), 800);
            return () => clearTimeout(timer);
        }
    }, [isLoaded]);

    if (!isLoaded || loading) {
        return <SettingsSkeleton colors={colors} insets={insets} />;
    }

    const handleDeleteData = () => {
        haptics.warning();
        Alert.alert(
            'Delete Everything?',
            'This will permanently delete your account and all data. This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        if (!user) return;
                        setIsDeleting(true);
                        try {
                            await deleteAccount({ userId: user.id });
                            await user.delete();
                        } catch (error) {
                            console.error('Delete account failed:', error);
                            Alert.alert('Error', 'Failed to delete account. Please try again.');
                            setIsDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    const handleRateUs = () => {
        const storeUrl = Platform.select({
            ios: 'https://apps.apple.com/app/id<APP_ID>',
            android: 'https://play.google.com/store/apps/details?id=com.devmr.backforge.ai',
        });
        if (storeUrl) Linking.openURL(storeUrl);
    };

    const delay = (index: number) => index * 80;

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
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Config</Text>
                </View>
            </View>

            {/* Content */}
            <ScrollView
                style={styles.content}
                contentContainerStyle={[
                    styles.contentContainer,
                    { paddingBottom: insets.bottom + Spacing.xxl },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Profile Row ── */}
                <Animated.View entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(delay(0)).duration(400).springify()}>
                    <Pressable
                        onPress={() => {
                            haptics.light();
                            router.push('/profile');
                        }}
                        android_ripple={{ color: `${colors.tint}20`, borderless: false }}
                        style={({ pressed }) => [{
                            opacity: pressed ? 0.92 : 1,
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                        }]}
                    >
                        <GlassCard style={styles.profileCard} animate={false}>
                            <View style={styles.profileRow}>
                                {user?.imageUrl ? (
                                    <Image
                                        source={{ uri: user.imageUrl }}
                                        style={[styles.avatar, { borderColor: `${colors.tint}30` }]}
                                    />
                                ) : (
                                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.tint }]}>
                                        <Text style={styles.avatarInitial}>
                                            {user?.firstName?.charAt(0) ?? '?'}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.profileInfo}>
                                    <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
                                        {user?.fullName ?? 'User'}
                                    </Text>
                                    <Text style={[styles.profileSub, { color: colors.textSecondary }]} numberOfLines={1}>
                                        View Profile
                                    </Text>
                                </View>
                                <IconSymbol name="chevron.right" size={18} color={colors.textSecondary} />
                            </View>
                        </GlassCard>
                    </Pressable>
                </Animated.View>

                {/* ── General ── */}
                <Animated.View entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(delay(1)).duration(400).springify()}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>General</Text>
                    <GlassCard style={styles.card} animate={false}>
                        <SettingsRow
                            icon="bell.fill"
                            label="Notifications"
                            colors={colors}
                            rightElement={
                                <Switch
                                    value={notificationsEnabled}
                                    onValueChange={(val) => {
                                        haptics.light();
                                        setNotificationsEnabled(val);
                                    }}
                                    trackColor={{ false: '#E2E8F0', true: `${colors.tint}60` }}
                                    thumbColor={notificationsEnabled ? colors.tint : '#F1F5F9'}
                                    ios_backgroundColor="#E2E8F0"
                                />
                            }
                        />
                        <Divider color={colors.border} />
                        <SettingsRow
                            icon="moon.fill"
                            label="Appearance"
                            value="System"
                            showChevron
                            colors={colors}
                        />
                        <Divider color={colors.border} />
                        <SettingsRow
                            icon="link"
                            label="Integrations"
                            value="Manage"
                            showChevron
                            onPress={() => router.push('/(tabs)/integrations')}
                            colors={colors}
                        />
                    </GlassCard>
                </Animated.View>

                {/* ── Support ── */}
                <Animated.View entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(delay(2)).duration(400).springify()}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Support</Text>
                    <GlassCard style={styles.card} animate={false}>
                        <SettingsRow
                            icon="book.fill"
                            label="How it Works"
                            showChevron
                            onPress={() => {
                                /* Open guide */
                            }}
                            colors={colors}
                        />
                        <Divider color={colors.border} />
                        <SettingsRow
                            icon="star.fill"
                            label="Rate Us"
                            showChevron
                            onPress={handleRateUs}
                            colors={colors}
                        />
                        <Divider color={colors.border} />
                        <SettingsRow
                            icon="lock.fill"
                            label="Privacy Policy"
                            showChevron
                            onPress={() => Linking.openURL('https://back-forge-ai.vercel.app/privacy')}
                            colors={colors}
                        />
                    </GlassCard>
                </Animated.View>


                {/* ── About ── */}
                <Animated.View entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(delay(3)).duration(400).springify()}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>About</Text>
                    <GlassCard style={styles.card} animate={false}>
                        <SettingsRow
                            icon="info.circle.fill"
                            label="Version"
                            value="1.0.0"
                            colors={colors}
                        />
                    </GlassCard>
                </Animated.View>

                {/* ── Danger Zone ── */}
                <Animated.View entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(delay(4)).duration(400).springify()}>
                    <Text style={[styles.sectionTitle, { color: colors.urgencyHigh }]}>
                        Danger Zone
                    </Text>
                    <GlassCard style={styles.card} animate={false}>
                        <Text style={[styles.dangerText, { color: colors.textSecondary }]}>
                            This permanently removes your account and all data. This action cannot be undone.
                        </Text>
                        <Pressable
                            onPress={handleDeleteData}
                            disabled={isDeleting}
                            style={({ pressed }) => [
                                styles.deleteButton,
                                {
                                    borderColor: colors.urgencyHigh,
                                    opacity: pressed ? 0.7 : isDeleting ? 0.5 : 1,
                                },
                            ]}
                        >
                            <Text style={[styles.deleteButtonText, { color: colors.urgencyHigh }]}>
                                {isDeleting ? 'Deleting…' : 'Delete Account'}
                            </Text>
                        </Pressable>
                    </GlassCard>
                </Animated.View>
            </ScrollView>
        </View>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    // Header
    header: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.sm,
        zIndex: 10,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'center',
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

    // Scroll content
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: Spacing.md,
    },

    // Profile card
    profileCard: {
        marginBottom: Spacing.md,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2.5,
    },
    avatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFF',
    },
    profileInfo: {
        flex: 1,
        marginLeft: 12,
    },
    profileName: {
        fontSize: 16,
        fontWeight: '600',
    },
    profileSub: {
        fontSize: 13,
        marginTop: 1,
    },

    // Section
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
        marginLeft: Spacing.xs,
    },
    card: {
        marginBottom: Spacing.xs,
    },

    // Row
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.xs + 2,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    iconCircle: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    rowValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 44,
    },

    // Danger zone
    dangerText: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: Spacing.md,
    },
    deleteButton: {
        borderWidth: 1.5,
        borderRadius: Radius.md,
        paddingVertical: Spacing.sm + 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
});
