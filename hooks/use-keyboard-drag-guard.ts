import {
  DRAG_GUARD_MS,
  dragGuardUntil,
  shouldRejectFocusDuringDrag,
} from '@/lib/keyboard-scroll';
import { useCallback, useRef } from 'react';
import { Keyboard } from 'react-native';

/**
 * Blur a TextInput that iOS focused because a scroll ended on it.
 */
export function useKeyboardDragGuard() {
  const draggingRef = useRef(false);
  const guardUntilRef = useRef(0);

  const onScrollBeginDrag = useCallback(() => {
    draggingRef.current = true;
  }, []);

  const endDrag = useCallback(() => {
    draggingRef.current = false;
    guardUntilRef.current = dragGuardUntil(Date.now(), DRAG_GUARD_MS);
  }, []);

  const onInputFocus = useCallback(() => {
    if (
      shouldRejectFocusDuringDrag(draggingRef.current, guardUntilRef.current, Date.now())
    ) {
      queueMicrotask(() => Keyboard.dismiss());
    }
  }, []);

  return {
    onScrollBeginDrag,
    onScrollEndDrag: endDrag,
    onMomentumScrollEnd: endDrag,
    onInputFocus,
  };
}
