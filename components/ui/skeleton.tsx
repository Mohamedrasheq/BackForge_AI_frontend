import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useEffect } from 'react';
import { DimensionValue, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

interface SkeletonProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: ViewStyle;
}

export function Skeleton({ width, height, borderRadius = 8, style }: SkeletonProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withRepeat(
            withTiming(1, { duration: 1500 }),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            progress.value,
            [0, 1],
            [
                '#E2E8F0', // Light base
                '#F8FAFC', // White shimmer
            ]
        );

        return {
            backgroundColor,
        };
    });

    return (
        <Animated.View
            style={[
                styles.skeleton,
                {
                    width: width ?? '100%',
                    height: height ?? 20,
                    borderRadius,
                },
                animatedStyle,
                style,
            ]}
        />
    );
}

const styles = StyleSheet.create({
    skeleton: {
        overflow: 'hidden',
    },
});
