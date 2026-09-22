import { registerDevice } from '@/services/api';
import {
  getExpoPushToken,
  requestNotificationPermission,
  setupNotificationChannel,
} from '@/services/notifications';
import { Platform } from 'react-native';

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

export type EnableAlertsResult = {
  permission: 'granted' | 'denied';
  message: string;
  /** True only after this device's push token was saved. Delivery is still not live. */
  registered: boolean;
};

export function notificationStatusLabel(permission: NotificationPermission): string {
  if (permission === 'granted') return 'On';
  if (permission === 'denied') return 'Off';
  return 'Not enabled yet';
}

export function notificationStatusDetail(permission: NotificationPermission): string {
  if (permission === 'granted') {
    return 'Permission is on for this device. Push delivery is not live yet.';
  }
  return 'You can allow notifications on this device. Push delivery is not live yet.';
}

/**
 * Request permission and register this device. Does not send pushes —
 * the API only stores the token until delivery exists.
 */
export async function enableAlertsOnDevice(): Promise<EnableAlertsResult> {
  await setupNotificationChannel();
  const granted = await requestNotificationPermission();
  if (!granted) {
    return {
      permission: 'denied',
      message: 'Notifications are off. You can enable them in system settings.',
      registered: false,
    };
  }

  if (Platform.OS === 'web') {
    return {
      permission: 'granted',
      message: 'Permission is on in this browser. Push delivery is not live yet.',
      registered: false,
    };
  }

  const token = await getExpoPushToken();
  if (!token) {
    return {
      permission: 'granted',
      message: 'A physical device is required to register. Push delivery is not live yet.',
      registered: false,
    };
  }

  await registerDevice(token);
  return {
    permission: 'granted',
    message: 'This device is registered. Push delivery is not live yet.',
    registered: true,
  };
}
