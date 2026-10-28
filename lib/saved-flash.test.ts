import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { clearSavedFlash, getSavedFlashCount, savedFlashLabel, showSavedFlash } from './saved-flash';

describe('savedFlashLabel', () => {
  afterEach(() => {
    clearSavedFlash();
  });

  it('names one task and many tasks', () => {
    assert.equal(savedFlashLabel(1), 'Saved 1 task');
    assert.equal(savedFlashLabel(4), 'Saved 4 tasks');
    assert.equal(savedFlashLabel(null), null);
    showSavedFlash(2);
    assert.equal(getSavedFlashCount(), 2);
    assert.equal(savedFlashLabel(), 'Saved 2 tasks');
  });
});
