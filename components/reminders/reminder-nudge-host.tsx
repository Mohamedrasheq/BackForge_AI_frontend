import { ReminderNudgeSheet } from '@/components/reminders/reminder-nudge-sheet';
import { enableAlertsOnDevice } from '@/lib/notifications-enable';
import {
  firstClockDueAt,
  loadReminderNudgeFlags,
  markReminderAsked,
  reminderNudgeDelayMs,
  reminderTimeLabel,
  shouldAskReminderAgain,
  subscribeSavedDues,
  takePendingSavedDues,
} from '@/lib/reminder-nudge';
import { getNotificationPermissionStatus } from '@/services/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';

export function ReminderNudgeHost() {
  const [timeLabel, setTimeLabel] = useState<string | null>(null);
  const [enabling, setEnabling] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const consider = async () => {
      const dues = takePendingSavedDues();
      if (!dues) return;
      const clockDue = firstClockDueAt(dues);
      if (!clockDue) return;

      let permission: Awaited<ReturnType<typeof getNotificationPermissionStatus>>;
      try {
        permission = await getNotificationPermissionStatus();
      } catch {
        return;
      }
      const flags = await loadReminderNudgeFlags(AsyncStorage);
      if (
        cancelled ||
        !shouldAskReminderAgain({
          permission,
          declinedOnboarding: flags.declinedOnboarding,
          alreadyAsked: flags.alreadyAsked,
          hasTimedTask: true,
        })
      ) {
        return;
      }

      await markReminderAsked(AsyncStorage);
      const label = reminderTimeLabel(clockDue);
      if (!label || cancelled) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (!cancelled) setTimeLabel(label);
      }, reminderNudgeDelayMs());
    };

    const stop = subscribeSavedDues(() => {
      void consider();
    });
    void consider();
    return () => {
      cancelled = true;
      stop();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!timeLabel) return null;

  return (
    <ReminderNudgeSheet
      timeLabel={timeLabel}
      enabling={enabling}
      onTurnOn={() => {
        if (enabling) return;
        setEnabling(true);
        void enableAlertsOnDevice()
          .catch(() => undefined)
          .finally(() => {
            setEnabling(false);
            setTimeLabel(null);
          });
      }}
      onNotNow={() => {
        if (enabling) return;
        setTimeLabel(null);
      }}
    />
  );
}
