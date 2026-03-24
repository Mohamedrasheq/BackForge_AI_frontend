import React, { createContext, useContext } from 'react';
import {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    SharedValue,
} from 'react-native-reanimated';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';

interface TabBarContextType {
    tabBarTranslateY: SharedValue<number>;
    handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

const TabBarContext = createContext<TabBarContextType | null>(null);

export function TabBarProvider({ children }: { children: React.ReactNode }) {
    const tabBarTranslateY = useSharedValue(0);
    const lastOffsetY = useSharedValue(0);
    const isScrolling = useSharedValue(false);

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentY = event.nativeEvent.contentOffset.y;
        const diff = currentY - lastOffsetY.value;

        // Only hide/show after a meaningful scroll (> 5px threshold)
        if (currentY <= 0) {
            // At the top — always show
            tabBarTranslateY.value = withTiming(0, { duration: 250 });
        } else if (diff > 5) {
            // Scrolling down → hide
            tabBarTranslateY.value = withTiming(100, { duration: 250 });
        } else if (diff < -5) {
            // Scrolling up → show
            tabBarTranslateY.value = withTiming(0, { duration: 250 });
        }

        lastOffsetY.value = currentY;
    };

    return (
        <TabBarContext.Provider value={{ tabBarTranslateY, handleScroll }}>
            {children}
        </TabBarContext.Provider>
    );
}

export function useTabBar() {
    const context = useContext(TabBarContext);
    if (!context) {
        throw new Error('useTabBar must be used within a TabBarProvider');
    }
    return context;
}

export function useAnimatedTabBarStyle() {
    const { tabBarTranslateY } = useTabBar();
    return useAnimatedStyle(() => ({
        transform: [{ translateY: tabBarTranslateY.value }],
    }));
}
