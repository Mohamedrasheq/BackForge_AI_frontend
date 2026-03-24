import { GlassButton } from '@/components/ui/glass-button';
import { GlassCard } from '@/components/ui/glass-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/lib/haptics';
import { isSDKAvailable, isProActive } from '@/services/revenuecat';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    Dimensions,
} from 'react-native';
import Purchases, { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import Animated, { 
    FadeIn, 
    FadeInDown, 
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient as SvgRadialGradient, Stop, Rect } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// ─── Constants ──────────────────────────────────────────────────────────────────
const LIGHT_PREMIUM = {
    pearl: '#FFFFFF',
    offWhite: '#F8FAFC',
    charcoal: '#0F172A',
    slate: '#475569',
    accent: '#6366F1',
    gold: '#F59E0B',
    softIndigo: '#EEF2FF',
    primary: '#4F46E5',
    secondary: '#8B5CF6',
    rose: '#E11D48',
};

export default function PaywallScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = 'light';
    const colors = Colors[colorScheme];
    
    const [offering, setOffering] = useState<PurchasesOffering | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [isAlreadyPro, setIsAlreadyPro] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        async function loadOfferings() {
            const active = await isProActive();
            setIsAlreadyPro(active);

            if (!(await isSDKAvailable())) {
                setIsLoading(false);
                return;
            }

            try {
                const offerings = await Purchases.getOfferings();
                if (offerings.current) {
                    setOffering(offerings.current);
                    const annualPkg = offerings.current.availablePackages.find(p => p.packageType === 'ANNUAL');
                    if (annualPkg) setSelectedId(annualPkg.identifier);
                    else if (offerings.current.availablePackages.length > 0) {
                        setSelectedId(offerings.current.availablePackages[0].identifier);
                    }
                }
            } catch (e) {
                console.warn('[Paywall] Failed to load offerings:', e);
            } finally {
                setIsLoading(false);
            }
        }

        loadOfferings();
    }, []);

    const handlePurchase = async (packageToBuy: PurchasesPackage) => {
        if (isPurchasing) return;
        haptics.medium();
        setIsPurchasing(true);

        try {
            const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
            if (customerInfo.entitlements.active['BackForge AI Pro']) {
                haptics.success();
                router.back();
            }
        } catch (e: any) {
            if (!e.userCancelled) {
                console.error('[Paywall] Purchase failed:', e);
            }
        } finally {
            setIsPurchasing(false);
        }
    };

    const handleRestore = async () => {
        haptics.light();
        try {
            await Purchases.restorePurchases();
            router.back();
        } catch (e) {
            console.error('[Paywall] Restore failed:', e);
        }
    };

    const features = [
        {
            icon: 'wand.and.stars' as const,
            title: 'Unlimited Chats',
            tag: 'POPULAR',
            gradient: ['#6366F1', '#818CF8'] as [string, string],
        },
        {
            icon: 'person.2.fill' as const,
            title: 'Team Shared Agents',
            tag: 'NEW',
            gradient: ['#F59E0B', '#FBBF24'] as [string, string],
        },
        {
            icon: 'hammer.fill' as const,
            title: 'Custom Pro Tools',
            tag: 'PRO',
            gradient: ['#E11D48', '#FB7185'] as [string, string],
        },
        {
            icon: 'bolt.fill' as const,
            title: 'Elite Models',
            tag: 'SPEED',
            gradient: ['#10B981', '#34D399'] as [string, string],
        },
    ];

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: LIGHT_PREMIUM.pearl, justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={LIGHT_PREMIUM.accent} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: LIGHT_PREMIUM.pearl }]}>
            <StatusBar style="dark" />

            {/* Background Aesthetic Layers - Radial Gradient Emulation */}
            <View style={StyleSheet.absoluteFill}>
                <Svg height="100%" width="100%">
                    <Defs>
                        <SvgRadialGradient
                            id="grad"
                            cx="50%"
                            cy="30%"
                            rx="80%"
                            ry="60%"
                            fx="50%"
                            fy="30%"
                            gradientUnits="userSpaceOnUse"
                        >
                            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                            <Stop offset="100%" stopColor="#F8FAFC" stopOpacity="1" />
                        </SvgRadialGradient>
                    </Defs>
                    <Rect x="0" y="0" width="100%" height="100%" fill="url(#grad)" />
                </Svg>
            </View>
            

            <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                    <IconSymbol name="xmark" size={22} color={LIGHT_PREMIUM.slate} />
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xl }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <Animated.View entering={FadeInUp.delay(100).duration(800)} style={styles.hero}>
                    <LottieView
                        source={require('../assets/animations/Live chatbot.json')}
                        autoPlay
                        loop
                        renderMode="HARDWARE"
                        resizeMode="cover"
                        style={styles.heroLottie}
                    />
                    <View style={styles.heroTextWrapper}>
                        <Text style={styles.heroTitle}>Upgrade to Pro</Text>
                        <Text style={styles.heroSubtitle}>
                            Unlock the enterprise suite for individuals.
                        </Text>
                    </View>
                </Animated.View>

                {/* Features Grid */}
                <View style={styles.featuresGrid}>
                    {features.map((feature, index) => (
                        <Animated.View
                            key={feature.title}
                            entering={FadeInDown.delay(300 + index * 100).duration(600).springify()}
                            style={styles.featureCard}
                        >
                            <View style={styles.featureCardTop}>
                                <LinearGradient
                                    colors={feature.gradient}
                                    style={styles.featureIconSmall}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <IconSymbol name={feature.icon} size={14} color="#FFF" />
                                </LinearGradient>
                                <View style={[styles.featureTag, { backgroundColor: feature.gradient[0] + '15' }]}>
                                    <Text style={[styles.featureTagText, { color: feature.gradient[0] }]}>{feature.tag}</Text>
                                </View>
                            </View>
                            <Text style={styles.featureCardTitle}>{feature.title}</Text>
                        </Animated.View>
                    ))}
                </View>

                {/* Pricing Section */}
                <Animated.View entering={FadeIn.delay(800).duration(800)} style={styles.pricingSection}>
                    {isAlreadyPro ? (
                        <GlassCard style={styles.proStatusCard} animate={false}>
                            <View style={styles.proStatusContent}>
                                <View style={styles.proBadgePulse}>
                                    <IconSymbol name="checkmark.seal.fill" size={32} color={LIGHT_PREMIUM.gold} />
                                </View>
                                <Text style={styles.proStatusTitle}>Elite Member</Text>
                                <Text style={styles.proStatusSub}>Your Pro features are active and ready.</Text>
                            </View>
                        </GlassCard>
                    ) : (
                        <>
                            {offering?.availablePackages.map((pkg) => (
                                <PackageCard
                                    key={pkg.identifier}
                                    pkg={pkg}
                                    isSelected={selectedId === pkg.identifier}
                                    onSelect={() => {
                                        haptics.light();
                                        setSelectedId(pkg.identifier);
                                    }}
                                    onPurchase={() => handlePurchase(pkg)}
                                    isPurchasing={isPurchasing && selectedId === pkg.identifier}
                                />
                            ))}

                            {(!offering || offering.availablePackages.length === 0) && (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>Plans loading...</Text>
                                </View>
                            )}

                            <Pressable 
                                onPress={handleRestore} 
                                style={({ pressed }) => [styles.restoreButton, { opacity: pressed ? 0.6 : 1 }]}
                            >
                                <Text style={styles.restoreText}>Restore Purchases</Text>
                            </Pressable>
                        </>
                    )}
                </Animated.View>

                <Text style={styles.legalText}>
                    Recurring billing. Manage subscriptions in Play Store settings.
                </Text>
            </ScrollView>
        </View>
    );
}

// ─── Package Card Component ─────────────────────────────────────────────────────
function PackageCard({ 
    pkg, 
    isSelected, 
    onSelect, 
    onPurchase, 
    isPurchasing 
}: { 
    pkg: PurchasesPackage, 
    isSelected: boolean, 
    onSelect: () => void,
    onPurchase: () => void,
    isPurchasing: boolean
}) {
    const isAnnual = pkg.packageType === 'ANNUAL';
    const scale = useSharedValue(1);

    useEffect(() => {
        scale.value = withSpring(isSelected ? 1.02 : 1);
    }, [isSelected]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Pressable onPress={onSelect} style={styles.pkgPressable}>
            <Animated.View style={[animatedStyle, { width: '100%' }]}>
                <View 
                    style={[
                        styles.pkgCard, 
                        isSelected ? { 
                            borderColor: LIGHT_PREMIUM.primary, 
                            borderWidth: 2,
                            backgroundColor: '#FFFFFF',
                        } : {
                            borderColor: '#E2E8F0',
                            borderWidth: 1,
                            backgroundColor: '#FFFFFF',
                        }
                    ]}
                >
                    {isAnnual && (
                        <View style={styles.bestValueBadge}>
                            <Text style={styles.bestValueText}>SAVE 40%</Text>
                        </View>
                    )}
                    
                    <View style={styles.pkgTopRow}>
                        <View style={styles.pkgInfoWrapper}>
                            <Text style={[styles.pkgName, { color: LIGHT_PREMIUM.charcoal }]}>
                                {isAnnual ? 'Pro Yearly' : 'Pro Monthly'}
                            </Text>
                            <Text style={[styles.pkgBenefit, { color: LIGHT_PREMIUM.slate }]}>
                                {isAnnual ? 'Best value, billed annually' : 'Full access, cancel anytime'}
                            </Text>
                        </View>
                        <View style={styles.priceWrapper}>
                            <Text style={[styles.pkgPrice, { color: LIGHT_PREMIUM.charcoal }]}>{pkg.product.priceString}</Text>
                            <Text style={styles.pkgDuration}>{isAnnual ? '/ yr' : '/ mo'}</Text>
                        </View>
                    </View>

                    {isSelected && (
                        <Animated.View entering={FadeIn.duration(300)}>
                            <Pressable
                                onPress={(e) => {
                                    e.stopPropagation();
                                    onPurchase();
                                }}
                                disabled={isPurchasing}
                                style={({ pressed }) => [
                                    styles.purchaseButton,
                                    { 
                                        backgroundColor: LIGHT_PREMIUM.primary,
                                        opacity: pressed || isPurchasing ? 0.8 : 1
                                    }
                                ]}
                            >
                                {isPurchasing ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={styles.purchaseButtonText}>Get Pro Access</Text>
                                )}
                            </Pressable>
                        </Animated.View>
                    )}
                </View>
            </Animated.View>
        </Pressable>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        zIndex: 10,
        paddingHorizontal: Spacing.md,
    },
    closeButton: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#00000005',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#00000005',
    },
    scrollContent: {
        paddingHorizontal: Spacing.lg,
    },
    
    // Hero
    hero: {
        alignItems: 'center',
        marginTop: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    heroLottie: {
        width: 320,
        height: 320,
        transform: [{ scale: 1.05 }],
    },
    heroTextWrapper: {
        alignItems: 'center',
        gap: 6,
    },
    heroTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: LIGHT_PREMIUM.charcoal,
        textAlign: 'center',
        letterSpacing: -1,
    },
    heroSubtitle: {
        fontSize: 16,
        color: LIGHT_PREMIUM.slate,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 280,
    },

    // Features Grid
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: Spacing.xxl,
        justifyContent: 'space-between',
    },
    featureCard: {
        width: (width - Spacing.lg * 2 - 12) / 2,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        ...Shadows.subtle,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    featureCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    featureIconSmall: {
        width: 28,
        height: 28,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureTag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    featureTagText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    featureCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: LIGHT_PREMIUM.charcoal,
        lineHeight: 18,
    },

    // Pricing
    pricingSection: {
        gap: 12,
    },
    pkgPressable: {
        width: '100%',
        marginBottom: 8,
    },
    pkgCard: {
        padding: 18,
        borderRadius: 20,
        ...Shadows.glass,
    },
    bestValueBadge: {
        position: 'absolute',
        top: -12,
        right: 16,
        backgroundColor: LIGHT_PREMIUM.primary,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        zIndex: 2,
    },
    bestValueText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    pkgTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    pkgInfoWrapper: {
        flex: 1,
        marginRight: 10,
    },
    pkgName: {
        fontSize: 18,
        fontWeight: '800',
    },
    pkgBenefit: {
        fontSize: 13,
        marginTop: 4,
    },
    priceWrapper: {
        alignItems: 'flex-end',
    },
    pkgPrice: {
        fontSize: 22,
        fontWeight: '800',
    },
    pkgDuration: {
        fontSize: 12,
        color: LIGHT_PREMIUM.slate,
        marginTop: 2,
    },
    purchaseButton: {
        height: 52,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 18,
        ...Shadows.glass,
    },
    purchaseButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },

    // Pro Status
    proStatusCard: {
        padding: 30,
        alignItems: 'center',
        borderRadius: 24,
        backgroundColor: '#FFFFFF',
        ...Shadows.float,
    },
    proStatusContent: {
        alignItems: 'center',
        gap: 12,
    },
    proBadgePulse: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: LIGHT_PREMIUM.gold + '10',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: LIGHT_PREMIUM.gold + '20',
    },
    proStatusTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: LIGHT_PREMIUM.charcoal,
    },
    proStatusSub: {
        fontSize: 15,
        color: LIGHT_PREMIUM.slate,
        textAlign: 'center',
    },

    // Misc
    emptyState: {
        padding: 20,
        alignItems: 'center',
    },
    emptyText: {
        color: LIGHT_PREMIUM.slate,
        fontSize: 14,
    },
    restoreButton: {
        alignItems: 'center',
        paddingVertical: 10,
        marginTop: 10,
    },
    restoreText: {
        fontSize: 14,
        fontWeight: '600',
        color: LIGHT_PREMIUM.accent,
    },
    legalText: {
        fontSize: 12,
        color: LIGHT_PREMIUM.slate,
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 10,
        opacity: 0.6,
    },
});
