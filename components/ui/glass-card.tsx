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
                {
                    borderRadius: Radius.lg,
                    backgroundColor: colors.backgroundSecondary,
                    borderWidth: 1,
                    borderColor: colors.border,
                    overflow: overflowVisible ? 'visible' : 'hidden',
                },
                Shadows.subtle,
                style,
            ]}
        >
            <View style={{ padding: Spacing.md, flexGrow: 1 }}>
                {children}
            </View>
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

const styles = StyleSheet.create({});
