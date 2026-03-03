import { GlassButton } from '@/components/ui/glass-button';
import { GlassCard } from '@/components/ui/glass-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { deleteAccount } from '@/services/api';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import haptics from '@/lib/haptics';
import { useUser } from '@clerk/clerk-expo';

export default function SettingsScreen() {
    const { user } = useUser();
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const insets = useSafeAreaInsets();
    const [isDeleting, setIsDeleting] = useState(false);

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
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
                    <View style={styles.headerSpacer} />
                </View>
            </View>

            {/* Content */}
            <ScrollView
                style={styles.content}
                contentContainerStyle={[
                    styles.contentContainer,
                    { paddingBottom: insets.bottom + Spacing.lg },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* About */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    About
                </Text>
                <GlassCard style={styles.card} animate={false}>
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <IconSymbol name="info.circle.fill" size={20} color={colors.tint} />
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Version</Text>
                        </View>
                        <Text style={[styles.value, { color: colors.text }]}>1.0.0</Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <IconSymbol name="book.fill" size={20} color={colors.tint} />
                            <Text style={[styles.label, { color: colors.textSecondary }]}>How this works</Text>
                        </View>
                        <Text style={[styles.value, { color: colors.text }]}>Read Guide</Text>
                    </View>
                </GlassCard>

                {/* Preferences */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                    Preferences
                </Text>
                <GlassCard style={styles.card} animate={false}>
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <IconSymbol name="bell.fill" size={20} color={colors.tint} />
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Alert</Text>
                        </View>
                        <Text style={[styles.value, { color: colors.text }]}>Enabled</Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <IconSymbol name="moon.fill" size={20} color={colors.tint} />
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Appearance</Text>
                        </View>
                        <Text style={[styles.value, { color: colors.text }]}>System</Text>
                    </View>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <Pressable
                        onPress={() => {
                            haptics.light();
                            router.push('/(tabs)/integrations');
                        }}
                        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
                    >
                        <View style={styles.rowLeft}>
                            <IconSymbol name="link" size={20} color={colors.tint} />
                            <Text style={[styles.label, { color: colors.textSecondary }]}>Integrations</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={[styles.value, { color: colors.text }]}>Manage</Text>
                            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
                        </View>
                    </Pressable>
                </GlassCard>

                {/* Danger Zone */}
                <Text style={[styles.sectionTitle, { color: colors.urgencyHigh }]}>
                    Danger Zone
                </Text>
                <GlassCard style={styles.card} animate={false}>
                    <Text style={[styles.dangerText, { color: colors.textSecondary }]}>
                        This permanently removes your account and all data. This action cannot be undone.
                    </Text>
                    <GlassButton
                        title="Delete Account"
                        onPress={handleDeleteData}
                        variant="danger"
                        loading={isDeleting}
                        style={styles.deleteButton}
                    />
                </GlassCard>
            </ScrollView>
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
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: Spacing.md,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: Spacing.lg,
        marginBottom: Spacing.sm,
        marginLeft: Spacing.xs,
    },
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
    },
    divider: {
        height: 1,
        marginVertical: Spacing.sm,
    },
    dangerText: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: Spacing.md,
    },
    deleteButton: {
        marginTop: Spacing.xs,
    },
});
