import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { categoryChipSharesDueRow, dueMetaOrder } from './due-layout';

describe('category chip placement', () => {
  it('never shares the date row, including short names', () => {
    assert.equal(categoryChipSharesDueRow('Learning'), false);
    assert.equal(categoryChipSharesDueRow('App Fine-Tuning'), false);
    assert.equal(categoryChipSharesDueRow(''), false);
  });
});

describe('dueMetaOrder', () => {
  it('puts the category chip on its own line under the date row', () => {
    assert.deepEqual(dueMetaOrder({ hasAccessory: true, showTimeChips: false }), [
      'date',
      'accessory',
    ]);
  });

  it('keeps time chips below the date row and category chip', () => {
    assert.deepEqual(dueMetaOrder({ hasAccessory: true, showTimeChips: true }), [
      'date',
      'accessory',
      'timeChips',
    ]);
  });

  it('omits the accessory when the card has none', () => {
    assert.deepEqual(dueMetaOrder({ hasAccessory: false, showTimeChips: true }), [
      'date',
      'timeChips',
    ]);
    assert.deepEqual(dueMetaOrder({ hasAccessory: false, showTimeChips: false }), ['date']);
  });
});
