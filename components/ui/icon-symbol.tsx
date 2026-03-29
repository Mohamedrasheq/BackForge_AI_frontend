// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING: Record<string, string> = {
  // Navigation
  'house.fill': 'home',
  'house': 'house',
  'bubble.left.fill': 'chat-bubble',
  'list.bullet.rectangle': 'list-alt',
  'gearshape.fill': 'settings',
  'tray.full.fill': 'inbox',
  // Other
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'bell.fill': 'notifications',
  'person.circle.fill': 'account-circle',
  'person.crop.circle.fill': 'account-circle',
  'calendar': 'calendar-today',
  'clock': 'access-time',
  'checkmark.circle': 'check-circle',
  'bubble.left': 'chat-bubble-outline',
  'doc.text': 'description',
  'bolt.fill': 'flash-on',
  'checkmark': 'check',
  // Onboarding
  'sparkles': 'auto-awesome',
  'brain.head.profile': 'psychology',
  'lock.shield': 'security',
  'arrow.right': 'arrow-forward',
  // Empty States
  'tray': 'inbox',
  'folder': 'folder-open',
  'arrow.up.circle.fill': 'arrow-circle-up',
  'chevron.left': 'chevron-left',
  // Home Screen Quick Actions
  'list.bullet.clipboard.fill': 'assignment',
  'bubble.left.and.bubble.right.fill': 'forum',
  'checkmark.circle.fill': 'check-circle',
  'mic.fill': 'mic',
  'arrow.up': 'arrow-upward',
  // Action Cards (Linear, GitHub, Gmail)
  'ticket.fill': 'confirmation-number',
  'arrow.triangle.branch': 'call-split',
  'envelope.fill': 'email',
  'pencil': 'edit',
  'xmark': 'close',
  // Profile & Settings
  'arrow.uturn.left.circle.fill': 'replay-circle-filled',
  'note.text': 'sticky-note-2',
  'globe': 'language',
  'info.circle.fill': 'info',
  'book.fill': 'menu-book',
  'moon.fill': 'dark-mode',
  'link': 'link',
  'command': 'code',
  'plus.circle': 'add-circle',
  'xmark.circle.fill': 'cancel',
  'terminal': 'terminal',
  'square.stack.3d.up.fill': 'layers',
  'layers.fill': 'layers',
  'mail.fill': 'mail',
  'calendar.badge.plus': 'calendar-add-on',
  'doc.text.fill': 'description',
  'square.grid.2x2.fill': 'dashboard',
  'circle.circle': 'adjust',
  'checkmark.seal.fill': 'verified',
  'book.closed.fill': 'book',
  'gamecontroller.fill': 'sports-esports',
  'plus': 'add',
  'paperplane': 'send',
  'star.fill': 'star',
  'clock.fill': 'access-time',
  'lock.fill': 'lock',
  'eye.fill': 'visibility',
  'cpu': 'memory',
  'flame.fill': 'whatshot',
  'trash.fill': 'delete',
  'trash': 'delete-outline',
  'arrow.counterclockwise': 'refresh',
  'wand.and.stars': 'auto-fix-high',
  'magnifyingglass': 'search',
  'person.2.fill': 'people',
  'hammer.fill': 'build',
} as any;


/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name] as any} style={style} />;
}
