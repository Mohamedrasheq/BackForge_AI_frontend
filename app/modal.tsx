import { GlassButton } from '@/components/ui/glass-button';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createDraft } from '@/services/api';
import type { DraftTone } from '@/types/api';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const USER_ID = 'user-001';

const TONES: { value: DraftTone; label: string }[] = [
  { value: 'polite', label: 'Polite' },
  { value: 'professional', label: 'Professional' },
  { value: 'firm', label: 'Firm' },
];

export default function DraftModal() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { itemId, itemTitle } = useLocalSearchParams<{
    itemId: string;
    itemTitle: string;
  }>();

  const [selectedTone, setSelectedTone] = useState<DraftTone>('polite');
  const [draftText, setDraftText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchDraft = useCallback(async () => {
    if (!itemId) return;
    setIsLoading(true);
    try {
      const response = await createDraft({
        userId: USER_ID,
        memoryItemId: itemId,
        tone: selectedTone,
      });
      setDraftText(response.draftText);
    } catch {
      setDraftText('Failed to generate draft. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [itemId, selectedTone]);

  useEffect(() => {
    fetchDraft();
  }, [fetchDraft]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(draftText);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToneChange = async (tone: DraftTone) => {
    await Haptics.selectionAsync();
    setSelectedTone(tone);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + Spacing.sm,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Draft Reply
          </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={[styles.closeButton, { color: colors.tint }]}>Done</Text>
          </Pressable>
        </View>
        {itemTitle && (
          <Text
            style={[styles.headerSubtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            For: {itemTitle}
          </Text>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + Spacing.lg },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Tone Selector */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Tone
        </Text>
        <View style={styles.toneContainer}>
          {TONES.map((tone) => (
            <Pressable
              key={tone.value}
              onPress={() => handleToneChange(tone.value)}
              style={({ pressed }) => [
                styles.toneButton,
                {
                  backgroundColor:
                    selectedTone === tone.value
                      ? colors.tint
                      : colors.backgroundSecondary,
                  borderColor:
                    selectedTone === tone.value ? colors.tint : colors.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.toneText,
                  { color: selectedTone === tone.value ? '#fff' : colors.text },
                ]}
              >
                {tone.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Draft Text */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          Draft
        </Text>
        <Animated.View entering={FadeIn.duration(300)}>
          <View
            style={[
              styles.draftContainer,
              Shadows.subtle,
              {
                backgroundColor: colors.backgroundSecondary,
                borderColor: colors.border,
              },
            ]}
          >
            {isLoading ? (
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Generating draft...
              </Text>
            ) : (
              <TextInput
                style={[styles.draftInput, { color: colors.text }]}
                value={draftText}
                onChangeText={setDraftText}
                multiline
                textAlignVertical="top"
                placeholder="Your draft will appear here..."
                placeholderTextColor={colors.textSecondary}
              />
            )}
          </View>
        </Animated.View>

        {/* Actions */}
        <View style={styles.actions}>
          <GlassButton
            title={copied ? '✓ Copied!' : 'Copy to Clipboard'}
            onPress={handleCopy}
            variant="primary"
            disabled={isLoading || !draftText}
            style={styles.copyButton}
          />
        </View>

        {/* Warning */}
        <Text style={[styles.warning, { color: colors.textSecondary }]}>
          ⚠️ This draft is not sent automatically. Copy and paste it where you
          need it.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: Spacing.xs,
  },
  closeButton: {
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  toneContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  toneButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  toneText: {
    fontSize: 14,
    fontWeight: '500',
  },
  draftContainer: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    minHeight: 200,
    marginBottom: Spacing.lg,
  },
  draftInput: {
    flex: 1,
    padding: Spacing.md,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 200,
  },
  loadingText: {
    padding: Spacing.md,
    fontSize: 15,
    fontStyle: 'italic',
  },
  actions: {
    marginBottom: Spacing.md,
  },
  copyButton: {
    width: '100%',
  },
  warning: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
