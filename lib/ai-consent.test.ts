import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  aiConsentStorageKey,
  aiConsentStoredValue,
  isAiConsentStored,
} from './ai-consent';

describe('aiConsentStorageKey', () => {
  it('keys agreement by user id', () => {
    assert.equal(aiConsentStorageKey('user_1'), 'backforge.aiConsent.user_1');
    assert.notEqual(aiConsentStorageKey('user_1'), aiConsentStorageKey('user_2'));
  });

  it('has no key without a user', () => {
    assert.equal(aiConsentStorageKey(null), null);
    assert.equal(aiConsentStorageKey(undefined), null);
    assert.equal(aiConsentStorageKey('  '), null);
  });
});

describe('isAiConsentStored', () => {
  it('reads back only the stored agreement', () => {
    assert.equal(isAiConsentStored(aiConsentStoredValue()), true);
    assert.equal(isAiConsentStored(null), false);
    assert.equal(isAiConsentStored('true'), false);
    assert.equal(isAiConsentStored(''), false);
  });
});
