import { useEffect, useState } from 'react';
import { Appearance, useColorScheme as useRNColorScheme } from 'react-native';

/**
 * Custom hook that properly handles color scheme on both iOS and Android.
 * On Android, we need to use Appearance API for proper updates.
 */
export function useColorScheme(): 'light' | 'dark' {
    const systemColorScheme = useRNColorScheme();
    const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(
        systemColorScheme ?? 'light'
    );

    useEffect(() => {
        // Set initial value
        const initial = Appearance.getColorScheme();
        setColorScheme(initial ?? 'light');

        // Listen for changes (important for Android)
        const subscription = Appearance.addChangeListener(({ colorScheme: newScheme }) => {
            setColorScheme(newScheme ?? 'light');
        });

        return () => {
            subscription.remove();
        };
    }, []);

    // Also update when the React Native hook changes (for iOS)
    useEffect(() => {
        if (systemColorScheme) {
            setColorScheme(systemColorScheme);
        }
    }, [systemColorScheme]);

    return colorScheme;
}
