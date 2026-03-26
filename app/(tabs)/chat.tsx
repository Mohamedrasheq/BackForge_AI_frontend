import { ActionCard } from '@/components/ui/action-card';
import { ChatBubble } from '@/components/ui/chat-bubble';
import { GlassInput } from '@/components/ui/glass-input';
import { Header } from '@/components/ui/header';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/lib/haptics';
import {
  executeAction,
  fetchGitHubRepos,
  fetchLinearContext,
  sendChatMessageStreaming,
  scheduleConfirm,
} from '@/services/api';
import type {
  ChatMessage,
  GitHubRepo,
  LinearContextResponse,
  ProposedAction,
} from '@/types/api';
import { useUser } from '@clerk/clerk-expo';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withDelay, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import {
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Modal,
} from 'react-native';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Typing indicator with three pulsing dots
function TypingIndicator({ color }: { color: string }) {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    const pulse = (sv: typeof dot1, delay: number) =>
      withDelay(delay, withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 }),
        ),
        -1,
      ));
    dot1.value = pulse(dot1, 0);
    dot2.value = pulse(dot2, 200);
    dot3.value = pulse(dot3, 400);
  }, []);

  const s1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const s2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const s3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={styles.typingContainer}>
      <Animated.View style={[styles.typingDot, { backgroundColor: color }, s1]} />
      <Animated.View style={[styles.typingDot, { backgroundColor: color }, s2]} />
      <Animated.View style={[styles.typingDot, { backgroundColor: color }, s3]} />
    </View>
  );
}

export default function ChatScreen() {
  const { user } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // ── Context for actions ──
  const [linearContext, setLinearContext] = useState<LinearContextResponse>({
    teams: [],
    users: [],
    labels: [],
    projects: [],
    cycles: [],
    workflowStates: [],
  });
  const [githubRepos, setGithubRepos] = useState<GitHubRepo[]>([]);

  useEffect(() => {
    if (!user) return;

    fetchLinearContext(user.id)
      .then(setLinearContext)
      .catch((err) => console.warn('[Chat] Failed to fetch Linear context:', err));

    fetchGitHubRepos(user.id)
      .then(setGithubRepos)
      .catch((err) => console.warn('[Chat] Failed to fetch GitHub repos:', err));
  }, [user]);

  // ── Chat state ──
  const [currentQuote, setCurrentQuote] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);

  // ── Scheduling flow state ──
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [pendingScheduleItem, setPendingScheduleItem] = useState<any>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());


  useFocusEffect(
    React.useCallback(() => {
      // Pick a random quote when focusing
      const quotes = [
        "What's on your mind?",
        "How can I help you today?",
        "Need help with a task?",
        "Let's get things done.",
        "How can I assist you right now?",
        "Ready to supercharge your workflow?",
      ];
      setCurrentQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }, [])
  );

  // ── Keyboard handling for iOS gap ──
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const showSubscription = Keyboard.addListener('keyboardWillShow', () => setIsKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardWillHide', () => setIsKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // ── Send message via /api/chat ──
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isLoading || !user) return;

    haptics.light();

    const userMessage: ChatMessage = {
      id: generateId(),
      text,
      isUser: true,
      timestamp: new Date(),
    };

    const agentMessageId = generateId();
    const agentMessage: ChatMessage = {
      id: agentMessageId,
      text: '',
      isUser: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage, agentMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      await sendChatMessageStreaming(
        {
          userId: user.id,
          text,
          history: messages.map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.text,
          })),
          timezone: getTimezone(),
        },
        (delta) => {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id !== agentMessageId) return msg;

              if (delta.type === 'text_delta') {
                return { ...msg, text: msg.text + delta.text };
              }
              if (delta.type === 'tool_use' && delta.status === 'running') {
                return msg;
              }
              if (delta.type === 'done') {
                // Ensure actions have IDs for tracking
                const proposedActions = delta.proposed_actions?.map((pa: any, idx: number) => ({
                  ...pa,
                  id: pa.id || `${agentMessageId}-action-${idx}`
                }));

                return {
                  ...msg,
                  text: delta.reply,
                  proposedActions: proposedActions?.length > 0 ? proposedActions : undefined,
                };
              }
              return msg;
            })
          );

          // Handle special done-event flags after streaming is finished
          if (delta.type === 'done' && delta.requires_calendar) {
            setPendingScheduleItem(delta.pending_item);
            if (delta.default_datetime) {
              setSelectedDate(new Date(delta.default_datetime));
            }
            setIsCalendarVisible(true);
            haptics.success();
          }
        }
      );
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: generateId(),
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, user]);

  const handleConfirmSchedule = useCallback(async () => {
    if (!user || !pendingScheduleItem) return;
    
    setIsScheduling(true);
    haptics.medium();

    try {
      const response = await scheduleConfirm({
        userId: user.id,
        scheduledAt: selectedDate.toISOString(),
        pendingItem: pendingScheduleItem,
      });

      if (response.success) {
        haptics.success();
        setIsCalendarVisible(false);
        
        // Add a success message to the chat
        const successMsg: ChatMessage = {
          id: generateId(),
          text: `✅ Scheduled: **${pendingScheduleItem.title}** for ${selectedDate.toLocaleString(undefined, { 
            month: 'short', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit' 
          })}`,
          isUser: false,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, successMsg]);
      }
    } catch (err) {
      console.error('[Chat] Failed to confirm schedule:', err);
      haptics.error();
    } finally {
      setIsScheduling(false);
      setPendingScheduleItem(null);
    }
  }, [user, pendingScheduleItem, selectedDate]);

  // ── Action Execution ──
  const handleExecuteAction = useCallback(async (action: ProposedAction) => {
    if (!user) return;
    haptics.medium();
    setExecutingActionId(action.id);

    try {
      const result = await executeAction({
        userId: user.id,
        action,
      });

      setMessages((prev) =>
        prev.map((msg) => {
          if (!msg.proposedActions) return msg;
          return {
            ...msg,
            proposedActions: msg.proposedActions.map((pa) =>
              pa.id === action.id ? { ...pa, execution_result: result } : pa
            ),
          };
        })
      );
    } catch (err) {
      console.error('[Chat] Action execution failed:', err);
    } finally {
      setExecutingActionId(null);
    }
  }, [user]);

  const flatListRef = useRef<FlatList>(null);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Header 
        showBranding={false} 
        hideDefaultRightElements={true}
        hideAvatar={true}
        style={{ paddingRight: Spacing.sm }}
        centerElement={
          <Image 
            source={require('@/assets/images/brand_logo_cropped.png')} 
            style={{ width: 120, height: 32, resizeMode: 'contain' }} 
          />
        }
        rightElement={
          <Pressable
            onPress={() => {
              haptics.medium();
              setMessages([]);
            }}
            style={({ pressed }) => [
              styles.clearButton,
              {
                opacity: pressed ? 0.6 : 1,
                backgroundColor: `${colors.textSecondary}12`,
              },
            ]}
          >
            <IconSymbol name="trash" size={18} color={colors.textSecondary} />
          </Pressable>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          <View style={styles.initialState}>
            <LottieView
              source={require('@/assets/animations/Businessman looking for career opportunities.json')}
              autoPlay
              loop
              style={styles.initialLottie}
            />
            <Animated.Text 
              entering={Platform.OS === 'android' ? undefined : FadeInDown.delay(400).duration(600)}
              style={[styles.initialQuote, { color: colors.text }]}
            >
              {currentQuote}
            </Animated.Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            renderItem={({ item }) => (
              <View style={styles.bubbleWrapper}>
                {!item.isUser && !item.text ? (
                  <View style={styles.agentBubble}>
                    <TypingIndicator color={colors.textSecondary} />
                  </View>
                ) : (
                  <ChatBubble
                    text={item.text}
                    isUser={item.isUser}
                    style={item.isUser ? styles.userBubble : styles.agentBubble}
                  />
                )}
                {!item.isUser && item.proposedActions && (
                  <View style={styles.actionsList}>
                    {item.proposedActions.map((action: ProposedAction) => (
                      <ActionCard
                        key={action.id}
                        action={action}
                        linearContext={linearContext}
                        githubRepos={githubRepos}
                        isExecuting={executingActionId === action.id}
                        onApprove={() => handleExecuteAction(action)}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          />
        )}

        <Modal
          visible={isCalendarVisible}
          transparent
          animationType="none"
          onRequestClose={() => setIsCalendarVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View 
              entering={FadeIn} 
              exiting={FadeOut}
              style={StyleSheet.absoluteFill}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsCalendarVisible(false)}>
                <BlurView intensity={20} style={StyleSheet.absoluteFill} />
              </Pressable>
            </Animated.View>

            <Animated.View 
              entering={SlideInDown.springify().damping(20)}
              exiting={SlideOutDown}
              style={[styles.scheduleModalContainer, { backgroundColor: colors.background }]}
            >
              <View style={styles.modalIndicator} />
              
              <Text style={[styles.modalTitle, { color: colors.text }]}>Schedule Reminder</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {pendingScheduleItem?.title || 'New Task'}
              </Text>

              <View style={styles.dateSelector}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SELECT DATE</Text>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={[0, 1, 2, 3, 4, 5, 6]}
                  keyExtractor={i => i.toString()}
                  contentContainerStyle={styles.dateList}
                  renderItem={({ item: offset }) => {
                    const d = new Date();
                    d.setDate(d.getDate() + offset);
                    const isSelected = d.toDateString() === selectedDate.toDateString();
                    return (
                      <Pressable 
                        onPress={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                          setSelectedDate(newDate);
                          haptics.selection();
                        }}
                        style={[
                          styles.dateItem,
                          isSelected && { backgroundColor: colors.tint }
                        ]}
                      >
                        <Text style={[
                          styles.dateItemDay, 
                          { color: isSelected ? '#FFF' : colors.textSecondary }
                        ]}>
                          {offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : d.toLocaleDateString(undefined, { weekday: 'short' })}
                        </Text>
                        <Text style={[
                          styles.dateItemDate, 
                          { color: isSelected ? '#FFF' : colors.text }
                        ]}>
                          {d.getDate()}
                        </Text>
                      </Pressable>
                    );
                  }}
                />
              </View>

              <View style={styles.timeSelector}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SELECT TIME</Text>
                <View style={styles.timeGrid}>
                  {[
                    { label: 'Morning', time: 9 },
                    { label: 'Noon', time: 12 },
                    { label: 'Evening', time: 18 },
                    { label: 'Night', time: 21 }
                  ].map((t) => {
                    const isSelected = selectedDate.getHours() === t.time;
                    return (
                      <Pressable
                        key={t.label}
                        onPress={() => {
                          const newDate = new Date(selectedDate);
                          newDate.setHours(t.time, 0, 0, 0);
                          setSelectedDate(newDate);
                          haptics.selection();
                        }}
                        style={[
                          styles.timeItem,
                          { borderColor: colors.border },
                          isSelected && { borderColor: colors.tint, backgroundColor: colors.tint + '10' }
                        ]}
                      >
                        <Text style={[
                          styles.timeItemLabel,
                          { color: isSelected ? colors.tint : colors.text }
                        ]}>
                          {t.label}
                        </Text>
                        <Text style={[
                          styles.timeItemValue,
                          { color: isSelected ? colors.tint : colors.textSecondary }
                        ]}>
                          {t.time > 12 ? `${t.time - 12} PM` : `${t.time} AM`}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.modalActions}>
                <Pressable 
                  onPress={() => setIsCalendarVisible(false)}
                  style={[styles.modalActionBtn, { backgroundColor: colors.border }]}
                >
                  <Text style={[styles.modalActionText, { color: colors.text }]}>Cancel</Text>
                </Pressable>
                <Pressable 
                  disabled={isScheduling}
                  onPress={handleConfirmSchedule}
                  style={[styles.modalActionBtn, { backgroundColor: colors.tint }]}
                >
                  {isScheduling ? (
                    <Text style={[styles.modalActionText, { color: '#FFF' }]}>Scheduling...</Text>
                  ) : (
                    <>
                      <IconSymbol name="calendar" size={18} color="#FFF" />
                      <Text style={[styles.modalActionText, { color: '#FFF' }]}>Confirm</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </Animated.View>
          </View>
        </Modal>

        <View style={[
          styles.inputContainer,
          {
            paddingBottom: (Platform.OS === 'ios' && isKeyboardVisible)
              ? 0
              : Math.max(Spacing.md, insets.bottom)
          }
        ]}>
          <View style={styles.inputRow}>
            <GlassInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask anything..."
              onSubmitEditing={handleSend}
              containerStyle={styles.input}
              editable={!isLoading}
            />
            <Pressable
              onPress={handleSend}
              disabled={isLoading || !inputText.trim()}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor: colors.tint,
                  opacity: (isLoading || !inputText.trim()) ? 0.5 : (pressed ? 0.8 : 1),
                },
              ]}
            >
              <IconSymbol name="paperplane.fill" size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  messageList: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  bubbleWrapper: {
    gap: Spacing.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  agentBubble: {
    alignSelf: 'flex-start',
  },
  actionsList: {
    gap: Spacing.sm,
    paddingLeft: 40, // Offset for agent bubble
  },
  inputContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  initialLottie: {
    width: 280,
    height: 280,
  },
  initialQuote: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: -20,
    paddingHorizontal: Spacing.xl,
    opacity: 0.9,
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scheduleModalContainer: {
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  modalIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(150,150,150,0.3)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  dateSelector: {
    marginBottom: 24,
  },
  dateList: {
    gap: 10,
  },
  dateItem: {
    width: 60,
    height: 74,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'rgba(150,150,150,0.05)',
  },
  dateItemDay: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  dateItemDate: {
    fontSize: 18,
    fontWeight: '700',
  },
  timeSelector: {
    marginBottom: 32,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeItem: {
    flex: 1,
    minWidth: '45%',
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeItemLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeItemValue: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalActionBtn: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  modalActionText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
