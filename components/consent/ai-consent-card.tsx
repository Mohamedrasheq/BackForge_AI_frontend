import { Card } from '@/components/ui/card';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextButton } from '@/components/ui/text-button';
import { Theme } from '@/constants/theme';
import { AI_CONSENT_AGREE, AI_CONSENT_PRIVACY, AI_CONSENT_TEXT } from '@/lib/ai-consent';
import { PRIVACY_URL } from '@/lib/links';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** The one-time AI notice shown after sign-in, before the tabs. */
export function AiConsentCard({ onAgree }: { onAgree: () => void }) {
  return (
    <View style={styles.wrap}>
      <Card style={styles.card}>
        <Text style={styles.body}>{AI_CONSENT_TEXT}</Text>
        <PrimaryButton label={AI_CONSENT_AGREE} onPress={onAgree} />
        <TextButton
          label={AI_CONSENT_PRIVACY}
          tone="secondary"
          onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Theme.space.screenX,
    paddingBottom: Theme.space.xl,
  },
  card: {
    gap: Theme.space.md,
    padding: Theme.space.lg,
  },
  body: {
    fontSize: Theme.type.body,
    lineHeight: 22,
    color: Theme.color.text,
  },
});
