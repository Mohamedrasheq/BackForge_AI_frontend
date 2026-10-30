import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  COMPOSER_MIN_HEIGHT,
  COMPOSER_SCROLL_ENABLED,
  DRAG_GUARD_MS,
  KEYBOARD_SHOULD_PERSIST_TAPS,
  composerAutoFocus,
  composerScrollProps,
  confirmListScrollProps,
  confirmTitleScrollEnabled,
  dragGuardUntil,
  keyboardDismissModeFor,
  shouldRejectFocusDuringDrag,
} from './keyboard-scroll';

describe('keyboardDismissModeFor', () => {
  it('uses interactive on iOS and on-drag elsewhere', () => {
    assert.equal(keyboardDismissModeFor('ios'), 'interactive');
    assert.equal(keyboardDismissModeFor('android'), 'on-drag');
    assert.equal(keyboardDismissModeFor('web'), 'on-drag');
  });
});

describe('composer and confirm scroll props', () => {
  it('keeps the composer from scrolling itself', () => {
    assert.equal(COMPOSER_SCROLL_ENABLED, false);
    assert.equal(COMPOSER_MIN_HEIGHT, 220);
  });

  it('grows confirm titles instead of scrolling them', () => {
    assert.equal(confirmTitleScrollEnabled(), false);
  });

  it('wires dismiss-on-drag and persist-taps on both lists', () => {
    assert.deepEqual(composerScrollProps('ios'), {
      keyboardDismissMode: 'interactive',
      keyboardShouldPersistTaps: KEYBOARD_SHOULD_PERSIST_TAPS,
    });
    assert.deepEqual(confirmListScrollProps('android'), {
      keyboardDismissMode: 'on-drag',
      keyboardShouldPersistTaps: 'handled',
    });
    assert.equal(KEYBOARD_SHOULD_PERSIST_TAPS, 'handled');
  });
});

describe('composerAutoFocus', () => {
  it('autofocuses only when the screen opens empty', () => {
    assert.equal(composerAutoFocus('', true, false), true);
  });

  it('stays closed when a transcript or typed text is already there', () => {
    assert.equal(composerAutoFocus('Buy oat milk Friday', true, false), false);
    assert.equal(composerAutoFocus('Call the dentist at 3', true, false), false);
  });

  it('does not autofocus after voice capture or while locked', () => {
    assert.equal(composerAutoFocus('', false, false), false);
    assert.equal(composerAutoFocus('', true, true), false);
    assert.equal(composerAutoFocus('Pick up dry cleaning', false, false), false);
  });
});

describe('drag guard', () => {
  it('blurs when focus fires mid-drag', () => {
    assert.equal(shouldRejectFocusDuringDrag(true, 0, 1_000), true);
  });

  it('still blurs if iOS focuses at the end of the scroll', () => {
    const until = dragGuardUntil(1_000);
    assert.equal(until, 1_000 + DRAG_GUARD_MS);
    assert.equal(shouldRejectFocusDuringDrag(false, until, 1_100), true);
    assert.equal(shouldRejectFocusDuringDrag(false, until, 1_299), true);
  });

  it('allows a real tap after the guard window', () => {
    const until = dragGuardUntil(1_000, 300);
    assert.equal(shouldRejectFocusDuringDrag(false, until, 1_300), false);
    assert.equal(shouldRejectFocusDuringDrag(false, 0, 5_000), false);
  });
});
