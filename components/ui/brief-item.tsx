import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing } from '@/constants/theme';
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
import Animated, { FadeInDown } from 'react-native-reanimated';

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

    const handlePress = async (action: () => void) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        action();
    };

    return (
        <Animated.View
            entering={FadeInDown.delay(delay).duration(400).springify()}
            style={style}
        >
            <View style={[styles.container, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                {/* Left accent bar */}
                <View style={[styles.accentBar, { backgroundColor: urgencyInfo.color }]} />

                <View style={styles.content}>
                    {/* Header: Type icon + Label + Urgency */}
                    <View style={styles.header}>
                        <View style={styles.typeRow}>
                            <IconSymbol name={getTypeIcon(item.type)} size={14} color={colors.textSecondary} style={styles.typeIcon} />
                            <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>
                                {item.type === 'follow_up' ? 'Follow-up' : item.type}
                            </Text>
                        </View>
                        <View style={[styles.urgencyBadge, { backgroundColor: urgencyInfo.color + '20' }]}>
                            <Text style={[styles.urgencyText, { color: urgencyInfo.color }]}>
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
                        {item.dueAt ? (
                            <View style={styles.dateRow}>
                                <IconSymbol name="calendar" size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                                <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                                    {new Date(item.dueAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </Text>
                            </View>
                        ) : <View style={{ flex: 1 }} />}

                        <View style={styles.actions}>
                            <Pressable
                                onPress={() => handlePress(onSnooze)}
                                style={({ pressed }) => [
                                    styles.iconButton,
                                    { backgroundColor: pressed ? colors.border : 'transparent' }
                                ]}
                            >
                                <IconSymbol name="clock" size={18} color={colors.textSecondary} />
                            </Pressable>

                            <Pressable
                                onPress={() => handlePress(onDraft)}
                                style={({ pressed }) => [
                                    styles.iconButton,
                                    { backgroundColor: pressed ? colors.border : 'transparent' }
                                ]}
                            >
                                <IconSymbol name="paperplane.fill" size={16} color={colors.tint} />
                            </Pressable>

                            <Pressable
                                onPress={() => handlePress(onDone)}
                                style={({ pressed }) => [
                                    styles.doneButton,
                                    { backgroundColor: colors.background, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }
                                ]}
                            >
                                <Text style={[styles.doneText, { color: colors.text }]}>Done</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        borderRadius: Radius.lg,
        flexDirection: 'row',
        overflow: 'hidden',
    },
    accentBar: {
        width: 4,
    },
    content: {
        flex: 1,
        padding: Spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    typeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    typeIcon: {
        marginRight: 6,
    },
    typeLabel: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    urgencyBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    urgencyText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 15,
        fontWeight: '500',
        lineHeight: 22,
        marginBottom: Spacing.sm,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: Spacing.xs,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    dateText: {
        fontSize: 12,
        fontWeight: '500',
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    iconButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    doneButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        marginLeft: Spacing.xs,
    },
    doneText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
