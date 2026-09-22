import { IconSymbol } from '@/components/ui/icon-symbol';
import { cardSurface, Theme } from '@/constants/theme';
import React from 'react';
import { StyleSheet, View } from 'react-native';

function ArtStage({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.stage} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.halo} />
      {children}
    </View>
  );
}

export function DumpArt() {
  return (
    <ArtStage>
      <View style={styles.noteStack}>
        <View style={[styles.note, styles.noteBack]}>
          <View style={[styles.line, { width: '78%' }]} />
          <View style={[styles.line, { width: '52%' }]} />
        </View>
        <View style={[styles.note, styles.noteFront]}>
          <View style={[styles.line, { width: '90%' }]} />
          <View style={[styles.line, { width: '68%' }]} />
          <View style={[styles.line, { width: '80%' }]} />
          <View style={styles.micRow}>
            <View style={styles.mic}>
              <IconSymbol name="mic.fill" size={16} color={Theme.color.white} />
            </View>
            <View style={[styles.line, styles.lineWarm, { width: 72 }]} />
          </View>
        </View>
      </View>
    </ArtStage>
  );
}

export function ConfirmArt() {
  const rows = [
    { done: true, width: '72%' as const },
    { active: true, width: '86%' as const },
    { done: false, width: '58%' as const },
  ];

  return (
    <ArtStage>
      <View style={styles.card}>
        {rows.map((row, index) => (
          <View key={index} style={[styles.row, row.active && styles.rowActive]}>
            <View style={[styles.check, row.done && styles.checkDone]}>
              {row.done ? (
                <IconSymbol name="checkmark" size={12} color={Theme.color.white} />
              ) : null}
            </View>
            <View style={[styles.line, { width: row.width }, row.active && styles.lineStrong]} />
            {row.active ? (
              <IconSymbol name="square.and.pencil" size={16} color={Theme.color.accent} />
            ) : (
              <View style={styles.editSpacer} />
            )}
          </View>
        ))}
      </View>
    </ArtStage>
  );
}

export function TodayArt() {
  return (
    <ArtStage>
      <View style={styles.card}>
        <View style={styles.todayChip}>
          <IconSymbol name="calendar" size={16} color={Theme.color.accent} />
          <View style={[styles.line, styles.lineWarm, { width: 56 }]} />
        </View>
        <View style={styles.todayItem}>
          <View style={styles.accentBar} />
          <View style={styles.todayCopy}>
            <View style={[styles.line, styles.lineStrong, { width: '88%' }]} />
            <View style={[styles.line, styles.lineWarm, { width: '42%' }]} />
          </View>
        </View>
        <View style={styles.laterItem}>
          <View style={[styles.line, { width: '70%' }]} />
          <View style={[styles.line, { width: '36%' }]} />
        </View>
      </View>
    </ArtStage>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    minHeight: 148,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: Theme.color.accentSoft,
  },
  card: {
    width: 248,
    padding: Theme.space.md,
    gap: 10,
    ...cardSurface,
  },
  noteStack: {
    width: 260,
    height: 210,
  },
  note: {
    width: 220,
    padding: Theme.space.md,
    gap: 10,
    ...cardSurface,
  },
  noteBack: {
    position: 'absolute',
    top: 6,
    left: 4,
    transform: [{ rotate: '-7deg' }],
  },
  noteFront: {
    position: 'absolute',
    top: 42,
    left: 28,
    transform: [{ rotate: '3.5deg' }],
  },
  line: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.color.border,
  },
  lineWarm: {
    backgroundColor: Theme.color.accent,
    opacity: 0.35,
  },
  lineStrong: {
    backgroundColor: Theme.color.textTertiary,
  },
  micRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  mic: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: Theme.radius.sm,
  },
  rowActive: {
    backgroundColor: Theme.color.accentSoft,
  },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Theme.color.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: Theme.color.accent,
    borderColor: Theme.color.accent,
  },
  editSpacer: {
    width: 16,
  },
  todayChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.color.accentSoft,
    marginBottom: 2,
  },
  todayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  accentBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: Theme.color.accent,
  },
  todayCopy: {
    flex: 1,
    gap: 8,
  },
  laterItem: {
    gap: 8,
    paddingVertical: 8,
    paddingLeft: 14,
    opacity: 0.55,
  },
});
