import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/lib/haptics';
import type {
    ActionType,
    GitHubIssuePayload,
    GitHubRepo,
    GmailDraftPayload,
    LinearContextResponse,
    LinearIssuePayload,
    ProposedAction,
} from '@/types/api';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { IconSymbol } from './icon-symbol';

// ────────────────────── Config ──────────────────────
const ACTION_META: Record<ActionType, { label: string; icon: string; color: string }> = {
    create_linear_issue: { label: 'Linear Issue', icon: 'ticket.fill', color: '#5E6AD2' },
    create_github_issue: { label: 'GitHub Issue', icon: 'arrow.triangle.branch', color: '#24292F' },
    draft_gmail_reply: { label: 'Gmail Draft', icon: 'envelope.fill', color: '#EA4335' },
};

const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
    0: { label: 'None', color: '#94A3B8' },
    1: { label: 'Urgent', color: '#EF4444' },
    2: { label: 'High', color: '#F97316' },
    3: { label: 'Medium', color: '#F59E0B' },
    4: { label: 'Low', color: '#10B981' },
};

// ────────────────────── Props ──────────────────────
interface ActionCardProps {
    action: ProposedAction;
    onApprove: (editedAction: ProposedAction) => void;
    onDismiss?: () => void;
    isExecuting?: boolean;
    linearContext?: LinearContextResponse;
    githubRepos?: GitHubRepo[];
}

export function ActionCard({
    action,
    onApprove,
    onDismiss,
    isExecuting = false,
    linearContext,
    githubRepos,
}: ActionCardProps) {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];
    const meta = ACTION_META[action.type];

    const [isEditing, setIsEditing] = useState(false);
    const [editedPayload, setEditedPayload] = useState({ ...action.payload });

    const updateField = useCallback((key: string, value: string) => {
        setEditedPayload(prev => ({ ...prev, [key]: value }));
    }, []);

    const handleApprove = useCallback(() => {
        haptics.medium();
        onApprove({ ...action, payload: editedPayload });
    }, [action, editedPayload, onApprove]);

    const handleEdit = useCallback(() => {
        haptics.selection();
        setIsEditing(prev => !prev);
    }, []);

    const handleDismiss = useCallback(() => {
        haptics.light();
        onDismiss?.();
    }, [onDismiss]);

    // ── Render helpers ──

    const renderField = (label: string, key: string, value: string | undefined, multiline = false) => (
        <View style={styles.fieldContainer} key={key}>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
            {isEditing ? (
                <TextInput
                    style={[
                        styles.fieldInput,
                        multiline && styles.fieldInputMultiline,
                        {
                            color: colors.text,
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                        },
                    ]}
                    value={value ?? ''}
                    onChangeText={(v) => updateField(key, v)}
                    multiline={multiline}
                    numberOfLines={multiline ? 4 : 1}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    placeholderTextColor={colors.textSecondary}
                />
            ) : (
                <Text style={[styles.fieldValue, { color: colors.text }]} numberOfLines={multiline ? 6 : 2}>
                    {value || '—'}
                </Text>
            )}
        </View>
    );

    const renderPicker = (
        label: string,
        key: string,
        currentValue: string | undefined,
        options: { id: string; name: string }[],
    ) => {
        if (!isEditing) {
            const selected = options.find(o => o.id === currentValue);
            return (
                <View style={styles.fieldContainer} key={key}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
                    <Text style={[styles.fieldValue, { color: colors.text }]}>
                        {selected?.name ?? '—'}
                    </Text>
                </View>
            );
        }

        return (
            <View style={styles.fieldContainer} key={key}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                    {options.map(opt => {
                        const isSelected = opt.id === currentValue;
                        return (
                            <Pressable
                                key={opt.id}
                                onPress={() => {
                                    haptics.selection();
                                    updateField(key, opt.id);
                                }}
                                style={[
                                    styles.chip,
                                    {
                                        backgroundColor: isSelected ? meta.color : colors.background,
                                        borderColor: isSelected ? meta.color : colors.border,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.chipText,
                                        { color: isSelected ? '#FFFFFF' : colors.text },
                                    ]}
                                >
                                    {opt.name}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

    // ── Action-specific fields ──

    const renderLinearFields = () => {
        const p = editedPayload as LinearIssuePayload;
        const teams = linearContext?.teams ?? [];
        const users = linearContext?.users?.filter(u => u.active) ?? [];
        const selectedTeamId = p.teamId;

        // Team-scoped filtering
        const teamProjects = linearContext?.projects?.filter(
            proj => !proj.teams?.nodes?.length || proj.teams.nodes.some(t => t.id === selectedTeamId)
        ) ?? [];
        const teamStates = linearContext?.workflowStates?.filter(
            s => !s.team || s.team.id === selectedTeamId
        ) ?? [];
        const teamCycles = linearContext?.cycles?.filter(
            c => !c.team || c.team.id === selectedTeamId
        ) ?? [];

        const priorityInfo = PRIORITY_LABELS[p.priority ?? 0];

        return (
            <>
                {renderPicker('Team', 'teamId', p.teamId, teams.map(t => ({ id: t.id, name: `${t.key} — ${t.name}` })))}
                {renderField('Title', 'title', p.title)}
                {renderField('Description', 'description', p.description, true)}
                {renderPicker('Assignee', 'assigneeId', p.assigneeId, users.map(u => ({ id: u.id, name: u.displayName || u.name })))}
                <View style={styles.fieldContainer}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Priority</Text>
                    {isEditing ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                            {Object.entries(PRIORITY_LABELS).map(([val, info]) => {
                                const numVal = Number(val);
                                const isSelected = (p.priority ?? 0) === numVal;
                                return (
                                    <Pressable
                                        key={val}
                                        onPress={() => {
                                            haptics.selection();
                                            updateField('priority', val);
                                            setEditedPayload(prev => ({ ...prev, priority: numVal }));
                                        }}
                                        style={[
                                            styles.chip,
                                            {
                                                backgroundColor: isSelected ? info.color : colors.background,
                                                borderColor: isSelected ? info.color : colors.border,
                                            },
                                        ]}
                                    >
                                        <Text style={[styles.chipText, { color: isSelected ? '#FFF' : colors.text }]}>
                                            {info.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    ) : (
                        <View style={[styles.badge, { backgroundColor: priorityInfo.color + '20' }]}>
                            <View style={[styles.badgeDot, { backgroundColor: priorityInfo.color }]} />
                            <Text style={[styles.badgeText, { color: priorityInfo.color }]}>
                                {priorityInfo.label}
                            </Text>
                        </View>
                    )}
                </View>
                {renderPicker('Project', 'projectId', p.projectId, teamProjects.map(proj => ({ id: proj.id, name: proj.name })))}
                {renderPicker('Status', 'stateId', p.stateId, teamStates.map(s => ({ id: s.id, name: s.name })))}
                {renderPicker('Cycle', 'cycleId', p.cycleId, teamCycles.map(c => ({ id: c.id, name: c.name })))}
                {renderField('Due Date', 'dueDate', p.dueDate)}
            </>
        );
    };

    const renderGitHubFields = () => {
        const p = editedPayload as GitHubIssuePayload;
        const repos = githubRepos ?? [];
        return (
            <>
                {renderPicker('Repository', 'repo', p.repo, repos.map(r => ({ id: r.full_name, name: r.full_name })))}
                {renderField('Title', 'title', p.title)}
                {renderField('Body', 'body', p.body, true)}
            </>
        );
    };

    const renderGmailFields = () => {
        const p = editedPayload as GmailDraftPayload;
        return (
            <>
                {renderField('To', 'to', p.to)}
                {renderField('Subject', 'subject', p.subject)}
                {renderField('Body', 'body', p.body, true)}
            </>
        );
    };

    const renderActionFields = () => {
        switch (action.type) {
            case 'create_linear_issue':
                return renderLinearFields();
            case 'create_github_issue':
                return renderGitHubFields();
            case 'draft_gmail_reply':
                return renderGmailFields();
            default:
                return null;
        }
    };

    // ── Main render ──

    return (
        <Animated.View entering={FadeInDown.duration(350).springify()} style={styles.wrapper}>
            <View
                style={[
                    styles.card,
                    Shadows.glass,
                    {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: meta.color + '30',
                    },
                ]}
            >
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.iconBadge, { backgroundColor: meta.color + '15' }]}>
                            <IconSymbol name={meta.icon as any} size={16} color={meta.color} />
                        </View>
                        <Text style={[styles.headerLabel, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    {onDismiss && (
                        <Pressable onPress={handleDismiss} hitSlop={12}>
                            <IconSymbol name="xmark" size={16} color={colors.textSecondary} />
                        </Pressable>
                    )}
                </View>

                {/* Fields */}
                <View style={styles.fields}>
                    {renderActionFields()}
                </View>

                {/* Action Buttons */}
                <View style={styles.actions}>
                    <Pressable
                        onPress={handleEdit}
                        style={[
                            styles.actionBtn,
                            styles.editBtn,
                            { borderColor: colors.border },
                        ]}
                        disabled={isExecuting}
                    >
                        <IconSymbol
                            name={isEditing ? 'checkmark' : 'pencil'}
                            size={14}
                            color={colors.text}
                        />
                        <Text style={[styles.actionBtnText, { color: colors.text }]}>
                            {isEditing ? 'Done' : 'Edit'}
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={handleApprove}
                        style={[
                            styles.actionBtn,
                            styles.approveBtn,
                            { backgroundColor: meta.color },
                        ]}
                        disabled={isExecuting}
                    >
                        {isExecuting ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <>
                                <IconSymbol name="checkmark.circle.fill" size={14} color="#FFFFFF" />
                                <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>
                                    Approve
                                </Text>
                            </>
                        )}
                    </Pressable>
                </View>
            </View>
        </Animated.View>
    );
}

// ────────────────────── Styles ──────────────────────
const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
    },
    card: {
        borderWidth: 1,
        borderRadius: Radius.lg,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm + 2,
        borderBottomWidth: 1,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    iconBadge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerLabel: {
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    fields: {
        padding: Spacing.md,
        gap: Spacing.sm,
    },
    fieldContainer: {
        gap: 4,
    },
    fieldLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    fieldValue: {
        fontSize: 15,
        lineHeight: 22,
    },
    fieldInput: {
        fontSize: 15,
        lineHeight: 22,
        borderWidth: 1,
        borderRadius: Radius.sm,
        paddingHorizontal: Spacing.sm + 2,
        paddingVertical: Spacing.xs + 2,
    },
    fieldInputMultiline: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    chipScroll: {
        flexGrow: 0,
        marginTop: 2,
    },
    chip: {
        paddingHorizontal: Spacing.sm + 4,
        paddingVertical: Spacing.xs + 2,
        borderRadius: Radius.full,
        borderWidth: 1,
        marginRight: Spacing.xs,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 6,
        paddingHorizontal: Spacing.sm + 2,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.full,
    },
    badgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    badgeText: {
        fontSize: 13,
        fontWeight: '600',
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingBottom: Spacing.md,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs + 2,
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.md,
    },
    editBtn: {
        borderWidth: 1,
        flex: 1,
    },
    approveBtn: {
        flex: 2,
    },
    actionBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
