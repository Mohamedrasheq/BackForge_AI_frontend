import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

/**
 * Index route - just shows loading screen.
 * All auth-based routing is handled by _layout.tsx useEffect
 * to prevent race conditions and screen flashing
 */
export default function Index() {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    return (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <Animated.View entering={FadeIn.duration(400)}>

                <ActivityIndicator size="small" color={colors.tint} style={styles.spinner} />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    spinner: {
        marginTop: Spacing.sm,
    },
});
