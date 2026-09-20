import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

const MAPPING = {
  calendar: 'calendar-today',
  'list.bullet': 'format-list-bulleted',
  plus: 'add',
  'plus.circle.fill': 'add-circle',
  'bell.fill': 'notifications',
  'person.fill': 'person',
  checkmark: 'check',
  'checkmark.circle.fill': 'check-circle',
  circle: 'radio-button-unchecked',
  'mic.fill': 'mic',
  magnifyingglass: 'search',
  'arrow.up.circle.fill': 'arrow-circle-up',
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  xmark: 'close',
  trash: 'delete',
  'square.and.pencil': 'edit',
  tray: 'inbox',
  'rectangle.portrait.and.arrow.right': 'logout',
  'exclamationmark.triangle': 'warning',
  'arrow.clockwise': 'refresh',
} as const;

export type IconSymbolName = keyof typeof MAPPING;

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
  weight?: string;
}) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={MAPPING[name] as ComponentProps<typeof MaterialIcons>['name']}
      style={style}
    />
  );
}
