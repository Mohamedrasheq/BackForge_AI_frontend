import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ── Configure foreground notification behavior ──
if (Platform.OS === 'android') {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
}

/**
 * Set up Android notification channel (required for Android 8+).
 * Call this once on app start.
 */
export async function setupNotificationChannel(): Promise<void> {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#4F46E5',
            sound: 'default',
        });
    }
}

/**
 * Request permission and get the Expo Push Token.
 * Returns the token string or null if unavailable.
 */
export async function registerForPushNotifications(): Promise<string | null> {
    if (Platform.OS !== 'android') return null;

    if (!Device.isDevice) {
        console.warn('[Notifications] Must use physical device for push notifications');
        return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        console.warn('[Notifications] Permission not granted for push notifications');
        return null;
    }

    try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log('[Notifications] Push token generated:', token);
        return token;
    } catch (error) {
        console.error('[Notifications] Failed to get push token:', error);
        return null;
    }
}

/**
 * Get the native device push token (FCM token on Android, APNS on iOS).
 * Useful if your backend sends notifications directly via FCM/APNS.
 */
export async function getDevicePushToken(): Promise<string | null> {
    if (Platform.OS !== 'android') return null;
    try {
        return (await Notifications.getDevicePushTokenAsync()).data;
    } catch (error) {
        console.error('[Notifications] Failed to get device token:', error);
        return null;
    }
}

/**
 * Subscribe to foreground notifications.
 */
export function onNotificationReceived(
    callback: (notification: Notifications.Notification) => void
): any {
    if (Platform.OS !== 'android') return { remove: () => { } };
    return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Subscribe to notification taps (foreground + background).
 */
export function onNotificationResponse(
    callback: (response: Notifications.NotificationResponse) => void
): any {
    if (Platform.OS !== 'android') return { remove: () => { } };
    return Notifications.addNotificationResponseReceivedListener(callback);
}
