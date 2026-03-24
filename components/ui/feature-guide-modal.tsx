import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type FeatureStep = {
    icon: string;
    title: string;
    description: string;
};

type FeatureGuideData = {
    emoji: string;
    title: string;
    subtitle: string;
    description: string;
    steps: FeatureStep[];
    proTip: string;
    gradientColors: readonly [string, string];
};

const FEATURE_GUIDES: Record<string, FeatureGuideData> = {
    capture: {
        emoji: '💬',
        title: 'Capture',
        subtitle: 'Your thoughts, instantly saved',
        description:
            'BackForge AI captures everything you say — tasks, ideas, follow-ups — and automatically organizes them. Just talk or type naturally, and BackForge AI does the rest.',
        steps: [
            {
                icon: 'mic.fill',
                title: 'Speak or Type',
                description: 'Open the chat and tell BackForge AI what\'s on your mind. Use natural language — no special formatting needed.',
            },
            {
                icon: 'brain.head.profile',
                title: 'AI Understands Intent',
                description: 'The AI analyzes your input and automatically classifies it as a task, follow-up, or note.',
            },
            {
                icon: 'tray.full.fill',
                title: 'Auto-Organized',
                description: 'Your item is saved to memory with the right urgency, type, and due date — ready for your daily brief.',
            },
        ],
        proTip: 'Try saying "Remind me to call John tomorrow about the project update" — BackForge AI will create a follow-up with the right due date.',
        gradientColors: ['#4F46E5', '#4338CA'],
    },
    brief: {
        emoji: '📋',
        title: 'Daily Brief',
        subtitle: 'Your day, prioritized',
        description:
            'Every day, BackForge AI curates a prioritized view of what needs your attention. No more digging through lists — your most important items surface automatically.',
        steps: [
            {
                icon: 'wand.and.stars',
                title: 'Smart Prioritization',
                description: 'BackForge AI analyzes urgency, due dates, and context to rank your items from most to least important.',
            },
            {
                icon: 'clock',
                title: 'Time-Aware',
                description: 'Items approaching their due dates rise to the top. Overdue items get flagged with high urgency.',
            },
            {
                icon: 'hand.tap',
                title: 'Quick Actions',
                description: 'Mark items done, snooze for later, or draft a response — all from the brief without switching apps.',
            },
        ],
        proTip: 'Check your Daily Brief first thing in the morning to start your day focused on what matters most.',
        gradientColors: ['#2563EB', '#1D4ED8'],
    },
    memory: {
        emoji: '🧠',
        title: 'Memory',
        subtitle: 'Nothing gets forgotten',
        description:
            'BackForge AI\'s memory keeps track of every task, note, and follow-up you\'ve ever captured. Search, filter, and revisit anything at any time.',
        steps: [
            {
                icon: 'magnifyingglass',
                title: 'Instant Search',
                description: 'Find any item instantly by searching with keywords. BackForge AI searches across titles and context.',
            },
            {
                icon: 'line.3.horizontal.decrease',
                title: 'Smart Filters',
                description: 'Filter by status (Open, Completed) to focus on what\'s active or review what you\'ve accomplished.',
            },
            {
                icon: 'arrow.counterclockwise',
                title: 'Full History',
                description: 'Every item is timestamped and preserved. Re-open completed items or review your past decisions.',
            },
        ],
        proTip: 'Use the "Completed" filter at the end of the week to review everything you accomplished — it\'s a great productivity boost!',
        gradientColors: ['#E11D48', '#BE123C'],
    },
    smart: {
        emoji: '🪄',
        title: 'Smart Actions',
        subtitle: 'Context-aware intelligence',
        description:
            'BackForge AI doesn\'t just store your items — it takes action. Create Linear issues, GitHub issues, and draft Gmail replies directly from your conversations.',
        steps: [
            {
                icon: 'ticket.fill',
                title: 'Linear Issues',
                description: 'BackForge AI can create Linear issues with the right team, priority, and labels — just describe what you need.',
            },
            {
                icon: 'arrow.triangle.branch',
                title: 'GitHub Issues',
                description: 'Create GitHub issues in any of your repositories directly from a conversation with BackForge AI.',
            },
            {
                icon: 'envelope.fill',
                title: 'Gmail Drafts',
                description: 'Draft email replies with the right tone. BackForge AI understands context and crafts professional responses.',
            },
        ],
        proTip: 'Try saying "Create a Linear issue for the login bug on the mobile app" — BackForge AI will draft the issue and let you review before submitting.',
        gradientColors: ['#059669', '#047857'],
    },
};

interface FeatureGuideModalProps {
    visible: boolean;
    featureId: string | null;
    onClose: () => void;
}

export function FeatureGuideModal({ visible, featureId, onClose }: FeatureGuideModalProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const insets = useSafeAreaInsets();

    if (!featureId || !FEATURE_GUIDES[featureId]) return null;

    const guide = FEATURE_GUIDES[featureId];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header gradient */}
                <LinearGradient
                    colors={guide.gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.header, { paddingTop: insets.top + Spacing.md }]}
                >
                    {/* Close button */}
                    <Pressable
                        onPress={onClose}
                        style={({ pressed }) => [
                            styles.closeButton,
                            { opacity: pressed ? 0.7 : 1 },
                        ]}
                    >
                        <IconSymbol name="xmark" size={18} color="#FFFFFF" />
                    </Pressable>

                    <Animated.View entering={FadeInUp.delay(100).duration(500)}>
                        <Text style={styles.headerEmoji}>{guide.emoji}</Text>
                        <Text style={styles.headerTitle}>{guide.title}</Text>
                        <Text style={styles.headerSubtitle}>{guide.subtitle}</Text>
                    </Animated.View>
                </LinearGradient>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingBottom: insets.bottom + Spacing.xl },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Description */}
                    <Animated.View entering={FadeIn.delay(200).duration(400)}>
                        <Text style={[styles.description, { color: colors.text }]}>
                            {guide.description}
                        </Text>
                    </Animated.View>

                    {/* Steps */}
                    <Animated.View entering={FadeInDown.delay(300).duration(400)}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>How it works</Text>
                    </Animated.View>

                    {guide.steps.map((step, index) => (
                        <Animated.View
                            key={index}
                            entering={FadeInDown.delay(400 + index * 100).duration(400)}
                        >
                            <View
                                style={[
                                    styles.stepCard,
                                    {
                                        backgroundColor: colors.backgroundSecondary,
                                        borderColor: colors.border,
                                    },
                                ]}
                            >
                                <View style={styles.stepRow}>
                                    <View
                                        style={[
                                            styles.stepIconCircle,
                                            { backgroundColor: guide.gradientColors[0] + '15' },
                                        ]}
                                    >
                                        <Text style={styles.stepNumber}>{index + 1}</Text>
                                    </View>
                                    <View style={styles.stepContent}>
                                        <View style={styles.stepHeader}>
                                            <IconSymbol
                                                name={step.icon as any}
                                                size={16}
                                                color={guide.gradientColors[0]}
                                            />
                                            <Text style={[styles.stepTitle, { color: colors.text }]}>
                                                {step.title}
                                            </Text>
                                        </View>
                                        <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
                                            {step.description}
                                        </Text>
                                    </View>
                                </View>

                                {/* Connector line */}
                                {index < guide.steps.length - 1 && (
                                    <View style={[styles.connector, { backgroundColor: colors.border }]} />
                                )}
                            </View>
                        </Animated.View>
                    ))}

                    {/* Pro tip */}
                    <Animated.View entering={FadeInDown.delay(700).duration(400)}>
                        <LinearGradient
                            colors={[guide.gradientColors[0] + '10', guide.gradientColors[1] + '08']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[styles.proTipCard, { borderColor: guide.gradientColors[0] + '30' }]}
                        >
                            <View style={styles.proTipHeader}>
                                <Text style={styles.proTipEmoji}>💡</Text>
                                <Text style={[styles.proTipLabel, { color: guide.gradientColors[0] }]}>
                                    Pro Tip
                                </Text>
                            </View>
                            <Text style={[styles.proTipText, { color: colors.text }]}>
                                {guide.proTip}
                            </Text>
                        </LinearGradient>
                    </Animated.View>

                    {/* Try it button */}
                    <Animated.View entering={FadeInDown.delay(800).duration(400)}>
                        <Pressable
                            onPress={onClose}
                            style={({ pressed }) => [
                                styles.tryButton,
                                { opacity: pressed ? 0.9 : 1 },
                            ]}
                        >
                            <LinearGradient
                                colors={guide.gradientColors}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.tryButtonGradient}
                            >
                                <Text style={styles.tryButtonText}>Got it!</Text>
                            </LinearGradient>
                        </Pressable>
                    </Animated.View>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-end',
        marginBottom: Spacing.md,
    },
    headerEmoji: {
        fontSize: 48,
        marginBottom: Spacing.sm,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
        fontWeight: '500',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: Spacing.lg,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '400',
        marginBottom: Spacing.lg,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: Spacing.md,
        letterSpacing: -0.3,
    },
    stepCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    stepIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm,
        marginTop: 2,
    },
    stepNumber: {
        fontSize: 15,
        fontWeight: '800',
        color: '#4F46E5',
    },
    stepContent: {
        flex: 1,
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    stepTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    stepDescription: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '400',
    },
    connector: {
        width: 2,
        height: 12,
        marginLeft: 17,
        marginTop: Spacing.xs,
    },
    proTipCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: Spacing.md,
        marginTop: Spacing.md,
        marginBottom: Spacing.lg,
    },
    proTipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    proTipEmoji: {
        fontSize: 18,
        marginRight: 8,
    },
    proTipLabel: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    proTipText: {
        fontSize: 14,
        lineHeight: 21,
        fontWeight: '400',
    },
    tryButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    tryButtonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tryButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});
