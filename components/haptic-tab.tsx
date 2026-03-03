import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';

export function HapticTab(props: BottomTabBarButtonProps) {
  const { accessibilityState, children, onPress } = props;
  const focused = accessibilityState?.selected;
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Animation values
  const scale = useSharedValue(1);
  const indicatorOpacity = useSharedValue(focused ? 1 : 0);
  const indicatorWidth = useSharedValue(focused ? 40 : 0);

  useEffect(() => {
    if (focused) {
      indicatorOpacity.value = withTiming(1, { duration: 200 });
      indicatorWidth.value = withSpring(40, { damping: 12, stiffness: 90 });
    } else {
      indicatorOpacity.value = withTiming(0, { duration: 200 });
      indicatorWidth.value = withSpring(0);
    }
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: indicatorOpacity.value,
    width: indicatorWidth.value,
  }));

  const handlePress = (ev: any) => {
    if (!focused) {
      // Haptic feedback
      Haptics.selectionAsync();

      // Animation sequence
      scale.value = withSequence(
        withTiming(0.9, { duration: 100 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );
    }
    onPress?.(ev);
  };

  return (
    <PlatformPressable
      {...props}
      onPress={handlePress}
      style={[props.style, styles.container]}
    >
      <Animated.View style={[styles.indicatorContainer, { alignItems: 'center' }]}>
        <Animated.View
          style={[
            styles.indicator,
            { backgroundColor: colors.tint },
            indicatorStyle
          ]}
        />
      </Animated.View>
      <Animated.View style={[animatedStyle]}>
        {children}
      </Animated.View>
    </PlatformPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  indicator: {
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
});
