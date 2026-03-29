import { AvatarSelector } from '@/components/onboarding/avatar-selector';
import { Slide } from '@/components/onboarding/slide';
import { SwipeButton } from '@/components/onboarding/swipe-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, View, ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Responsive scaling helper
const scale = height / 812;
const normalize = (size: number) => Math.round(size * scale);

// Indigo-tinted gradients per slide
const SLIDE_BACKGROUNDS: readonly (readonly [string, string, string])[] = [
    ['#FFF5F0', '#FFE4D6', '#FFFFFF'], // Warm skin tone (first slide)
    ['#EDE9FE', '#F5F3FF', '#FFFFFF'], // Purple-ish
    ['#EEF2FF', '#E0E7FF', '#FFFFFF'], // Deeper indigo
    ['#F5F3FF', '#EDE9FE', '#FFFFFF'], // Violet tint
    ['#EEF2FF', '#F0FDFA', '#FFFFFF'], // Indigo to teal
    ['#FFFFFF', '#F8FAFC', '#F1F5F9'], // Neutral for avatar selection
];

// Matching vibrant colors for buttons and prominent UI elements
const SLIDE_BUTTON_COLORS = [
    '#F97316', // Warm Orange/Indigo-adjacent (first slide)
    '#8B5CF6', // Purple
    '#4F46E5', // Indigo
    '#7C3AED', // Violet
    '#0D9488', // Teal
    '#64748B', // Slate for avatar selection
];

interface SlideData {
    id: string;
    title: string;
    subtitle: string;
    lottieSource: any;
}

const SLIDES: SlideData[] = [
    {
        id: '1',
        title: 'Your personal\nagents are here',
        subtitle: 'BackForge AI keeps track of your tasks, follow-ups, and loose ends — so you don\'t have to.',
        lottieSource: require('@/assets/animations/Office Team Worker saying Hello.json'),
    },
    {
        id: '2',
        title: 'Your personal\nchief-of-staff',
        subtitle: 'I surface the right thing at the right time.\nNo pressure. No streaks. Just calm clarity.',
        lottieSource: require('@/assets/animations/onboarding-2.json'),
    },
    {
        id: '3',
        title: 'Connect\nyour tools',
        subtitle: 'Link Gmail, Linear, Google Calendar, and more — BackForge AI pulls everything together.',
        lottieSource: require('@/assets/animations/onboarding-3.json'),
    },
    {
        id: '4',
        title: 'Smart alerts,\nzero noise',
        subtitle: 'Get daily briefings and priority notifications — only what matters, when it matters.',
        lottieSource: require('@/assets/animations/onboarding-4.json'),
    },
    {
        id: '5',
        title: "You're always\nin control",
        subtitle: 'Nothing is sent without approval.\nYour data stays private and secure.',
        lottieSource: require('@/assets/animations/onboarding-5.json'),
    },
    {
        id: '6',
        title: "Choose your\nagent's look",
        subtitle: 'Select an avatar that represents your personal assistant.',
        lottieSource: null,
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAvatar, setSelectedAvatar] = useState<{ id: string; url: string } | null>(null);
    const flatListRef = useRef<FlatList>(null);

    const finishOnboarding = async () => {
        try {
            await SecureStore.setItemAsync('has_launched_app', 'true');
            if (selectedAvatar) {
                await SecureStore.setItemAsync('pending_avatar_url', selectedAvatar.url);
            }
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
                    {currentIndex > 0 && currentIndex < SLIDES.length - 1 ? (
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
                            <IconSymbol name="arrow.right" size={normalize(18)} color={SLIDE_BUTTON_COLORS[currentIndex]} />
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
                            lottieSource={item.lottieSource}
                        >
                            {item.id === '6' && (
                                <AvatarSelector
                                    selectedId={selectedAvatar?.id ?? null}
                                    onSelect={(id, url) => setSelectedAvatar({ id, url })}
                                />
                            )}
                        </Slide>
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
                                        backgroundColor: index === currentIndex ? SLIDE_BUTTON_COLORS[currentIndex] : colors.border,
                                        width: index === currentIndex ? normalize(24) : normalize(8),
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    {/* Primary Action */}
                    <SwipeButton
                        onComplete={handleNext}
                        text={currentIndex === SLIDES.length - 1 ? 'Swipe to start' : 'Swipe to continue'}
                        color={SLIDE_BUTTON_COLORS[currentIndex]}
                    />
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
        paddingTop: normalize(8),
        height: normalize(44),
        alignItems: 'center',
    },
    skipButton: {
        width: normalize(36),
        height: normalize(36),
        borderRadius: normalize(18),
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skipText: {
        fontSize: normalize(14),
        fontWeight: '500',
    },
    footer: {
        paddingTop: normalize(16),
        paddingHorizontal: Spacing.xl,
        paddingBottom: normalize(32),
        gap: normalize(16),
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
        paddingVertical: normalize(14),
        borderRadius: normalize(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: normalize(16),
        fontWeight: '600',
    },
});
