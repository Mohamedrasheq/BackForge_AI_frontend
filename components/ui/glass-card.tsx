import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface GlassCardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    animate?: boolean;
    delay?: number;
    overflowVisible?: boolean;
}

export function GlassCard({
    children,
    style,
    animate = true,
    delay = 0,
    overflowVisible = false,
}: GlassCardProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    const content = (
        <View
            style={[
                styles.container,
                Shadows.subtle,
                {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                    overflow: overflowVisible ? 'visible' : 'hidden',
                },
                style,
            ]}
        >
            {children}
        </View>
    );

    if (animate) {
        return (
            <Animated.View
                entering={FadeInDown.delay(delay).duration(400).springify()}
            >
                {content}
            </Animated.View>
        );
    }

    return content;
}

const styles = StyleSheet.create({
    container: {
        padding: Spacing.md,
        borderWidth: 1,
        borderRadius: Radius.lg,
        overflow: 'hidden',
    },
});
