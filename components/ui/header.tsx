import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/lib/haptics';
import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
    title?: string;
    subtitle?: string;
    icon?: React.ComponentProps<typeof IconSymbol>['name'];
    rightElement?: React.ReactNode;
    hideLogo?: boolean;
    style?: ViewStyle;
}

export function Header({ title, subtitle, icon, rightElement, hideLogo, style }: HeaderProps) {
    const { user } = useUser();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const handleProfilePress = () => {
        haptics.light();
        router.push('/profile');
    };

    const handleSettingsPress = () => {
        haptics.light();
        router.push('/settings');
    };

    return (
        <View
            style={[
                styles.container,
                {
                    paddingTop: insets.top + Spacing.sm,
                    backgroundColor: colors.background,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                },
                Shadows.subtle,
                style
            ]}
        >
            <View style={styles.content}>
                {/* Left - Profile Image → opens Profile screen */}
                <View style={styles.sideContainer}>
                    <Pressable
                        onPress={handleProfilePress}
                        style={({ pressed }) => [
                            { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] },
                        ]}
                    >
                        {user?.imageUrl ? (
                            <Image
                                source={{ uri: user.imageUrl }}
                                style={[styles.profileImage, { borderColor: colors.border }]}
                            />
                        ) : (
                            <View style={[styles.profilePlaceholder, { backgroundColor: colors.tint }]}>
                                <Text style={styles.profileInitial}>
                                    {user?.firstName?.charAt(0) ?? '?'}
                                </Text>
                            </View>
                        )}
                    </Pressable>
                </View>

                {/* Center - Title or BackForge AI Icon */}
                <View style={styles.centerContainer}>
                    {title ? (
                        <View style={styles.titleContainer}>
                            <View style={styles.titleRow}>
                                {icon && (
                                    <IconSymbol name={icon} size={18} color={colors.tint} style={styles.titleIcon} />
                                )}
                                <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                                    {title}
                                </Text>
                            </View>
                            {subtitle && (
                                <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                                    {subtitle}
                                </Text>
                            )}
                        </View>
                    ) : (
                        !hideLogo && (
                            <Image
                                source={require('@/assets/images/icon.png')}
                                style={styles.logoIcon}
                            />
                        )
                    )}
                </View>

                {/* Right - Custom Element + Settings Icon → opens Settings screen */}
                <View style={styles.rightContainer}>
                    {rightElement}
                    <Pressable
                        onPress={handleSettingsPress}
                        style={({ pressed }) => [styles.iconButton, { opacity: pressed ? 0.6 : 1 }]}
                    >
                        <IconSymbol name="gearshape.fill" size={24} color={colors.textSecondary} />
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.sm,
        zIndex: 10,
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 44,
    },
    sideContainer: {
        width: 44,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    profileImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
    },
    profilePlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileInitial: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
    },
    titleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    titleIcon: {
        marginRight: 2,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
    },
    headerSubtitle: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: -1,
    },
    iconButton: {
        padding: 4,
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
});
