import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  aiConsentNoticeDone,
  aiConsentStorageKey,
  aiConsentStoredValue,
  isAiConsentStored,
  signedInRoute,
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

describe('signedInRoute', () => {
  it('waits on the boot spinner while consent is loading', () => {
    assert.deepEqual(signedInRoute('(tabs)', 'loading'), { kind: 'wait' });
    assert.deepEqual(signedInRoute('sign-in', 'loading'), { kind: 'wait' });
  });

  it('sends anyone who has not agreed to the notice before the tabs', () => {
    for (const route of ['(tabs)', 'sign-in', 'onboarding', 'review', 'category', undefined]) {
      assert.deepEqual(signedInRoute(route, 'needed'), { kind: 'redirect', to: '/ai-consent' });
    }
    assert.deepEqual(signedInRoute('ai-consent', 'needed'), { kind: 'stay' });
  });

  it('lets an agreed user into the app', () => {
    assert.deepEqual(signedInRoute('(tabs)', 'agreed'), { kind: 'stay' });
    assert.deepEqual(signedInRoute('review', 'agreed'), { kind: 'stay' });
    assert.deepEqual(signedInRoute('category', 'agreed'), { kind: 'stay' });
    assert.deepEqual(signedInRoute('sign-in', 'agreed'), { kind: 'redirect', to: '/(tabs)' });
    assert.deepEqual(signedInRoute(undefined, 'agreed'), { kind: 'redirect', to: '/(tabs)' });
  });

  it('leaves the notice screen to close itself, so the tabs are not opened twice', () => {
    assert.deepEqual(signedInRoute('ai-consent', 'agreed'), { kind: 'stay' });
  });
});

describe('aiConsentNoticeDone', () => {
  it('closes on the Agree tap even before the store reports it', () => {
    assert.equal(aiConsentNoticeDone('needed', true), true);
    assert.equal(aiConsentNoticeDone('loading', true), true);
  });

  it('closes when a stored agreement arrives late', () => {
    assert.equal(aiConsentNoticeDone('agreed', false), true);
  });

  it('stays open until the user agrees', () => {
    assert.equal(aiConsentNoticeDone('needed', false), false);
    assert.equal(aiConsentNoticeDone('loading', false), false);
  });
});
