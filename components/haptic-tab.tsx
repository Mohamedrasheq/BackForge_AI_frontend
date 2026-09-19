import { Theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import React from 'react';
import { StyleSheet } from 'react-native';

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      style={[props.style, styles.button]}
      android_ripple={{ color: Theme.color.accentSoft, borderless: true, radius: 36 }}
      onPressIn={(ev) => {
        haptics.selection();
        props.onPressIn?.(ev);
      }}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
