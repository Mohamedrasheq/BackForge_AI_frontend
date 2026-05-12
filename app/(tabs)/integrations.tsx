import { Header } from '@/components/ui/header';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/lib/haptics';
import { useTabBar } from '@/lib/tab-bar-context';
import {
    connectService,
    disconnectService,
    getCredentialsStatus,
    getProStatus,
} from '@/services/api';
import { isProActive } from '@/services/revenuecat';
import { useUser } from '@clerk/clerk-expo';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ─── Service branding config ────────────────────────────────────────
type ServiceConfig = {
    emoji: string;
    icon: string;
    gradientColors: readonly [string, string];
    brandColor: string;
    instruction: string;
    capabilities: string[];
    limitations: string[];
};

const SERVICE_CONFIG: Record<string, ServiceConfig> = {
    reminder: {
        emoji: '⏰',
        icon: 'bell.badge.fill',
        gradientColors: ['#F59E0B', '#D97706'],
        brandColor: '#F59E0B',
        instruction: '',
        capabilities: ['Schedule reminders', 'Push notifications', 'Smart time suggestions', 'Recurring reminders'],
        limitations: ['No location-based reminders'],
    },
    github: {
        emoji: '🐙',
        icon: 'terminal',
        gradientColors: ['#24292F', '#444D56'],
        brandColor: '#24292F',
        instruction: 'Go to GitHub → Settings → Developer settings → Personal access tokens → Generate new token. Select the scopes you need.',
        capabilities: ['Create issues', 'List repositories', 'Draft PR descriptions'],
        limitations: ['No actual PR creation', 'No labels or assignees', 'No code browsing', 'No merge or branches'],
    },
    linear: {
        emoji: '📐',
        icon: 'square.stack.3d.up.fill',
        gradientColors: ['#5E6AD2', '#8B5CF6'],
        brandColor: '#5E6AD2',
        instruction: 'Go to Linear → Settings → API → Personal API keys → Create key. Copy the key and paste it here.',
        capabilities: ['Create issues (full fields)', 'Fetch workspace context'],
        limitations: ['No update or delete issues', 'No comments', 'No search issues'],
    },
    gmail: {
        emoji: '📧',
        icon: 'mail.fill',
        gradientColors: ['#EA4335', '#FBBC04'],
        brandColor: '#EA4335',
        instruction: 'Go to Google Account → Security → App Passwords → Generate a new app password for BackForge AI.',
        capabilities: ['Create draft emails', 'List recent emails'],
        limitations: ['No sending emails', 'No reading full body', 'No attachments', 'No CC/BCC'],
    },
    notion: {
        emoji: '📝',
        icon: 'doc.text.fill',
        gradientColors: ['#000000', '#434343'],
        brandColor: '#000000',
        instruction: 'Go to Notion → Settings → Connections → Develop or manage integrations → Create new integration → Copy the secret.',
        capabilities: ['Create pages', 'Search workspace', 'List databases', 'Add database entries'],
        limitations: ['No rich blocks (toggles, tables)', 'No update or delete', 'No reading page content'],
    },
    slack: {
        emoji: '💬',
        icon: 'bubble.left.and.bubble.right.fill',
        gradientColors: ['#4A154B', '#7C3085'],
        brandColor: '#4A154B',
        instruction: 'Go to api.slack.com → Create New App → OAuth & Permissions → Install to Workspace → Copy Bot Token.',
        capabilities: ['Send messages', 'List channels'],
        limitations: ['No message history', 'No file uploads', 'No reactions', 'No channel creation'],
    },
    jira: {
        emoji: '🎫',
        icon: 'ticket.fill',
        gradientColors: ['#0052CC', '#2684FF'],
        brandColor: '#0052CC',
        instruction: 'Go to Atlassian → Account Settings → Security → API tokens → Create API token.',
        capabilities: ['Create issues', 'Search via JQL', 'List projects', 'Add comments'],
        limitations: ['No transitions or updates', 'No sprint management', 'No attachments'],
    },
    trello: {
        emoji: '📋',
        icon: 'square.grid.2x2.fill',
        gradientColors: ['#0079BF', '#00C2E0'],
        brandColor: '#0079BF',
        instruction: 'Go to trello.com/power-ups/admin → API Key → Generate Token for BackForge AI.',
        capabilities: ['Create cards', 'Move cards', 'List boards & cards', 'Get board lists'],
        limitations: ['No deleting cards', 'No comments', 'No checklists', 'No attachments'],
    },
    asana: {
        emoji: '🎯',
        icon: 'circle.circle',
        gradientColors: ['#F06595', '#FC8C5A'],
        brandColor: '#F06595',
        instruction: 'Go to Asana → My Settings → Apps → Developer Apps → Create Personal Access Token.',
        capabilities: ['Create tasks', 'Search tasks', 'Complete tasks', 'Add comments', 'List projects'],
        limitations: ['No deleting tasks', 'No creating projects', 'No subtasks', 'No custom fields'],
    },
    todoist: {
        emoji: '✅',
        icon: 'checkmark.seal.fill',
        gradientColors: ['#DB4437', '#E57368'],
        brandColor: '#DB4437',
        instruction: 'Go to Todoist → Settings → Integrations → Developer → Copy your API token.',
        capabilities: ['Create tasks', 'Complete tasks', 'List tasks with filters', 'Create projects', 'List projects'],
        limitations: ['No deleting tasks', 'No sections', 'No subtasks', 'No reminders'],
    },
    confluence: {
        emoji: '📖',
        icon: 'book.closed.fill',
        gradientColors: ['#172B4D', '#344563'],
        brandColor: '#172B4D',
        instruction: 'Go to Atlassian → Account Settings → Security → API tokens → Create API token.',
        capabilities: ['Create wiki pages', 'Search via CQL', 'List spaces', 'Read page content'],
        limitations: ['No update or delete pages', 'No attachments', 'No comments', 'Content truncated to 3000 chars'],
    },
    discord: {
        emoji: '🎮',
        icon: 'gamecontroller.fill',
        gradientColors: ['#5865F2', '#7289DA'],
        brandColor: '#5865F2',
        instruction: 'Go to Discord Developer Portal → Applications → New Application → Bot → Copy Token.',
        capabilities: ['Send messages', 'List servers', 'List channels', 'Create threads'],
        limitations: ['No message history', 'No embeds', 'No file uploads', 'No voice channels'],
    },
    calendar: {
        emoji: '📅',
        icon: 'calendar.badge.plus',
        gradientColors: ['#0D9488', '#5EEAD4'],
        brandColor: '#0D9488',
        instruction: 'Go to Google Calendar → Settings → Integrate Calendar → Copy API key.',
        capabilities: ['Create events', 'List upcoming events', 'Find free time slots'],
        limitations: ['No update or delete events', 'No recurring events', 'No multiple calendars', 'No RSVP management'],
    },
};

const DEFAULT_CONFIG: ServiceConfig = {
    emoji: '🔗',
    icon: 'link',
    gradientColors: ['#4F46E5', '#6366F1'] as const,
    brandColor: '#4F46E5',
    instruction: 'Check the service\'s developer settings for API keys or tokens.',
    capabilities: [],
    limitations: [],
};

function getServiceConfig(name: string) {
    const key = Object.keys(SERVICE_CONFIG).find(k => name.toLowerCase().includes(k));
    return key ? SERVICE_CONFIG[key] : DEFAULT_CONFIG;
}

// ─── Types ──────────────────────────────────────────────────────────
type ServiceStatus = {
    service: string;
    metadata: any;
    connected_at: string;
};

type AvailableService = {
    name: string;
    displayName: string;
    description: string;
    credentialFields: Array<{
        key: string;
        label: string;
        type: string;
        required?: boolean;
        helpUrl?: string;
    }>;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function IntegrationsScreen() {
    const { user } = useUser();
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme];
    const insets = useSafeAreaInsets();
    const { handleScroll } = useTabBar();

    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [connectedServices, setConnectedServices] = useState<ServiceStatus[]>([]);
    const [availableServices, setAvailableServices] = useState<AvailableService[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'connected' | 'not_connected'>('all');
    const [isProMember, setIsProMember] = useState(false);
    const router = useRouter();

    // Connection Modal State
    const [selectedService, setSelectedService] = useState<AvailableService | null>(null);
    const [credentials, setCredentials] = useState<Record<string, string>>({});
    const [isConnecting, setIsConnecting] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);

    const fetchStatus = useCallback(async () => {
        if (!user) return;
        try {
            const data = await getCredentialsStatus(user.id);
            setConnectedServices(data.connected || []);
            setAvailableServices(data.all || data.available || [] as any);
        } catch (err) {
            console.error('[Integrations] Fetch failed:', err);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    useFocusEffect(
        React.useCallback(() => {
            const checkPro = async () => {
                const sdkPro = await isProActive();
                const dbPro = user?.id ? await getProStatus(user.id) : false;
                setIsProMember(sdkPro || dbPro);
            };
            checkPro();
        }, [user?.id])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchStatus();
    }, [fetchStatus]);

    const handleConnectPress = (service: AvailableService) => {
        // Restricted services for free users
        const isRestricted = !['github'].includes(service.name.toLowerCase());
        
        if (isRestricted && !isProMember) {
            haptics.medium();
            router.push('/paywall');
            return;
        }

        haptics.selection();
        setSelectedService(service);
        setCredentials({});
        setFocusedField(null);
        setModalVisible(true);
    };

    const handleModalClose = useCallback(() => {
        setModalVisible(false);
        setSelectedService(null);
        setCredentials({});
        setFocusedField(null);
    }, []);

    const handleDisconnect = (serviceName: string) => {
        if (!user) return;
        setDisconnectTarget(serviceName);
    };

    const confirmDisconnect = async () => {
        if (!user || !disconnectTarget) return;
        haptics.medium();
        try {
            await disconnectService({ userId: user.id, service: disconnectTarget });
            haptics.success();
            fetchStatus();
        } catch (err: any) {
            haptics.error();
            Alert.alert(
                'Disconnect Failed',
                err.message || 'Could not disconnect the service. Please try again.',
            );
        } finally {
            setDisconnectTarget(null);
        }
    };

    const submitConnection = async () => {
        if (!user || !selectedService) return;

        const missing = selectedService.credentialFields
            .filter(f => f.required && !credentials[f.key])
            .map(f => f.label);

        if (missing.length > 0) {
            Alert.alert('Missing Fields', `Please fill in: ${missing.join(', ')}`);
            return;
        }

        setIsConnecting(true);
        haptics.medium();

        try {
            await connectService({
                userId: user.id,
                service: selectedService.name,
                credentials,
            });
            haptics.success();
            handleModalClose();
            fetchStatus();
        } catch (err: any) {
            Alert.alert('Connection Failed', err.message);
            haptics.error();
        } finally {
            setIsConnecting(false);
        }
    };

    // ─── Gradient Service Card ──────────────────────────────────────
    const renderService = ({ item }: { item: AvailableService }) => {
        const isBuiltIn = item.name.toLowerCase() === 'reminder';
        const isConnected = isBuiltIn || connectedServices.some(s => s.service.toLowerCase() === item.name.toLowerCase());
        const isRestricted = !['github'].includes(item.name.toLowerCase()) && !isBuiltIn;
        const isLocked = !isConnected && !isProMember && isRestricted;
        
        const connectionInfo = connectedServices.find(s => s.service.toLowerCase() === item.name.toLowerCase());
        const config = getServiceConfig(item.name);

        return (
            <View style={styles.cardContainer}>
                <Pressable
                    onPress={() => isBuiltIn ? null : (isConnected ? handleDisconnect(item.name) : handleConnectPress(item))}
                    style={({ pressed }) => [
                        { transform: [{ scale: pressed ? 0.97 : 1 }] },
                    ]}
                >
                    <LinearGradient
                        colors={isConnected
                            ? [config.gradientColors[0], config.gradientColors[1]]
                            : [colors.backgroundSecondary, colors.backgroundSecondary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                            styles.serviceCard,
                            !isConnected && { borderWidth: 1, borderColor: colors.border },
                            isLocked && { opacity: 0.8 },
                        ]}
                    >
                        {/* Top Row: Emoji + Status */}
                        <View style={styles.cardTopRow}>
                            <View style={[
                                styles.emojiContainer,
                                { backgroundColor: isConnected ? 'rgba(255,255,255,0.2)' : config.brandColor + '15' }
                            ]}>
                                <Text style={styles.cardEmoji}>{config.emoji}</Text>
                            </View>
                            {isConnected ? (
                                <View style={styles.linkedBadge}>
                                    <View style={styles.linkedDot} />
                                    <Text style={styles.linkedText}>Linked</Text>
                                </View>
                            ) : isLocked ? (
                                <View style={[styles.connectBadge, { backgroundColor: colors.textSecondary + '15' }]}>
                                    <IconSymbol name="lock.fill" size={12} color={colors.textSecondary} />
                                    <Text style={[styles.connectBadgeText, { color: colors.textSecondary }]}>Pro</Text>
                                </View>
                            ) : (
                                <View style={[styles.connectBadge, { backgroundColor: config.brandColor + '15' }]}>
                                    <IconSymbol name="plus" size={12} color={config.brandColor} />
                                    <Text style={[styles.connectBadgeText, { color: config.brandColor }]}>Connect</Text>
                                </View>
                            )}
                        </View>

                        {/* Title + Description */}
                        <Text style={[
                            styles.cardTitle,
                            { color: isConnected ? '#FFFFFF' : colors.text }
                        ]}>
                            {item.displayName}
                        </Text>
                        <Text
                            style={[
                                styles.cardDescription,
                                { color: isConnected ? 'rgba(255,255,255,0.8)' : colors.textSecondary }
                            ]}
                            numberOfLines={2}
                        >
                            {item.description}
                        </Text>

                        {/* Tool count badge */}
                        {config.capabilities.length > 0 && (
                            <View style={[styles.toolCountBadge, {
                                backgroundColor: isConnected ? 'rgba(255,255,255,0.15)' : config.brandColor + '10',
                            }]}>
                                <IconSymbol name="bolt.fill" size={10} color={isConnected ? 'rgba(255,255,255,0.7)' : config.brandColor} />
                                <Text style={[styles.toolCountText, {
                                    color: isConnected ? 'rgba(255,255,255,0.7)' : config.brandColor,
                                }]}>
                                    {config.capabilities.length} {config.capabilities.length === 1 ? 'tool' : 'tools'}
                                </Text>
                            </View>
                        )}

                        {/* Connected timestamp */}
                        {isConnected && connectionInfo && (
                            <Text style={styles.cardConnectedAt}>
                                Connected {new Date(connectionInfo.connected_at).toLocaleDateString()}
                            </Text>
                        )}
                        {isBuiltIn && (
                            <Text style={styles.cardConnectedAt}>
                                Built-in · Always active
                            </Text>
                        )}
                    </LinearGradient>
                </Pressable>
            </View>
        );
    };

    // Inject built-in Reminder tool into the list
    const BUILT_IN_SERVICES: AvailableService[] = [
        {
            name: 'reminder',
            displayName: 'Reminder',
            description: 'Smart reminders powered by push notifications. Always on.',
            credentialFields: [],
        },
    ];

    const allServices = [
        ...BUILT_IN_SERVICES,
        ...(availableServices || []).filter(s => s.name.toLowerCase() !== 'reminder'),
    ];

    const filteredServices = allServices.filter(s => {
        const matchesSearch = s.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.description.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        if (activeFilter === 'connected') {
            const isBuiltIn = s.name.toLowerCase() === 'reminder';
            return isBuiltIn || connectedServices.some(c => c.service.toLowerCase() === s.name.toLowerCase());
        }
        if (activeFilter === 'not_connected') {
            const isBuiltIn = s.name.toLowerCase() === 'reminder';
            return !isBuiltIn && !connectedServices.some(c => c.service.toLowerCase() === s.name.toLowerCase());
        }
        return true;
    });

    const selectedConfig = selectedService ? getServiceConfig(selectedService.name) : DEFAULT_CONFIG;

    return (
        <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />


            {/* Filter Chips */}
            <View>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.filterContainer}
                >
                    {(['all', 'connected', 'not_connected'] as const).map((filterKey) => {
                        const label = filterKey === 'all' ? 'All' : filterKey === 'connected' ? 'Connected' : 'Not Connected';
                        const isActive = activeFilter === filterKey;
                        return (
                            <Pressable
                                key={filterKey}
                                onPress={() => {
                                    haptics.selection();
                                    setActiveFilter(filterKey);
                                }}
                                style={[
                                    styles.filterChip,
                                    {
                                        backgroundColor: isActive ? colors.tint : `${colors.textSecondary}10`,
                                        borderColor: isActive ? colors.tint : 'transparent',
                                    }
                                ]}
                            >
                                <Text style={[
                                    styles.filterChipText,
                                    { 
                                        color: isActive ? '#FFFFFF' : colors.textSecondary,
                                        fontWeight: isActive ? '700' : '500'
                                    }
                                ]}>
                                    {label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>

            <FlatList
                data={filteredServices}
                keyExtractor={item => item.name}
                renderItem={renderService}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
                ListHeaderComponent={
                    <View style={styles.headerSection}>
                        {/* Connected Apps */}
                        {connectedServices.length > 0 && (
                            <View style={[styles.connectedSection, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                                <View style={styles.connectedSectionHeader}>
                                    <View style={styles.connectedSummaryDot} />
                                    <Text style={[styles.connectedSectionTitle, { color: colors.text }]}>
                                        Connected Apps
                                    </Text>
                                </View>
                                {connectedServices.map((svc) => {
                                    const svcConfig = getServiceConfig(svc.service);
                                    const svcData = availableServices.find(s => s.name.toLowerCase() === svc.service.toLowerCase());
                                    const displayName = svcData?.displayName || (svc.service.charAt(0).toUpperCase() + svc.service.slice(1));
                                    return (
                                        <Pressable
                                            key={`connected-${svc.service}`}
                                            onPress={() => handleDisconnect(svc.service)}
                                            style={({ pressed }) => [
                                                styles.connectedAppRow,
                                                { opacity: pressed ? 0.7 : 1 }
                                            ]}
                                        >
                                            <View style={[styles.connectedAppEmoji, { backgroundColor: svcConfig.brandColor + '15' }]}>
                                                <Text style={{ fontSize: 18 }}>{svcConfig.emoji}</Text>
                                            </View>
                                            <View style={styles.connectedAppInfo}>
                                                <Text style={[styles.connectedAppName, { color: colors.text }]}>{displayName}</Text>
                                                <Text style={[styles.connectedAppDate, { color: colors.textSecondary }]}>
                                                    Since {new Date(svc.connected_at).toLocaleDateString()}
                                                </Text>
                                            </View>
                                            <View style={[styles.connectedAppStatus, { backgroundColor: '#10B98115' }]}>
                                                <View style={styles.connectedSummaryDot} />
                                                <Text style={{ fontSize: 11, fontWeight: '600', color: '#10B981' }}>Active</Text>
                                            </View>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        )}
                    </View>
                }
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
                }
                onScroll={handleScroll}
                scrollEventThrottle={16}
                ListEmptyComponent={
                    isLoading ? (
                        <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 40 }} />
                    ) : (
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No services available.</Text>
                    )
                }
            />

            {/* ─── Disconnect Confirmation ──────────────────────── */}
            <Modal
                visible={!!disconnectTarget}
                animationType="fade"
                transparent
                onRequestClose={() => setDisconnectTarget(null)}
            >
                <View style={styles.confirmOverlay}>
                    <View style={[styles.confirmCard, { backgroundColor: colors.backgroundSecondary }]}>
                        <View style={styles.confirmIconRow}>
                            <View style={[styles.confirmIconCircle, { backgroundColor: '#EF444415' }]}>
                                <IconSymbol name="link" size={24} color="#EF4444" />
                            </View>
                        </View>
                        <Text style={[styles.confirmTitle, { color: colors.text }]}>Disconnect Service</Text>
                        <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
                            Are you sure you want to disconnect{' '}
                            <Text style={{ fontWeight: '700', color: colors.text }}>{disconnectTarget}</Text>?
                        </Text>
                        <View style={styles.confirmButtons}>
                            <Pressable
                                onPress={() => setDisconnectTarget(null)}
                                style={({ pressed }) => [
                                    styles.confirmBtn,
                                    { backgroundColor: colors.border + '40', opacity: pressed ? 0.7 : 1 },
                                ]}
                            >
                                <Text style={[styles.confirmBtnText, { color: colors.text }]}>Cancel</Text>
                            </Pressable>
                            <Pressable
                                onPress={confirmDisconnect}
                                style={({ pressed }) => [
                                    styles.confirmBtn,
                                    styles.confirmBtnDanger,
                                    { opacity: pressed ? 0.7 : 1 },
                                ]}
                            >
                                <Text style={[styles.confirmBtnText, { color: '#FFFFFF' }]}>Disconnect</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ─── Connection Modal ──────────────────────── */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={handleModalClose}
            >
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    {/* Drag Handle */}
                    <View style={styles.modalHandle}>
                        <View style={[styles.modalHandleBar, { backgroundColor: colors.textSecondary + '40' }]} />
                    </View>

                    {/* Service Accent Line */}
                    <View style={[styles.sheetAccent, { backgroundColor: selectedConfig.brandColor }]} />

                    {/* Header */}
                    <View style={styles.sheetHeader}>
                        <View style={styles.sheetHeaderLeft}>
                            <View style={[styles.sheetHeaderEmoji, { backgroundColor: selectedConfig.brandColor + '15' }]}>
                                <Text style={{ fontSize: 22 }}>{selectedConfig.emoji}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.sheetTitle, { color: colors.text }]}>
                                    Link {selectedService?.displayName}
                                </Text>
                                <View style={styles.sheetSecureRow}>
                                    <IconSymbol name="lock.shield" size={12} color={colors.textSecondary} />
                                    <Text style={[styles.sheetSecureText, { color: colors.textSecondary }]}>Secure connection</Text>
                                </View>
                            </View>
                        </View>
                        <Pressable onPress={handleModalClose} style={styles.closeButton}>
                            <IconSymbol name="xmark.circle.fill" size={26} color={colors.textSecondary} />
                        </Pressable>
                    </View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                    >
                        <ScrollView
                            style={styles.sheetScroll}
                            contentContainerStyle={[styles.sheetScrollContent, { paddingBottom: insets.bottom + 40 }]}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Hero Branding Section */}
                            <View style={styles.heroSection}>
                                <LinearGradient
                                    colors={[selectedConfig.gradientColors[0], selectedConfig.gradientColors[1]]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.heroEmojiCircle}
                                >
                                    <Text style={styles.heroEmoji}>{selectedConfig.emoji}</Text>
                                </LinearGradient>
                                <Text style={[styles.heroName, { color: colors.text }]}>
                                    {selectedService?.displayName}
                                </Text>
                                <Text style={[styles.heroDesc, { color: colors.textSecondary }]}>
                                    {selectedService?.description}
                                </Text>
                            </View>

                            {/* ─── Capabilities Section ──────────────────── */}
                            {selectedConfig.capabilities.length > 0 && (
                                <View style={styles.capSection}>
                                    <View style={styles.capSectionHeader}>
                                        <IconSymbol name="checkmark.seal.fill" size={15} color="#10B981" />
                                        <Text style={[styles.capSectionTitle, { color: colors.text }]}>What you can do</Text>
                                    </View>
                                    <View style={styles.capChipRow}>
                                        {selectedConfig.capabilities.map((cap, i) => (
                                            <View key={`cap-${i}`} style={[styles.capChip, { backgroundColor: '#10B98112' }]}> 
                                                <Text style={styles.capChipIcon}>✓</Text>
                                                <Text style={[styles.capChipText, { color: '#059669' }]}>{cap}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* ─── Limitations Section ──────────────────── */}
                            {selectedConfig.limitations.length > 0 && (
                                <View style={styles.capSection}>
                                    <View style={styles.capSectionHeader}>
                                        <IconSymbol name="exclamationmark.triangle.fill" size={15} color={colors.textSecondary} />
                                        <Text style={[styles.capSectionTitle, { color: colors.text }]}>Not supported yet</Text>
                                    </View>
                                    <View style={styles.capChipRow}>
                                        {selectedConfig.limitations.map((lim, i) => (
                                            <View key={`lim-${i}`} style={[styles.limChip, { backgroundColor: colors.textSecondary + '0A' }]}> 
                                                <Text style={[styles.limChipIcon, { color: colors.textSecondary }]}>✕</Text>
                                                <Text style={[styles.limChipText, { color: colors.textSecondary }]}>{lim}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Instruction Card */}
                            <View style={[styles.instructionCard, { backgroundColor: selectedConfig.brandColor + '08', borderColor: selectedConfig.brandColor + '20' }]}>
                                <View style={styles.instructionHeader}>
                                    <IconSymbol name="info.circle.fill" size={16} color={selectedConfig.brandColor} />
                                    <Text style={[styles.instructionTitle, { color: selectedConfig.brandColor }]}>How to get credentials</Text>
                                </View>
                                <Text style={[styles.instructionText, { color: colors.textSecondary }]}>
                                    {selectedConfig.instruction}
                                </Text>
                                {selectedService?.credentialFields.some(f => f.helpUrl) && (
                                    <Pressable
                                        onPress={() => {
                                            const url = selectedService?.credentialFields.find(f => f.helpUrl)?.helpUrl;
                                            if (url) Linking.openURL(url);
                                        }}
                                        style={[styles.instructionLink, { borderColor: selectedConfig.brandColor + '30' }]}
                                    >
                                        <IconSymbol name="safari" size={14} color={selectedConfig.brandColor} />
                                        <Text style={[styles.instructionLinkText, { color: selectedConfig.brandColor }]}>
                                            Open setup guide
                                        </Text>
                                    </Pressable>
                                )}
                            </View>

                            {/* Credential Fields */}
                            {selectedService?.credentialFields.map(field => (
                                <View key={field.key} style={styles.fieldGroup}>
                                    <View style={styles.fieldLabelRow}>
                                        <Text style={[styles.fieldLabel, { color: colors.text }]}>{field.label}</Text>
                                        {field.required && <Text style={{ color: '#EF4444', fontWeight: '700', marginLeft: 2 }}>*</Text>}
                                    </View>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            {
                                                color: colors.text,
                                                borderColor: focusedField === field.key ? selectedConfig.brandColor : colors.border,
                                                backgroundColor: focusedField === field.key ? colors.background : colors.backgroundSecondary,
                                            }
                                        ]}
                                        placeholder={`Enter ${field.label.toLowerCase()}...`}
                                        placeholderTextColor={colors.textSecondary + '60'}
                                        secureTextEntry={field.type === 'password'}
                                        value={credentials[field.key] || ''}
                                        onChangeText={(val: string) => setCredentials(prev => ({ ...prev, [field.key]: val }))}
                                        onFocus={() => setFocusedField(field.key)}
                                        onBlur={() => setFocusedField(null)}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>
                            ))}

                            {/* Submit Button */}
                            <Pressable
                                onPress={submitConnection}
                                disabled={isConnecting}
                                style={({ pressed }) => [
                                    styles.submitButton,
                                    {
                                        backgroundColor: selectedConfig.brandColor,
                                        opacity: isConnecting || pressed ? 0.85 : 1,
                                    },
                                ]}
                            >
                                {isConnecting ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <>
                                        <IconSymbol name="link" size={18} color="#FFFFFF" />
                                        <Text style={styles.submitButtonText}>Connect {selectedService?.displayName}</Text>
                                    </>
                                )}
                            </Pressable>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </View>
    );
}

const CARD_GAP = Spacing.sm;
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.md * 2 - CARD_GAP) / 2;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    modalContainer: {
        flex: 1,
    },
    modalHandle: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    modalHandleBar: {
        width: 40,
        height: 5,
        borderRadius: 3,
    },
    headerSection: {
        paddingHorizontal: Spacing.md,
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        marginTop: 4,
        lineHeight: 20,
        marginBottom: Spacing.md,
        textAlign: 'center',
    },
    connectedSection: {
        borderRadius: Radius.lg,
        borderWidth: 1,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    connectedSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    connectedSectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 8,
    },
    connectedAppRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    connectedAppEmoji: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    connectedAppInfo: {
        flex: 1,
        marginLeft: 10,
    },
    connectedAppName: {
        fontSize: 15,
        fontWeight: '600',
    },
    connectedAppDate: {
        fontSize: 11,
        marginTop: 1,
    },
    connectedAppStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 4,
    },
    connectedSummaryDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
        marginRight: 8,
    },
    searchBarContainer: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.xs,
    },
    searchBarWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: Spacing.md,
    },
    searchIcon: {
        marginRight: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    filterContainer: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.sm,
        gap: Spacing.sm,
    },
    filterChip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    filterChipText: {
        fontSize: 14,
    },
    listContent: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.md,
    },
    columnWrapper: {
        gap: CARD_GAP,
    },
    // ─── Gradient Service Card ──────────────────────
    cardContainer: {
        width: CARD_WIDTH,
        marginBottom: CARD_GAP,
    },
    serviceCard: {
        borderRadius: 18,
        padding: Spacing.md,
        minHeight: 160,
        justifyContent: 'space-between',
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: Spacing.sm,
    },
    emojiContainer: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardEmoji: {
        fontSize: 24,
    },
    linkedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        gap: 4,
    },
    linkedDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#34D399',
    },
    linkedText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    connectBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        gap: 3,
    },
    connectBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 3,
    },
    cardDescription: {
        fontSize: 12,
        lineHeight: 16,
    },
    cardConnectedAt: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 6,
        fontStyle: 'italic',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        fontSize: 15,
    },
    // ─── Bottom Sheet ───────────────────────────────
    sheetAccent: {
        height: 4,
        width: '100%',
    },
    // Hero branding
    heroSection: {
        alignItems: 'center',
        paddingVertical: Spacing.xl,
        paddingHorizontal: Spacing.lg,
    },
    heroEmojiCircle: {
        width: 80,
        height: 80,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    heroEmoji: {
        fontSize: 40,
    },
    heroName: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.3,
        marginBottom: 6,
    },
    heroDesc: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        paddingHorizontal: Spacing.md,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    sheetHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    sheetHeaderEmoji: {
        width: 44,
        height: 44,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    sheetSecureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    sheetSecureText: {
        fontSize: 12,
        fontWeight: '500',
    },
    closeButton: {
        padding: 4,
    },
    sheetScroll: {
        paddingHorizontal: Spacing.lg,
    },
    sheetScrollContent: {
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.xl,
    },
    // Instruction card
    instructionCard: {
        borderRadius: Radius.md,
        borderWidth: 1,
        padding: Spacing.md,
        marginBottom: Spacing.lg,
    },
    instructionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    instructionTitle: {
        fontSize: 13,
        fontWeight: '700',
    },
    instructionText: {
        fontSize: 13,
        lineHeight: 19,
    },
    instructionLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
    },
    instructionLinkText: {
        fontSize: 13,
        fontWeight: '600',
    },
    // Fields
    fieldGroup: {
        marginBottom: Spacing.lg,
    },
    fieldLabelRow: {
        flexDirection: 'row',
        marginBottom: Spacing.sm,
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    input: {
        height: 52,
        borderRadius: Radius.md,
        borderWidth: 1,
        paddingHorizontal: Spacing.md,
        fontSize: 16,
    },
    submitButton: {
        height: 54,
        borderRadius: Radius.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: Spacing.sm,
        gap: 8,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
    },
    // Confirm dialog
    confirmOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    confirmCard: {
        width: '100%',
        borderRadius: 20,
        padding: Spacing.xl,
        alignItems: 'center',
    },
    confirmIconRow: {
        marginBottom: Spacing.md,
    },
    confirmIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    confirmMessage: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: Spacing.lg,
    },
    confirmButtons: {
        flexDirection: 'row',
        gap: Spacing.sm,
        width: '100%',
    },
    confirmBtn: {
        flex: 1,
        height: 48,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmBtnDanger: {
        backgroundColor: '#EF4444',
    },
    confirmBtnText: {
        fontSize: 15,
        fontWeight: '700',
    },
    // ─── Tool Count Badge (on grid cards) ──────────
    toolCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 4,
        marginTop: 8,
    },
    toolCountText: {
        fontSize: 11,
        fontWeight: '600',
    },
    // ─── Capabilities / Limitations Sections ───────
    capSection: {
        marginBottom: Spacing.md,
    },
    capSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    capSectionTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    capChipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    capChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 5,
    },
    capChipIcon: {
        fontSize: 12,
        fontWeight: '700',
        color: '#10B981',
    },
    capChipText: {
        fontSize: 12,
        fontWeight: '500',
    },
    limChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 5,
    },
    limChipIcon: {
        fontSize: 11,
        fontWeight: '700',
    },
    limChipText: {
        fontSize: 12,
        fontWeight: '500',
    },
});
