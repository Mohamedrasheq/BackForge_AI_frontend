import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import haptics from '@/lib/haptics';

const ACCENT_COLORS = ['#4F46E5', '#7C3AED', '#059669', '#D97706', '#E11D48'];

interface GuideSectionProps {
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  title: string;
  description: string;
  step: number;
  accent: string;
  colors: any;
}

function GuideSection({ icon, title, description, step, accent, colors }: GuideSectionProps) {
  return (
    <View style={[styles.card, Shadows.glass]}>
      {/* Accent strip */}
      <View style={[styles.accentStrip, { backgroundColor: accent }]} />

      <View style={styles.cardBody}>
        {/* Step badge + Icon row */}
        <View style={styles.cardTopRow}>
          <View style={[styles.stepBadge, { backgroundColor: accent }]}>
            <Text style={styles.stepText}>{step}</Text>
          </View>
          <View style={[styles.iconCircle, { backgroundColor: `${accent}12` }]}>  
            <IconSymbol name={icon} size={24} color={accent} />
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>

        {/* Description */}
        <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

export default function HowItWorksScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const sections = [
    {
      icon: 'tray.full.fill',
      title: 'Memory & Capture',
      description: 'Every interaction builds your personalized "Memory" — tasks, conversations, and technical details stay available across all sessions.',
    },
    {
      icon: 'command',
      title: 'AI Shortcuts (@ Tags)',
      description: 'Type @github to draft PRs, @linear to create issues, or @schedule to set reminders. Professional tools, one keystroke away.',
    },
    {
      icon: 'house.fill',
      title: 'Daily Narratives',
      description: 'Wake up to a personalized brief. Your AI agent analyzes pending tasks and gives you a strategic perspective on what to focus on.',
    },
    {
      icon: 'link',
      title: 'Pro Integrations',
      description: 'Connect GitHub, Linear, Slack, and Gmail. BackForge works across platforms to fetch context and propose actions automatically.',
    },
    {
      icon: 'lock.fill',
      title: 'Privacy First',
      description: 'Industry-standard encryption via Clerk. Your professional context stays private and secure — always.',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      {/* Custom Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.sm,
            backgroundColor: colors.background,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
          Shadows.subtle,
        ]}
      >
        <View style={styles.headerContent}>
          <Pressable
            onPress={() => {
              haptics.light();
              router.back();
            }}
            hitSlop={12}
            style={styles.backButton}
          >
            <IconSymbol name="chevron.left" size={24} color={colors.tint} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>How it Works</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + Spacing.xxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.heroText, { color: colors.text }]}>
          Master your workflow with{'\n'}
          <Text style={{ color: colors.tint }}>BackForge AI</Text>
        </Text>
        <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
          Five powerful systems working together to keep you productive.
        </Text>

        {sections.map((section, idx) => (
          <GuideSection
            key={idx}
            {...section}
            step={idx + 1}
            accent={ACCENT_COLORS[idx % ACCENT_COLORS.length]}
            colors={colors}
          />
        ))}

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Version 1.0.0 • Built for High Performance
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 44,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -Spacing.xs,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.lg,
  },
  heroText: {
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  heroSub: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },

  // ── Card ──
  card: {
    borderRadius: Radius.lg,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  accentStrip: {
    height: 4,
    width: '100%',
  },
  cardBody: {
    padding: Spacing.lg,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: Spacing.xs + 2,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 21,
  },

  // ── Footer ──
  footer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

