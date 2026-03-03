import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Haptic feedback utilities for the app
 * Provides consistent haptic feedback across all interactive elements
 */

export const haptics = {
    /**
     * Light tap - for regular button presses
     */
    light: () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    },

    /**
     * Medium tap - for important actions
     */
    medium: () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    },

    /**
     * Heavy tap - for significant actions like confirmations
     */
    heavy: () => {
        if (Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
    },

    /**
     * Selection - for tab switches and selections
     */
    selection: () => {
        if (Platform.OS !== 'web') {
            Haptics.selectionAsync();
        }
    },

    /**
     * Success - for successful completions
     */
    success: () => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    },

    /**
     * Warning - for warnings
     */
    warning: () => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
    },

    /**
     * Error - for errors
     */
    error: () => {
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    },
};

export default haptics;
