import { BottomSheet } from '@/components/ui/bottom-sheet';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextButton } from '@/components/ui/text-button';
import { Theme } from '@/constants/theme';
import {
  REMINDER_BODY,
  REMINDER_NOT_NOW,
  REMINDER_SHEET_TURN_ON,
  reminderAskTitle,
} from '@/lib/reminder-nudge';
import React from 'react';
import { StyleSheet, Text } from 'react-native';

export function ReminderNudgeSheet({
  timeLabel,
  enabling,
  onTurnOn,
  onNotNow,
}: {
  timeLabel: string;
  enabling: boolean;
  onTurnOn: () => void;
  onNotNow: () => void;
}) {
  return (
    <BottomSheet onClose={onNotNow} dismissLabel="Dismiss reminder prompt" closeDisabled={enabling}>
      <Text style={styles.title}>{reminderAskTitle(timeLabel)}</Text>
      <Text style={styles.body}>{REMINDER_BODY}</Text>
      <PrimaryButton
        label={REMINDER_SHEET_TURN_ON}
        onPress={onTurnOn}
        loading={enabling}
        disabled={enabling}
      />
      <TextButton label={REMINDER_NOT_NOW} tone="secondary" onPress={onNotNow} disabled={enabling} />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: Theme.type.screenTitle,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: Theme.color.text,
  },
  body: {
    fontSize: Theme.type.body,
    lineHeight: 24,
    color: Theme.color.textSecondary,
  },
});
