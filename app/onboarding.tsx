import { Slide } from '@/components/onboarding/slide';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, ImageSourcePropType, Pressable, StyleSheet, Text, TouchableOpacity, View, ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// Indigo-tinted gradients per slide
const SLIDE_BACKGROUNDS: readonly (readonly [string, string, string])[] = [
    ['#EEF2FF', '#F5F3FF', '#FFFFFF'], // Soft indigo
    ['#EDE9FE', '#F5F3FF', '#FFFFFF'], // Purple-ish
    ['#EEF2FF', '#E0E7FF', '#FFFFFF'], // Deeper indigo
    ['#F5F3FF', '#EDE9FE', '#FFFFFF'], // Violet tint
    ['#EEF2FF', '#F0FDFA', '#FFFFFF'], // Indigo to teal
];

interface SlideData {
    id: string;
    title: string;
    subtitle: string;
    image: ImageSourcePropType;
}

const SLIDES: SlideData[] = [
    {
        id: '1',
        title: 'Think less.\nForget nothing.',
        subtitle: 'BackForge AI keeps track of your tasks, follow-ups, and loose ends — so you don\'t have to.',
        image: require('@/assets/images/onboarding-1.png'),
    },
    {
        id: '2',
        title: 'Your personal\nchief-of-staff',
        subtitle: 'I surface the right thing at the right time.\nNo pressure. No streaks. Just calm clarity.',
        image: require('@/assets/images/onboarding-2.png'),
    },
    {
        id: '3',
        title: 'Connect\nyour tools',
        subtitle: 'Link Gmail, Linear, Google Calendar, and more — BackForge AI pulls everything together.',
        image: require('@/assets/images/onboarding-3.png'),
    },
    {
        id: '4',
        title: 'Smart alerts,\nzero noise',
        subtitle: 'Get daily briefings and priority notifications — only what matters, when it matters.',
        image: require('@/assets/images/onboarding-4.png'),
    },
    {
        id: '5',
        title: "You're always\nin control",
        subtitle: 'Nothing is sent without approval.\nYour data stays private and secure.',
        image: require('@/assets/images/onboarding-5.png'),
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const finishOnboarding = async () => {
        try {
            await SecureStore.setItemAsync('has_launched_app', 'true');
        } catch (error) {
            console.error('Failed to save launch state:', error);
        }
        router.replace('/sign-in');
    };

    const handleNext = async () => {
        haptics.light();
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            await finishOnboarding();
        }
    };

    const handleSkip = async () => {
        haptics.light();
        await finishOnboarding();
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index !== null) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={SLIDE_BACKGROUNDS[currentIndex]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            />
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
                {/* Skip Button */}
                <View style={styles.skipRow}>
                    {currentIndex < SLIDES.length - 1 ? (
                        <Pressable
                            onPress={handleSkip}
                            style={({ pressed }) => [
                                styles.skipButton,
                                {
                                    opacity: pressed ? 0.5 : 1,
                                    borderColor: colors.border,
                                },
                            ]}
                        >
                            <IconSymbol name="arrow.right" size={18} color={colors.tint} />
                        </Pressable>
                    ) : (
                        <View />
                    )}
                </View>

                <FlatList
                    ref={flatListRef}
                    data={SLIDES}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.id}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                    style={{ flex: 1 }}
                    renderItem={({ item }) => (
                        <Slide
                            title={item.title}
                            subtitle={item.subtitle}
                            image={item.image}
                        />
                    )}
                />
            </SafeAreaView>

            <SafeAreaView edges={['bottom', 'left', 'right']}>
                <View style={styles.footer}>
                    {/* Paginator */}
                    <View style={styles.paginator}>
                        {SLIDES.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    {
                                        backgroundColor: index === currentIndex ? colors.tint : colors.border,
                                        width: index === currentIndex ? 24 : 8,
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    {/* Primary Action */}
                    <TouchableOpacity
                        onPress={handleNext}
                        activeOpacity={0.8}
                        style={[styles.button, { backgroundColor: colors.tint }]}
                    >
                        <Text style={styles.buttonText}>
                            {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    skipRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.sm,
    },
    skipButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skipText: {
        fontSize: 16,
        fontWeight: '500',
    },
    footer: {
        padding: Spacing.xl,
        gap: Spacing.xl,
    },
    paginator: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
    button: {
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '600',
    },
});
