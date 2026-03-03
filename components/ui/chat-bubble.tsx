import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';

interface ChatBubbleProps {
    text: string;
    isUser: boolean;
    style?: StyleProp<ViewStyle>;
    delay?: number;
}

export function ChatBubble({ text, isUser, style, delay = 0 }: ChatBubbleProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    if (isUser) {
        return (
            <Animated.View
                entering={FadeInRight.delay(delay).duration(300).springify()}
                style={[styles.container, styles.userContainer, style]}
            >
                <View
                    style={[
                        styles.bubble,
                        styles.userBubble,
                        Shadows.subtle,
                        { backgroundColor: colors.userBubble },
                    ]}
                >
                    <Text style={[styles.text, { color: colors.userBubbleText }]}>
                        {text}
                    </Text>
                </View>
            </Animated.View>
        );
    }

    return (
        <Animated.View
            entering={FadeInLeft.delay(delay).duration(300).springify()}
            style={[styles.container, styles.agentContainer, style]}
        >
            <View
                style={[
                    styles.bubble,
                    styles.agentBubble,
                    Shadows.subtle,
                    {
                        backgroundColor: colors.agentBubble,
                        borderColor: colors.glassBorder,
                    },
                ]}
            >
                <Text style={[styles.text, { color: colors.agentBubbleText }]}>
                    {text}
                </Text>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        width: '100%',
    },
    userContainer: {
        alignItems: 'flex-end',
    },
    agentContainer: {
        alignItems: 'flex-start',
    },
    bubble: {
        maxWidth: '85%',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
    },
    userBubble: {
        borderRadius: Radius.xl,
        borderBottomRightRadius: Radius.sm,
    },
    agentBubble: {
        borderWidth: 1,
        borderRadius: Radius.xl,
        borderBottomLeftRadius: Radius.sm,
    },
    text: {
        fontSize: 16,
        lineHeight: 24,
        letterSpacing: -0.2, // Tighter tracking for modern feel
    },
});
