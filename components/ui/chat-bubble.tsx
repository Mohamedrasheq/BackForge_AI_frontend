import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Markdown from 'react-native-markdown-display';
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

    const markdownStyles = StyleSheet.create({
        body: {
            color: isUser ? colors.userBubbleText : colors.agentBubbleText,
            fontSize: 16,
            lineHeight: 24,
            letterSpacing: -0.2,
        },
        paragraph: {
            marginTop: 0,
            marginBottom: 0,
        },
        strong: {
            fontWeight: '700',
        },
        em: {
            fontStyle: 'italic',
        },
        link: {
            color: colors.tint,
            textDecorationLine: 'underline',
        },
        bullet_list: {
            marginVertical: 4,
        },
        ordered_list: {
            marginVertical: 4,
        },
        code_inline: {
            backgroundColor: isUser ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
            borderRadius: 4,
            paddingHorizontal: 4,
            fontFamily: 'Courier',
        },
    });

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
                    <Markdown style={markdownStyles}>
                        {text}
                    </Markdown>
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
                <Markdown style={markdownStyles}>
                    {text}
                </Markdown>
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
});
