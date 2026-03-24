import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { DailyBriefItem, Urgency } from '@/types/api';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from 'react-native';
import Animated, { 
    FadeInDown, 
    useAnimatedStyle, 
    useSharedValue, 
    withSpring 
} from 'react-native-reanimated';

interface BriefItemProps {
    item: DailyBriefItem;
    onDone: () => void;
    onSnooze: () => void;
    onDraft: () => void;
    style?: StyleProp<ViewStyle>;
    delay?: number;
}

function getTypeIcon(type: string): React.ComponentProps<typeof IconSymbol>['name'] {
    switch (type) {
        case 'task':
            return 'checkmark.circle';
        case 'follow_up':
            return 'bubble.left';
        case 'note':
            return 'doc.text';
        default:
            return 'list.bullet.rectangle'; // fallback
    }
}

function getUrgencyInfo(urgency: Urgency, colors: typeof Colors.light) {
    switch (urgency) {
        case 'high':
            return { color: colors.urgencyHigh, label: 'High' };
        case 'medium':
            return { color: colors.urgencyMedium, label: 'Medium' };
        case 'low':
        default:
            return { color: colors.urgencyLow, label: 'Low' };
    }
}

export function BriefItem({
    item,
    onDone,
    onSnooze,
    onDraft,
    style,
    delay = 0,
}: BriefItemProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const urgencyInfo = getUrgencyInfo(item.urgency, colors);

    const scale = useSharedValue(1);

    const animatedContainerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    const handlePressAction = async (action: () => void) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        action();
    };

    return (
        <Animated.View
            entering={FadeInDown.delay(delay).duration(400).springify()}
            style={[style, animatedContainerStyle]}
        >
            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={({ pressed }) => [
                    styles.container,
                    { 
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                    },
                    Shadows.glass
                ]}
            >
                {/* Glow Background for Urgency */}
                <View style={[styles.urgencyGlow, { backgroundColor: urgencyInfo.color, opacity: 0.03 }]} />
                
                <View style={styles.content}>
                    {/* Header: Type icon + Label */}
                    <View style={styles.header}>
                        <View style={styles.typeRow}>
                            <View style={[styles.typeIconContainer, { backgroundColor: colors.border }]}>
                                <IconSymbol name={getTypeIcon(item.type)} size={11} color={colors.tint} />
                            </View>
                            <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>
                                {item.type === 'follow_up' ? 'Action Required' : item.type}
                            </Text>
                        </View>
                        <View style={[styles.urgencyTag, { backgroundColor: urgencyInfo.color + '15' }]}>
                            <View style={[styles.urgencyDot, { backgroundColor: urgencyInfo.color }]} />
                            <Text style={[styles.urgencyLabel, { color: urgencyInfo.color }]}>
                                {urgencyInfo.label}
                            </Text>
                        </View>
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                        {item.title}
                    </Text>

                    {/* Footer: Date + Actions */}
                    <View style={styles.footer}>
                        <View style={styles.metaRow}>
                            {item.dueAt ? (
                                <View style={styles.dateRow}>
                                    <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                                        Due {new Date(item.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.timeTag}>
                                    <Text style={[styles.timeTagText, { color: colors.textSecondary }]}>Today</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.actions}>
                            <Pressable
                                onPress={() => handlePressAction(onSnooze)}
                                style={({ pressed }) => [
                                    styles.actionIcon,
                                    { backgroundColor: pressed ? colors.border : 'transparent' }
                                ]}
                            >
                                <IconSymbol name="clock" size={16} color={colors.textSecondary} />
                            </Pressable>

                            <Pressable
                                onPress={() => handlePressAction(onDraft)}
                                style={({ pressed }) => [
                                    styles.actionIcon,
                                    { backgroundColor: pressed ? colors.border : 'transparent' }
                                ]}
                            >
                                <IconSymbol name="paperplane.fill" size={16} color={colors.tint} />
                            </Pressable>

                            <Pressable
                                onPress={() => handlePressAction(onDone)}
                                style={({ pressed }) => [
                                    styles.doneButton,
                                    { 
                                        backgroundColor: colors.tint, 
                                        opacity: pressed ? 0.9 : 1,
                                    }
                                ]}
                            >
                                <IconSymbol name="checkmark" size={14} color="#FFFFFF" />
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 24,
        flexDirection: 'row',
        overflow: 'hidden',
        borderWidth: 1,
    },
    urgencyGlow: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    typeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    typeIconContainer: {
        width: 24,
        height: 24,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    typeLabel: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    urgencyTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    urgencyDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginRight: 6,
    },
    urgencyLabel: {
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        lineHeight: 26,
        marginBottom: 20,
        letterSpacing: -0.3,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metaRow: {
        flex: 1,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    timeTag: {
        backgroundColor: 'rgba(0,0,0,0.03)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    timeTagText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    doneButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 4,
    },
});
