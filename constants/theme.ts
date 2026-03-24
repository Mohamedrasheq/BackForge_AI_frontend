/**
 * Theme configuration for Personal Agent App
 * Premium minimal design with refined monochrome palette
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1E293B', // Slate-800
    textSecondary: '#64748B', // Slate-500
    background: '#FFFFFF', // Pure White
    backgroundSecondary: '#FFFFFF', // Pure White (Card style)
    tint: '#4F46E5', // Indigo-600
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#4F46E5',
    border: '#E2E8F0', // Slate-200
    // Card colors
    glass: 'rgba(255, 255, 255, 0.98)', // Almost opaque white
    glassBorder: 'rgba(79, 70, 229, 0.1)',
    // Chat colors
    userBubble: '#4F46E5',
    userBubbleText: '#FFFFFF',
    agentBubble: '#FFFFFF', // White bubble
    agentBubbleText: '#1E293B',
    // Urgency
    urgencyLow: '#059669', // Emerald-700
    urgencyMedium: '#D97706', // Amber-600 (slightly deeper)
    urgencyHigh: '#E11D48', // Rose-600 (more professional than standard red)
    // Gradient
    gradientStart: '#FFFFFF',
    gradientEnd: '#FFFFFF', // Flat white, no gradient
  },
  dark: {
    text: '#1E293B', // Slate-800
    textSecondary: '#64748B', // Slate-500
    background: '#FFFFFF', // Pure White
    backgroundSecondary: '#FFFFFF', // Pure White (Card style)
    tint: '#4F46E5', // Indigo-600
    icon: '#64748B',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#4F46E5',
    border: '#E2E8F0', // Slate-200
    // Card colors
    glass: 'rgba(255, 255, 255, 0.98)', // Almost opaque white
    glassBorder: 'rgba(79, 70, 229, 0.1)',
    // Chat colors
    userBubble: '#4F46E5',
    userBubbleText: '#FFFFFF',
    agentBubble: '#FFFFFF', // White bubble
    agentBubbleText: '#1E293B',
    // Urgency
    urgencyLow: '#059669',
    urgencyMedium: '#D97706',
    urgencyHigh: '#E11D48',
    // Gradient
    gradientStart: '#FFFFFF',
    gradientEnd: '#FFFFFF', // Flat white, no gradient
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    rounded: 'System',
    mono: 'Menlo',
  },
  default: {
    sans: 'System',
    serif: 'serif',
    rounded: 'System',
    mono: 'monospace',
  },
  android: {
    sans: 'Roboto',
    serif: 'serif',
    rounded: 'Roboto',
    mono: 'monospace',
  },
});

// Spacing scale
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius scale
export const Radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
};

// Shadow for cards
export const Shadows = {
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    // Modern boxShadow (RN 0.77+)
    boxShadow: '0 8 16 rgba(0, 0, 0, 0.06)',
  },
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    boxShadow: '0 2 4 rgba(0, 0, 0, 0.03)',
  },
  float: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 10,
    boxShadow: '0 12 24 rgba(0, 0, 0, 0.12)',
  },
};
