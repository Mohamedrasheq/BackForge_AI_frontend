import { AiConsentCard } from '@/components/consent/ai-consent-card';
import { Theme } from '@/constants/theme';
import { useAiConsent } from '@/hooks/use-ai-consent';
import { aiConsentNoticeDone } from '@/lib/ai-consent';
import { Redirect } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * One-time AI notice after sign-in, before the tabs.
 * The root layout routes here while consent is needed; this screen leaves for the tabs itself.
 */
export default function AiConsentScreen() {
  const { status, agree } = useAiConsent();
  const [agreedHere, setAgreedHere] = useState(false);

  if (aiConsentNoticeDone(status, agreedHere)) return <Redirect href="/(tabs)" />;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <AiConsentCard
        onAgree={() => {
          setAgreedHere(true);
          agree();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Theme.color.background,
  },
});
