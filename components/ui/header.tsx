import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import haptics from '@/lib/haptics';
import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
    title?: string;
    subtitle?: string;
    showBranding?: boolean;
    icon?: React.ComponentProps<typeof IconSymbol>['name'];
    rightElement?: React.ReactNode;
    hideDefaultRightElements?: boolean;
    style?: ViewStyle;
}

export function Header({
    title,
    subtitle,
    showBranding = false,
    icon,
    rightElement,
    hideDefaultRightElements = false,
    style
}: HeaderProps) {
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
                style,
            ]}
        >
            <View style={styles.content}>
                {/* Left — Avatar */}
                <View style={styles.leftArea}>
                    <Pressable
                        onPress={handleProfilePress}
                        style={({ pressed }) => [
                            {
                                opacity: pressed ? 0.8 : 1,
                                transform: [{ scale: pressed ? 0.92 : 1 }],
                            },
                        ]}
                    >
                        {user?.imageUrl ? (
                            <Image
                                source={{ uri: user.imageUrl }}
                                style={[styles.avatar, { borderColor: colors.border }]}
                            />
                        ) : (
                            <View
                                style={[styles.avatarPlaceholder, { backgroundColor: colors.tint }]}
                            >
                                <Text style={styles.avatarInitial}>
                                    {user?.firstName?.charAt(0) ?? '?'}
                                </Text>
                            </View>
                        )}
                    </Pressable>
                </View>

                {/* Center — Minimalist Symbol */}
                <View style={styles.centerArea}>
                    <Animated.View entering={FadeInDown.delay(200)}>
                        <Image
                            source={require('@/assets/images/brand_logo_cropped.png')}
                            style={styles.centerLogo}
                            resizeMode="contain"
                        />
                    </Animated.View>
                </View>

                {/* Right — Settings */}
                <View style={styles.rightArea}>
                    {rightElement}
                    {!hideDefaultRightElements && (
                        <Pressable
                            onPress={handleSettingsPress}
                            style={({ pressed }) => [
                                styles.gearButton,
                                {
                                    opacity: pressed ? 0.6 : 1,
                                    backgroundColor: `${colors.textSecondary}10`,
                                },
                            ]}
                        >
                            <IconSymbol
                                name="gearshape.fill"
                                size={20}
                                color={colors.textSecondary}
                            />
                        </Pressable>
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.sm + 4,
        zIndex: 10,
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 44,
    },
    // Left — Avatar
    leftArea: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    // Center — Search Bar
    centerArea: {
        flex: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerLogo: {
        width: 120, // Horizontal logo, cropped tight
        height: 32,
    },
    // Right — Settings
    rightArea: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 10,
    },
    avatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        borderWidth: 2,
    },
    avatarPlaceholder: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitial: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    gearButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
