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
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getDailyMessageStats,
  incrementDailyMessageCount,
  isProActive
} from '../../services/revenuecat';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
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

  // ── Subscription & Limit state ──
  const [proActive, setProActive] = useState(false);
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);

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

      const checkLimits = async () => {
        const isPro = await isProActive();
        setProActive(active => active || isPro);
        if (!isPro) {
          const stats = await getDailyMessageStats();
          setRemainingMessages(stats.remaining);
        }
      };
      checkLimits();
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

    // Check Gating
    if (!proActive) {
      const stats = await getDailyMessageStats();
      if (stats.remaining <= 0) {
        haptics.warning();
        router.push('/paywall');
        return;
      }
    }

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
        }
      );

      // Increment limit if not pro
      if (!proActive) {
        await incrementDailyMessageCount();
        const stats = await getDailyMessageStats();
        setRemainingMessages(stats.remaining);
      }
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
  }, [inputText, isLoading, user, proActive]);

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
            <IconSymbol name="arrow.counterclockwise" size={16} color={colors.textSecondary} />
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
              source={require('@/assets/animations/Man Working on Laptop.json')}
              autoPlay
              loop
              style={styles.initialLottie}
            />
            <Animated.Text 
              entering={FadeInDown.delay(400).duration(600)}
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
                <ChatBubble
                  text={item.text}
                  isUser={item.isUser}
                  style={item.isUser ? styles.userBubble : styles.agentBubble}
                />
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

        <View style={[
          styles.inputContainer,
          {
            paddingBottom: (Platform.OS === 'ios' && isKeyboardVisible)
              ? 0
              : Math.max(Spacing.md, insets.bottom)
          }
        ]}>
          {!proActive && remainingMessages !== null && (
            <Text style={[styles.limitText, { color: colors.textSecondary }]}>
              {remainingMessages} {remainingMessages === 1 ? 'message' : 'messages'} remaining today
            </Text>
          )}
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
  limitText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
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
});
