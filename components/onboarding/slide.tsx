import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { Dimensions, Image, ImageSourcePropType, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface SlideProps {
    title: string;
    subtitle: string;
    icon?: React.ComponentProps<typeof IconSymbol>['name'];
    image?: ImageSourcePropType;
    iconColor?: string;
    children?: React.ReactNode;
}

export function Slide({ title, subtitle, icon, image, iconColor, children }: SlideProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const activeColor = iconColor || colors.tint;

    return (
        <View style={[styles.container, { width }]}>
            <Animated.View
                entering={FadeInUp.delay(200).duration(1000).springify()}
                style={styles.imageContainer}
            >
                {image ? (
                    <Image source={image} style={styles.image} resizeMode="contain" />
                ) : icon ? (
                    <View style={[styles.iconContainer, { backgroundColor: activeColor + '10' }]}>
                        <IconSymbol name={icon} size={80} color={activeColor} />
                    </View>
                ) : null}
            </Animated.View>

            <View style={styles.textContainer}>
                <Animated.Text
                    entering={FadeInDown.delay(400).duration(800).springify()}
                    style={[styles.title, { color: colors.text }]}
                >
                    {title}
                </Animated.Text>
                <Animated.Text
                    entering={FadeInDown.delay(600).duration(800).springify()}
                    style={[styles.subtitle, { color: colors.textSecondary }]}
                >
                    {subtitle}
                </Animated.Text>
                {children && (
                    <Animated.View entering={FadeInDown.delay(800).duration(800)} style={styles.childrenContainer}>
                        {children}
                    </Animated.View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
        paddingTop: 60,
    },
    imageContainer: {
        marginBottom: Spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: 220,
        height: 220,
        borderRadius: 110,
    },
    iconContainer: {
        width: 200,
        height: 200,
        borderRadius: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        alignItems: 'center',
        maxWidth: '90%',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: Spacing.md,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 18,
        textAlign: 'center',
        lineHeight: 26,
        opacity: 0.9,
    },
    childrenContainer: {
        marginTop: Spacing.xl,
        width: '100%',
    }
});
