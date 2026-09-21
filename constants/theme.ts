/**
 * Light-first Knowledge app theme — calm, polished, premium SaaS.
 * Warm paper, warm amber accent, no loud neon.
 */

import { Platform } from 'react-native';

export const Theme = {
  color: {
    background: '#F7F8FA',
    card: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    accent: '#B45309',
    accentPressed: '#92400E',
    accentSoft: '#FFFBEB',
    border: '#E6E8EE',
    danger: '#DC2626',
    dangerSoft: '#FEF2F2',
    dangerBorder: '#FECACA',
    success: '#059669',
    white: '#FFFFFF',
    overlay: 'rgba(15, 23, 42, 0.4)',
  },
  space: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    listGap: 12,
    screenX: 24,
    listBottom: 40,
    listBottomFab: 96,
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 18,
    xl: 20,
    full: 9999,
  },
  type: {
    todayTitle: 36,
    screenTitle: 28,
    itemTitle: 17,
    body: 16,
    caption: 13,
    label: 15,
  },
  shadow: {
    card: Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
      default: {
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
      },
    }),
    fab: Platform.select({
      ios: {
        shadowColor: '#B45309',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
      default: {
        boxShadow: '0 8px 16px rgba(180, 83, 9, 0.22)',
      },
    }),
  },
} as const;

export const cardSurface = {
  backgroundColor: Theme.color.card,
  borderRadius: Theme.radius.lg,
  borderWidth: 1,
  borderColor: Theme.color.border,
  ...Theme.shadow.card,
} as const;

/** @deprecated Use Theme. Prefer the v1 tokens above. */
export const Colors = {
  light: {
    text: Theme.color.text,
    textSecondary: Theme.color.textSecondary,
    background: Theme.color.background,
    backgroundSecondary: Theme.color.card,
    tint: Theme.color.accent,
    icon: Theme.color.textSecondary,
    tabIconDefault: Theme.color.textTertiary,
    tabIconSelected: Theme.color.accent,
    border: Theme.color.border,
  },
  dark: {
    text: Theme.color.text,
    textSecondary: Theme.color.textSecondary,
    background: Theme.color.background,
    backgroundSecondary: Theme.color.card,
    tint: Theme.color.accent,
    icon: Theme.color.textSecondary,
    tabIconDefault: Theme.color.textTertiary,
    tabIconSelected: Theme.color.accent,
    border: Theme.color.border,
  },
};

export const Spacing = Theme.space;
export const Radius = Theme.radius;
