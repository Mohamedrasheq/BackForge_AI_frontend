import { registerDevice } from '@/services/api';
import {
  getExpoPushToken,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  setupNotificationChannel,
} from '@/services/notifications';
import { Platform } from 'react-native';

import type { NotificationPermission } from '@/lib/reminder-nudge';

export type { NotificationPermission };

export type EnableAlertsResult = {
  permission: NotificationPermission;
  message: string;
  /** True only after this device's push token was saved. */
  registered: boolean;
};

export function notificationStatusLabel(permission: NotificationPermission): string {
  if (permission === 'granted') return 'On';
  if (permission === 'denied') return 'Off';
  return 'Not enabled yet';
}

/**
 * Request permission and register this device the same way Account Turn on does.
 */
export async function enableAlertsOnDevice(): Promise<EnableAlertsResult> {
  await setupNotificationChannel();
  const granted = await requestNotificationPermission();
  if (!granted) {
    const status = await getNotificationPermissionStatus();
    return {
      permission: status,
      message: 'Notifications are off. You can enable them in system settings.',
      registered: false,
    };
  }

  if (Platform.OS === 'web') {
    return {
      permission: 'granted',
      message: 'Permission is on in this browser.',
      registered: false,
    };
  }

  const token = await getExpoPushToken();
  if (!token) {
    return {
      permission: 'granted',
      message: 'A physical device is required to register.',
      registered: false,
    };
  }

  await registerDevice(token);
  return {
    permission: 'granted',
    message: 'This device is registered.',
    registered: true,
  };
}
