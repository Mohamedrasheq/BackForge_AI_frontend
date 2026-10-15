import { AiConsentCard } from '@/components/consent/ai-consent-card';
import { Theme } from '@/constants/theme';
import { useAiConsent } from '@/hooks/use-ai-consent';
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * One-time AI notice after sign-in, before the tabs.
 * The root layout routes here while consent is needed and on to the tabs once it is agreed.
 */
export default function AiConsentScreen() {
  const { agree } = useAiConsent();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <AiConsentCard onAgree={agree} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Theme.color.background,
  },
});
