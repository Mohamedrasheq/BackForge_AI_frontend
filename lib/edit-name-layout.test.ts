import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  EDIT_NAME_BACKDROP_PADDING,
  EDIT_NAME_CARD_MAX_WIDTH,
  EDIT_NAME_FOCUS_EVENT,
  EDIT_NAME_MODAL_ANIMATION,
} from './edit-name-layout';

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../components/account/edit-name-sheet.tsx'),
  'utf8'
);

describe('edit name modal layout', () => {
  it('uses a fade animation and a centered 360 card', () => {
    assert.equal(EDIT_NAME_MODAL_ANIMATION, 'fade');
    assert.equal(EDIT_NAME_CARD_MAX_WIDTH, 360);
    assert.equal(EDIT_NAME_BACKDROP_PADDING, 24);
    assert.equal(EDIT_NAME_FOCUS_EVENT, 'onShow');
    assert.match(src, /animationType=\{EDIT_NAME_MODAL_ANIMATION\}/);
    assert.match(src, /onShow=/);
    assert.match(src, /alignItems: 'center'/);
    assert.match(src, /justifyContent: 'center'/);
    assert.match(src, /maxWidth: EDIT_NAME_CARD_MAX_WIDTH/);
    assert.doesNotMatch(src, /autoFocus/);
    assert.doesNotMatch(src, /styles\.handle/);
  });
});
