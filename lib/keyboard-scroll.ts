/**
 * Capture composer + Confirm titles: keep scrolling from focusing a
 * multiline TextInput (facebook/react-native#36295).
 */

export const COMPOSER_SCROLL_ENABLED = false;
export const COMPOSER_MIN_HEIGHT = 220;
export const KEYBOARD_SHOULD_PERSIST_TAPS = 'handled' as const;
export const DRAG_GUARD_MS = 300;

export type KeyboardDismissMode = 'interactive' | 'on-drag';

/** iOS tracks the finger; Android dismisses as soon as the drag starts. */
export function keyboardDismissModeFor(os: string): KeyboardDismissMode {
  return os === 'ios' ? 'interactive' : 'on-drag';
}

export function composerScrollProps(os: string): {
  keyboardDismissMode: KeyboardDismissMode;
  keyboardShouldPersistTaps: typeof KEYBOARD_SHOULD_PERSIST_TAPS;
} {
  return {
    keyboardDismissMode: keyboardDismissModeFor(os),
    keyboardShouldPersistTaps: KEYBOARD_SHOULD_PERSIST_TAPS,
  };
}

export function confirmListScrollProps(os: string): {
  keyboardDismissMode: KeyboardDismissMode;
  keyboardShouldPersistTaps: typeof KEYBOARD_SHOULD_PERSIST_TAPS;
} {
  return composerScrollProps(os);
}

/** Confirm card titles grow with the text; they never scroll themselves. */
export function confirmTitleScrollEnabled(): false {
  return false;
}

/**
 * Autofocus only on an empty composer. A voice transcript (and any typed
 * text) must not reopen the keyboard until the user taps.
 */
export function composerAutoFocus(
  text: string,
  allowAutoFocus: boolean,
  locked: boolean
): boolean {
  return allowAutoFocus && !locked && text.length === 0;
}

export function dragGuardUntil(now: number, windowMs = DRAG_GUARD_MS): number {
  return now + windowMs;
}

/**
 * iOS fires TextInput onFocus at the end of a scroll when the finger lifts
 * on the field. Reject that focus while a drag is in flight and for a short
 * window after it ends.
 */
export function shouldRejectFocusDuringDrag(
  isDragging: boolean,
  guardUntil: number,
  now: number
): boolean {
  return isDragging || now < guardUntil;
}
