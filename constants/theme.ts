/**
 * Light-first Knowledge app theme — calm, polished, premium SaaS.
 * Warm paper, sapphire accent, no loud neon.
 */

import { Platform } from 'react-native';

export const Theme = {
  color: {
    background: '#F7F8FA',
    card: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    accent: '#2563EB',
    accentPressed: '#1D4ED8',
    accentSoft: '#EFF6FF',
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
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    full: 9999,
  },
  type: {
    todayTitle: 34,
    screenTitle: 28,
    itemTitle: 18,
    body: 16,
    caption: 13,
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
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
      default: {
        boxShadow: '0 8px 16px rgba(37, 99, 235, 0.22)',
      },
    }),
  },
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
