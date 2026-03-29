import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import LottieView from 'lottie-react-native';
import React, { useRef } from 'react';
import { Dimensions, Image, ImageSourcePropType, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// Responsive scaling helper
const scale = height / 812; // Based on iPhone X height
const normalize = (size: number) => Math.round(size * scale);

interface SlideProps {
    title: string;
    subtitle: string;
    icon?: React.ComponentProps<typeof IconSymbol>['name'];
    image?: ImageSourcePropType;
    lottieSource?: any;
    iconColor?: string;
    children?: React.ReactNode;
}

export function Slide({ title, subtitle, icon, image, lottieSource, iconColor, children }: SlideProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const activeColor = iconColor || colors.tint;
    const lottieRef = useRef<LottieView>(null);

    return (
        <View style={[styles.container, { width }]}>
            <Animated.View
                entering={FadeInUp.delay(200).duration(1000).springify()}
                style={styles.imageContainer}
            >
                {lottieSource ? (
                    <View style={styles.lottieWrapper}>
                        <LottieView
                            ref={lottieRef}
                            source={lottieSource}
                            autoPlay
                            loop
                            style={styles.lottie}
                        />
                    </View>
                ) : image ? (
                    <Image source={image} style={styles.image} resizeMode="contain" />
                ) : icon ? (
                    <View style={[styles.iconContainer, { backgroundColor: activeColor + '10' }]}>
                        <IconSymbol name={icon} size={normalize(80)} color={activeColor} />
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
        paddingTop: normalize(32), // Reduced from 60
    },
    imageContainer: {
        marginBottom: normalize(12),
        alignItems: 'center',
        justifyContent: 'center',
    },
    lottieWrapper: {
        width: normalize(240), // Reduced from 280
        height: normalize(240),
        alignItems: 'center',
        justifyContent: 'center',
    },
    lottie: {
        width: '100%',
        height: '100%',
    },
    image: {
        width: normalize(200),
        height: normalize(200),
        borderRadius: normalize(100),
    },
    iconContainer: {
        width: normalize(180),
        height: normalize(180),
        borderRadius: normalize(90),
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        alignItems: 'center',
        maxWidth: '90%',
    },
    title: {
        fontSize: normalize(28), // Reduced from 32, made responsive
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: normalize(8),
        lineHeight: normalize(34),
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: normalize(16), // Reduced from 18, made responsive
        textAlign: 'center',
        lineHeight: normalize(24),
        opacity: 0.9,
    },
    childrenContainer: {
        marginTop: normalize(16),
        width: '100%',
    }
});
