import { GlassButton } from '@/components/ui/glass-button';
import { GlassCard } from '@/components/ui/glass-card';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/lib/haptics';
import { isSDKAvailable, setDemoPro } from '@/services/revenuecat';
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
} from 'react-native';
import Purchases, { PurchasesOffering } from 'react-native-purchases';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PaywallScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const [offering, setOffering] = useState<PurchasesOffering | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPurchasing, setIsPurchasing] = useState(false);

    useEffect(() => {
        async function loadOfferings() {
            if (!(await isSDKAvailable())) {
                setIsLoading(false);
                return;
            }

            try {
                const offerings = await Purchases.getOfferings();
                if (offerings.current) {
                    setOffering(offerings.current);
                }
            } catch (e) {
                console.warn('[Paywall] Failed to load offerings:', e);
            } finally {
                setIsLoading(false);
            }
        }

        loadOfferings();
    }, []);

    const handlePurchase = async (packageToBuy: any) => {
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
            icon: 'sparkles' as const,
            title: 'Unlimited AI Messages',
            description: 'Remove the daily limit of 5 messages and chat all day.',
        },
        {
            icon: 'bolt.fill' as const,
            title: 'Faster Responses',
            description: 'Get priority access to our most powerful models.',
        },
        {
            icon: 'clock.fill' as const,
            title: 'Extended Memory',
            description: 'Your assistant remembers more context for longer.',
        },
        {
            icon: 'lock.fill' as const,
            title: 'Advanced Privacy',
            description: 'Enhanced encryption and private data handling.',
        },
    ];

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.tint} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

            {/* Background Gradient Effect */}
            <View style={[styles.backgroundGlow, { backgroundColor: colors.tint + '10' }]} />

            <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.6 : 1 }]}
                >
                    <IconSymbol name="xmark" size={24} color={colors.textSecondary} />
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + Spacing.xl }]}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View entering={FadeInUp.delay(100).duration(600)} style={styles.hero}>
                    <Image
                        source={require('../assets/images/pro-icon.png')}
                        style={styles.proHeroIcon}
                        resizeMode="contain"
                    />
                    <Text style={[styles.title, { color: colors.text }]}>Unlock BackForge AI Pro</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Experience the full power of your personal AI assistant.
                    </Text>
                </Animated.View>

                <View style={styles.featuresList}>
                    {features.map((feature, index) => (
                        <Animated.View
                            key={feature.title}
                            entering={FadeInDown.delay(200 + index * 100).duration(500)}
                            style={styles.featureItem}
                        >
                            <View style={[styles.featureIcon, { backgroundColor: colors.tint + '10' }]}>
                                <IconSymbol name={feature.icon} size={20} color={colors.tint} />
                            </View>
                            <View style={styles.featureText}>
                                <Text style={[styles.featureTitle, { color: colors.text }]}>{feature.title}</Text>
                                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                                    {feature.description}
                                </Text>
                            </View>
                        </Animated.View>
                    ))}
                </View>

                <Animated.View entering={FadeIn.delay(700).duration(800)} style={styles.pricingSection}>
                    {offering?.availablePackages.map((pkg) => (
                        <GlassCard
                            key={pkg.identifier}
                            style={[styles.priceCard, pkg.packageType === 'ANNUAL' && styles.popularCard]}
                            overflowVisible={pkg.packageType === 'ANNUAL'}
                        >
                            {pkg.packageType === 'ANNUAL' && (
                                <View style={styles.popularBadge}>
                                    <Text style={styles.popularBadgeText}>BEST VALUE</Text>
                                </View>
                            )}
                            <View style={styles.priceInfo}>
                                <View style={styles.pkgTextWrapper}>
                                    <Text style={[styles.pkgType, { color: colors.text }]}>
                                        {pkg.packageType === 'MONTHLY' ? 'Pro Monthly' :
                                            pkg.packageType === 'ANNUAL' ? 'Pro Annual' :
                                                pkg.packageType === 'LIFETIME' ? 'Pro Lifetime' : 'Pro Subscription'}
                                    </Text>
                                    <Text style={[styles.pkgFeature, { color: colors.textSecondary }]}>
                                        {pkg.packageType === 'ANNUAL' ? 'Save 40% annually' :
                                            pkg.packageType === 'LIFETIME' ? 'One-time payment' : 'Full access to all features'}
                                    </Text>
                                </View>
                                <Text style={[styles.price, { color: colors.text }]}>{pkg.product.priceString}</Text>
                            </View>
                            <GlassButton
                                title={isPurchasing ? 'Processing...' : 'Subscribe Now'}
                                onPress={() => handlePurchase(pkg)}
                                variant="primary"
                                disabled={isPurchasing}
                            />
                        </GlassCard>
                    ))}

                    {(!offering || offering.availablePackages.length === 0) && (
                        <>
                            <GlassCard style={styles.priceCard}>
                                <View style={styles.priceInfo}>
                                    <View style={styles.pkgTextWrapper}>
                                        <Text style={[styles.pkgType, { color: colors.text }]}>Pro Monthly</Text>
                                        <Text style={[styles.pkgFeature, { color: colors.textSecondary }]}>Full access, billed monthly</Text>
                                    </View>
                                    <Text style={[styles.price, { color: colors.text }]}>$9.99/mo</Text>
                                </View>
                                <GlassButton
                                    title="Subscribe (Demo)"
                                    onPress={async () => {
                                        haptics.success();
                                        await setDemoPro(true);
                                        router.back();
                                    }}
                                    variant="primary"
                                />
                            </GlassCard>

                            <GlassCard style={[styles.priceCard, styles.popularCard]} overflowVisible={true}>
                                <View style={styles.popularBadge}>
                                    <Text style={styles.popularBadgeText}>BEST VALUE</Text>
                                </View>
                                <View style={styles.priceInfo}>
                                    <View style={styles.pkgTextWrapper}>
                                        <Text style={[styles.pkgType, { color: colors.text }]}>Pro Annual</Text>
                                        <Text style={[styles.pkgFeature, { color: colors.textSecondary }]}>Save 40% annually</Text>
                                    </View>
                                    <Text style={[styles.price, { color: colors.text }]}>$69.99/yr</Text>
                                </View>
                                <GlassButton
                                    title="Subscribe (Demo)"
                                    onPress={async () => {
                                        haptics.success();
                                        await setDemoPro(true);
                                        router.back();
                                    }}
                                    variant="primary"
                                />
                            </GlassCard>
                        </>
                    )}

                    <Pressable onPress={handleRestore} style={styles.restoreButton}>
                        <Text style={[styles.restoreText, { color: colors.tint }]}>Restore Purchases</Text>
                    </Pressable>
                </Animated.View>

                <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                    Recurring billing. Cancel anytime in App Store settings.
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundGlow: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 400,
        height: 400,
        borderRadius: 200,
        opacity: 0.5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: Spacing.lg,
        zIndex: 10,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingHorizontal: Spacing.xl,
        paddingTop: Spacing.md,
    },
    hero: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
        gap: Spacing.sm,
    },
    proHeroIcon: {
        width: 140,
        height: 140,
        borderRadius: 70,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#FFD700' + '40', // Subtle gold border
        marginBottom: Spacing.sm,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: '85%',
    },
    featuresList: {
        gap: Spacing.lg,
        marginBottom: Spacing.xl,
    },
    featureItem: {
        flexDirection: 'row',
        gap: Spacing.md,
        alignItems: 'center',
    },
    featureIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    featureDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
    pricingSection: {
        gap: Spacing.lg,
        paddingTop: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    priceCard: {
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    priceInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pkgTextWrapper: {
        flex: 1,
        marginRight: Spacing.md,
    },
    pkgType: {
        fontSize: 18,
        fontWeight: '800',
    },
    pkgFeature: {
        fontSize: 13,
        marginTop: 2,
        opacity: 0.8,
    },
    price: {
        fontSize: 20,
        fontWeight: '700',
    },
    popularCard: {
        borderColor: '#FFD700',
        borderWidth: 1.5,
    },
    popularBadge: {
        position: 'absolute',
        top: -14,
        right: 16,
        backgroundColor: '#FFD700',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        zIndex: 10,
        ...Shadows.subtle,
    },
    popularBadgeText: {
        color: '#000000',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    restoreButton: {
        alignItems: 'center',
        marginTop: Spacing.sm,
    },
    restoreText: {
        fontSize: 14,
        fontWeight: '600',
    },
    footerText: {
        fontSize: 12,
        textAlign: 'center',
        opacity: 0.6,
    },
});
