import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

const MAPPING = {
  calendar: 'calendar-today',
  'list.bullet': 'format-list-bulleted',
  plus: 'add',
  'plus.circle.fill': 'add-circle',
  'person.fill': 'person',
  checkmark: 'check',
  'checkmark.circle.fill': 'check-circle',
  circle: 'radio-button-unchecked',
  'mic.fill': 'mic',
  'arrow.up': 'arrow-upward',
  'chevron.left': 'chevron-left',
  'chevron.right': 'chevron-right',
  'chevron.down': 'expand-more',
  tag: 'label',
  xmark: 'close',
  trash: 'delete',
  pencil: 'edit',
  'square.and.pencil': 'edit',
  tray: 'inbox',
  'bubble.left.and.bubble.right': 'forum',
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
