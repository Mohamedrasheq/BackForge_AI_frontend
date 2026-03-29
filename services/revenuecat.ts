import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import PurchasesUI from 'react-native-purchases-ui';

const REVENUECAT_KEYS = {
    apple: 'appl_REPLACE_WITH_YOUR_IOS_KEY',
    google: 'goog_UxjncKDTGMHQXIeiuTQZBRkFzkW',
};

const ENTITLEMENT_ID = 'BackForge AI Pro';
const DAILY_LIMIT_KEY = 'loop_daily_chat_limit';
const LAST_RESET_KEY = 'loop_last_chat_reset_date';
const MAX_FREE_MESSAGES = 2;

/**
 * Check if the RevenueCat SDK is configured and ready
 */
export async function isSDKAvailable(): Promise<boolean> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
    if (!Purchases) return false;
    try {
        return await Purchases.isConfigured();
    } catch {
        return false;
    }
}

/**
 * Configure RevenueCat SDK
 */
export async function configureRevenueCat(userId?: string) {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    if (!Purchases || typeof Purchases.setLogLevel !== 'function') return;

    try {
        Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);

        const apiKey = Platform.select({
            ios: REVENUECAT_KEYS.apple,
            android: REVENUECAT_KEYS.google,
            default: '',
        });

        if (!apiKey || apiKey.includes('REPLACE_WITH_YOUR')) {
            console.warn('[RevenueCat] Skipping configuration: API Key not provided');
            return;
        }

        await Purchases.configure({
            apiKey: apiKey,
            appUserID: userId
        });
        console.log('[RevenueCat] Configured successfully');
    } catch (error) {
        console.error('[RevenueCat] Configuration failed:', error);
    }
}

/**
 * Identify user in RevenueCat
 */
export async function identifyUser(userId: string) {
    if (!(await isSDKAvailable())) return;

    try {
        await Purchases.logIn(userId);
        console.log(`[RevenueCat] User identified: ${userId}`);
    } catch (error) {
        console.error('[RevenueCat] Login failed:', error);
    }
}

/**
 * Check if user has active BackForge AI Pro entitlement
 */
export async function isProActive(): Promise<boolean> {
    if (!(await isSDKAvailable())) {
        return false;
    }

    try {
        const customerInfo = await Purchases.getCustomerInfo();
        return !!customerInfo.entitlements.active[ENTITLEMENT_ID];
    } catch (error) {
        console.error('[RevenueCat] Failed to check entitlement:', error);
        return false;
    }
}


/**
 * Present Customer Center
 */
export async function presentCustomerCenter() {
    if (!(await isSDKAvailable())) {
        console.warn('[RevenueCat] Customer Center presentation skipped: Native module not available');
        return;
    }

    try {
        await PurchasesUI.presentCustomerCenter();
    } catch (error) {
        console.error('[RevenueCat] Failed to present customer center:', error);
    }
}

/**
 * DAILY MESSAGE LIMIT LOGIC
 */

/**
 * Get remaining messages for today
 */
export async function getDailyMessageStats() {
    const today = new Date().toISOString().split('T')[0];
    const lastReset = await SecureStore.getItemAsync(LAST_RESET_KEY);

    if (lastReset !== today) {
        // New day, reset count
        await SecureStore.setItemAsync(DAILY_LIMIT_KEY, '0');
        await SecureStore.setItemAsync(LAST_RESET_KEY, today);
        return { count: 0, limit: MAX_FREE_MESSAGES, remaining: MAX_FREE_MESSAGES };
    }

    const countStr = await SecureStore.getItemAsync(DAILY_LIMIT_KEY);
    const count = parseInt(countStr || '0', 10);
    const remaining = Math.max(0, MAX_FREE_MESSAGES - count);

    return { count, limit: MAX_FREE_MESSAGES, remaining };
}

/**
 * Increment daily message count
 */
export async function incrementDailyMessageCount() {
    const { count } = await getDailyMessageStats();
    await SecureStore.setItemAsync(DAILY_LIMIT_KEY, (count + 1).toString());
}
