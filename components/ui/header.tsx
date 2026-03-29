import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import haptics from '@/lib/haptics';
import { useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderProps {
    title?: string;
    subtitle?: string;
    showBranding?: boolean;
    icon?: React.ComponentProps<typeof IconSymbol>['name'];
    rightElement?: React.ReactNode;
    hideDefaultRightElements?: boolean;
    hideAvatar?: boolean;
    centerElement?: React.ReactNode;
    style?: ViewStyle;
    leftContainerStyle?: ViewStyle;
    centerContainerStyle?: ViewStyle;
    rightContainerStyle?: ViewStyle;
}

export function Header({
    title,
    subtitle,
    showBranding = false,
    icon,
    rightElement,
    hideDefaultRightElements = false,
    hideAvatar = false,
    centerElement,
    style,
    leftContainerStyle,
    centerContainerStyle,
    rightContainerStyle,
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
                    borderBottomColor: colors.border,
                },
                style,
            ]}
        >
            <View style={styles.content}>
                {/* Left Area */}
                <View style={[styles.leftArea, leftContainerStyle]}>
                    {!hideAvatar && (
                        <Pressable
                            onPress={handleProfilePress}
                            style={({ pressed }) => [
                                styles.avatarButton,
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
                    )}
                </View>

                {/* Center Area — Absolutely Positioned for perfect centering */}
                <View 
                    style={[
                        styles.centerArea, 
                        centerContainerStyle,
                        { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, pointerEvents: 'none' }
                    ]}
                >
                    <View style={{ pointerEvents: 'auto' }}>
                        {centerElement || (showBranding && <View style={styles.centerSpacer} />)}
                    </View>
                </View>

                {/* Right Area */}
                <View style={[styles.rightArea, rightContainerStyle]}>
                    {rightElement}
                    {!hideDefaultRightElements && (
                        <Pressable
                            onPress={handleSettingsPress}
                            style={({ pressed }) => [
                                styles.gearButton,
                                {
                                    opacity: pressed ? 0.6 : 1,
                                    backgroundColor: colorScheme === 'dark'
                                        ? 'rgba(255,255,255,0.08)'
                                        : 'rgba(0,0,0,0.05)',
                                },
                            ]}
                        >
                            <IconSymbol
                                name="gearshape.fill"
                                size={18}
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
        paddingBottom: Spacing.sm,
        zIndex: 10,
        backgroundColor: Colors.light.background, // Fallback, will be overridden by dynamic color
        borderBottomWidth: 1,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 44,
    },
    avatarButton: {
        flexShrink: 0,
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
    leftArea: {
        width: 44, // Fixed width for balancing
        justifyContent: 'center',
    },
    centerArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerSpacer: {
        flex: 1,
    },
    rightArea: {
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    gearButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
