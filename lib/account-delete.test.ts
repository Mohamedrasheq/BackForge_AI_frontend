import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isAccountDeleted } from './account-delete';

describe('isAccountDeleted', () => {
  it('accepts only { ok: true }', () => {
    assert.equal(isAccountDeleted({ ok: true }), true);
    assert.equal(isAccountDeleted({ ok: true, deleted: 3 }), true);
  });

  it('treats anything else as a failure', () => {
    assert.equal(isAccountDeleted({ ok: false }), false);
    assert.equal(isAccountDeleted({ ok: 'true' }), false);
    assert.equal(isAccountDeleted({}), false);
    assert.equal(isAccountDeleted(null), false);
    assert.equal(isAccountDeleted(undefined), false);
    assert.equal(isAccountDeleted('ok'), false);
  });
});
