import { Theme } from '@/constants/theme';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

export default function Index() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="small" color={Theme.color.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.color.background,
  },
});
