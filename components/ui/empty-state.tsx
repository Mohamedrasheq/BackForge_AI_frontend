import { IconSymbol, type IconSymbolName } from '@/components/ui/icon-symbol';
import { TextButton } from '@/components/ui/text-button';
import { Theme } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** Shared calm empty marks for Today and All items. */
export type EmptyMark = 'calendar' | 'list';

const LINE = '#9CA3AF';
const MARK_SIZE = 44;
const STROKE = 1.75;

function LineMark({ mark }: { mark: EmptyMark }) {
  if (mark === 'calendar') {
    return (
      <Svg width={MARK_SIZE} height={MARK_SIZE} viewBox="0 0 44 44" fill="none">
        <Rect x="8" y="11" width="28" height="25" rx="5" stroke={LINE} strokeWidth={STROKE} />
        <Path d="M8 18.5h28" stroke={LINE} strokeWidth={STROKE} />
        <Path d="M16 8v6" stroke={Theme.color.accent} strokeWidth={STROKE} strokeLinecap="round" />
        <Path d="M28 8v6" stroke={LINE} strokeWidth={STROKE} strokeLinecap="round" />
        <Circle cx="16.5" cy="25" r="1.35" fill={Theme.color.accent} />
        <Circle cx="22" cy="25" r="1.35" fill={LINE} />
        <Circle cx="27.5" cy="25" r="1.35" fill={LINE} />
        <Circle cx="16.5" cy="30.5" r="1.35" fill={LINE} />
        <Circle cx="22" cy="30.5" r="1.35" fill={LINE} />
      </Svg>
    );
  }

  return (
    <Svg width={MARK_SIZE} height={MARK_SIZE} viewBox="0 0 44 44" fill="none">
      <Circle cx="12" cy="14" r="2.25" stroke={Theme.color.accent} strokeWidth={STROKE} />
      <Circle cx="12" cy="22" r="2.25" stroke={LINE} strokeWidth={STROKE} />
      <Circle cx="12" cy="30" r="2.25" stroke={LINE} strokeWidth={STROKE} />
      <Path d="M19 14h16" stroke={LINE} strokeWidth={STROKE} strokeLinecap="round" />
      <Path d="M19 22h16" stroke={LINE} strokeWidth={STROKE} strokeLinecap="round" />
      <Path d="M19 30h11" stroke={LINE} strokeWidth={STROKE} strokeLinecap="round" />
    </Svg>
  );
}

export function EmptyState({
  icon,
  mark,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: IconSymbolName;
  /** Line-icon empty used by Today and All items Open. */
  mark?: EmptyMark;
  title?: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const calm = Boolean(mark);

  return (
    <View style={[styles.wrap, calm && styles.wrapCalm]}>
      {mark ? (
        <View
          style={styles.lineIcon}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <LineMark mark={mark} />
        </View>
      ) : icon ? (
        <View style={styles.icon}>
          <IconSymbol name={icon} size={26} color={Theme.color.accent} />
        </View>
      ) : null}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <Text style={[styles.description, !title && styles.descriptionSolo, calm && styles.descriptionCalm]}>
        {description}
      </Text>
      {actionLabel && onAction ? (
        <TextButton
          label={actionLabel}
          onPress={onAction}
          style={[styles.action, calm && styles.actionCalm]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: Theme.space.lg,
    paddingVertical: Theme.space.xl,
  },
  wrapCalm: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: Theme.space.md,
    paddingHorizontal: 0,
  },
  lineIcon: {
    marginBottom: 14,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Theme.color.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.space.md,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    color: Theme.color.text,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  description: {
    marginTop: 6,
    maxWidth: 280,
    fontSize: Theme.type.body,
    lineHeight: 22,
    color: Theme.color.textSecondary,
    textAlign: 'center',
  },
  descriptionCalm: {
    maxWidth: 336,
  },
  descriptionSolo: {
    marginTop: 0,
    fontSize: Theme.type.itemTitle,
    lineHeight: 24,
  },
  action: {
    marginTop: Theme.space.sm,
  },
  actionCalm: {
    marginTop: 16,
  },
});
