import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    ViewStyle,
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

interface GlassButtonProps {
    title: string;
    onPress: () => void;
    style?: StyleProp<ViewStyle>;
    variant?: 'default' | 'primary' | 'danger';
    disabled?: boolean;
    loading?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassButton({
    title,
    onPress,
    style,
    variant = 'default',
    disabled = false,
    loading = false,
}: GlassButtonProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.97, { damping: 15 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15 });
    };

    const handlePress = async () => {
        if (disabled || loading) return;
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };

    const getBackgroundColor = () => {
        if (variant === 'primary') return colors.tint;
        if (variant === 'danger') return colors.urgencyHigh;
        return colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
    };

    const getTextColor = () => {
        if (variant === 'primary' || variant === 'danger') return '#fff';
        return colors.text;
    };

    return (
        <AnimatedPressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
            style={[animatedStyle, style]}
        >
            <Animated.View
                style={[
                    styles.inner,
                    Shadows.subtle,
                    {
                        backgroundColor: getBackgroundColor(),
                        borderColor: variant === 'default' ? colors.border : 'transparent',
                        opacity: disabled ? 0.5 : 1,
                    },
                ]}
            >
                {loading ? (
                    <ActivityIndicator color={getTextColor()} size="small" />
                ) : (
                    <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
                )}
            </Animated.View>
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    inner: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm + 4,
        borderWidth: 1,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 16,
        fontWeight: '600',
    },
});
