import { Card } from '@/components/ui/card';
import { SkeletonBar, useSkeletonPulse } from '@/components/ui/skeleton';
import { PARSE_SKELETON_BAR_WIDTHS, PARSE_SKELETON_LABEL } from '@/lib/list-skeleton';
import React from 'react';
import { StyleSheet, View } from 'react-native';

export function ParseSkeleton() {
  const { phase, reduceMotion } = useSkeletonPulse();

  return (
    <Card accessibilityLabel={PARSE_SKELETON_LABEL} style={styles.card}>
      <View style={styles.stack}>
        {PARSE_SKELETON_BAR_WIDTHS.map((width) => (
          <SkeletonBar key={width} width={width} phase={phase} reduceMotion={reduceMotion} />
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 12,
    padding: 14,
  },
  stack: {
    gap: 12,
    paddingVertical: 4,
  },
});
