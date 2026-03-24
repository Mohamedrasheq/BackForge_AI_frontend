import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/lib/haptics';
import { useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

interface EmptyStateProps {
    lottieSource?: any; // For local require or URL
    icon?: React.ComponentProps<typeof IconSymbol>['name'];
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function EmptyState({
    lottieSource,
    icon,
    title,
    description,
    actionLabel,
    onAction,
}: EmptyStateProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const router = useRouter();

    const handleAction = () => {
        haptics.medium();
        if (onAction) {
            onAction();
        } else {
            router.push('/chat');
        }
    };

    return (
        <View style={styles.container}>
            {/* Animation Section */}
            <Animated.View 
                entering={ZoomIn.duration(800)}
                style={styles.animationContainer}
            >
                {lottieSource ? (
                    <LottieView
                        key={typeof lottieSource === 'string' ? lottieSource : 'local'}
                        source={typeof lottieSource === 'string' ? { uri: lottieSource } : lottieSource}
                        autoPlay
                        loop
                        style={styles.lottie}
                    />
                ) : icon ? (
                    <View style={[styles.iconCircle, { backgroundColor: colors.tint + '10' }]}>
                        <IconSymbol name={icon} size={48} color={colors.tint} />
                    </View>
                ) : null}
            </Animated.View>

            {/* Text Content */}
            <Animated.View 
                entering={FadeInDown.duration(600).delay(400)}
                style={styles.content}
            >
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                    {description}
                </Text>
            </Animated.View>

            {/* Action Button */}
            <Animated.View entering={FadeInDown.duration(600).delay(600)}>
                <Pressable
                    onPress={handleAction}
                    style={({ pressed }) => [
                        styles.button,
                        { 
                            backgroundColor: colors.tint,
                            opacity: pressed ? 0.9 : 1,
                            transform: [{ scale: pressed ? 0.98 : 1 }]
                        }
                    ]}
                >
                    <Text style={styles.buttonText}>{actionLabel || 'Get Started'}</Text>
                    <IconSymbol name="chevron.right" size={14} color="#FFFFFF" />
                </Pressable>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
        paddingBottom: 40,
    },
    animationContainer: {
        width: 250,
        height: 250,
        marginBottom: Spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lottie: {
        width: '100%',
        height: '100%',
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(79, 70, 229, 0.1)',
    },
    content: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        marginBottom: Spacing.sm,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: Spacing.md,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: Radius.full,
        gap: 8,
        ...Shadows.float,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
});

