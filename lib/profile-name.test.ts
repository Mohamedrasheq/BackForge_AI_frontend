import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CLERK_NAME_MAX_LENGTH,
  CLERK_NAME_PARAM_UNKNOWN,
  PROFILE_NAME_FAILED,
  PROFILE_NAME_OFFLINE,
  PROFILE_NAME_UNSIGNED,
  canSaveProfileName,
  displayProfileName,
  hasProfileNameChanged,
  isFirstNameMissing,
  isProfileNameNetworkError,
  normalizeProfileName,
  profileNameA11yLabel,
  profileNamePayload,
  profileNameSaveError,
} from './profile-name';

describe('normalizeProfileName', () => {
  it('trims ends and collapses repeated spaces', () => {
    assert.equal(normalizeProfileName('  Maya   Chen  '), 'Maya Chen');
    assert.equal(normalizeProfileName('\tJordan \n Hale\n'), 'Jordan Hale');
    assert.equal(normalizeProfileName('Rin'), 'Rin');
    assert.equal(normalizeProfileName(''), '');
    assert.equal(normalizeProfileName('    '), '');
  });
});

describe('validation', () => {
  it('requires a first name after normalisation', () => {
    assert.equal(isFirstNameMissing('Maya'), false);
    assert.equal(isFirstNameMissing('  Maya  '), false);
    assert.equal(isFirstNameMissing(''), true);
    assert.equal(isFirstNameMissing('   '), true);
  });

  it('treats last name as optional', () => {
    assert.deepEqual(profileNamePayload('  Maya  ', ''), { firstName: 'Maya', lastName: '' });
    assert.deepEqual(profileNamePayload('Jordan', '  Hale  '), {
      firstName: 'Jordan',
      lastName: 'Hale',
    });
  });
});

describe('change detection', () => {
  it('ignores spacing-only edits', () => {
    assert.equal(hasProfileNameChanged('  Maya  ', 'Chen', 'Maya', 'Chen'), false);
    assert.equal(hasProfileNameChanged('Maya', '  Chen  ', 'Maya', 'Chen'), false);
    assert.equal(canSaveProfileName('  Maya  ', 'Chen', 'Maya', 'Chen'), false);
  });

  it('detects a first or last name change', () => {
    assert.equal(hasProfileNameChanged('Jordan', 'Chen', 'Maya', 'Chen'), true);
    assert.equal(hasProfileNameChanged('Maya', 'Hale', 'Maya', 'Chen'), true);
    assert.equal(hasProfileNameChanged('Maya', '', 'Maya', 'Chen'), true);
    assert.equal(canSaveProfileName('Jordan', 'Hale', 'Maya', 'Chen'), true);
  });

  it('disables save when the first name is empty even if last name changed', () => {
    assert.equal(canSaveProfileName('', 'Hale', 'Maya', 'Chen'), false);
    assert.equal(canSaveProfileName('   ', '', '', ''), false);
  });

  it('enables save when an email user with no name enters a first name', () => {
    assert.equal(canSaveProfileName('Rin', '', '', ''), true);
    assert.equal(canSaveProfileName('Rin', 'Vale', '', ''), true);
  });
});

describe('displayProfileName', () => {
  it('joins first and last from Clerk fields', () => {
    assert.equal(displayProfileName('Maya', 'Chen'), 'Maya Chen');
  });

  it('shows first name only when last name is empty', () => {
    assert.equal(displayProfileName('Maya', ''), 'Maya');
    assert.equal(displayProfileName('Maya', null), 'Maya');
    assert.equal(displayProfileName('  Maya  ', '   '), 'Maya');
  });

  it('shows Signed in when both names are empty', () => {
    assert.equal(displayProfileName('', ''), PROFILE_NAME_UNSIGNED);
    assert.equal(displayProfileName(null, null), PROFILE_NAME_UNSIGNED);
    assert.equal(displayProfileName(undefined, undefined), PROFILE_NAME_UNSIGNED);
  });

  it('does not keep a stale full name after last name is cleared', () => {
    assert.equal(displayProfileName('Maya', ''), 'Maya');
    assert.notEqual(displayProfileName('Maya', ''), 'Maya Chen');
  });

  it('builds the name-row accessibility label', () => {
    assert.equal(profileNameA11yLabel('Maya Chen'), 'Name, Maya Chen. Double-tap to edit.');
    assert.equal(
      profileNameA11yLabel(PROFILE_NAME_UNSIGNED),
      'Name, Signed in. Double-tap to edit.'
    );
  });
});

describe('profileNameSaveError', () => {
  it('maps offline and network failures', () => {
    assert.equal(isProfileNameNetworkError(new TypeError('Network request failed')), true);
    assert.equal(profileNameSaveError(new TypeError('Network request failed')), PROFILE_NAME_OFFLINE);
    assert.equal(profileNameSaveError(new Error('Failed to fetch')), PROFILE_NAME_OFFLINE);
    assert.equal(profileNameSaveError(new Error('Network Error')), PROFILE_NAME_OFFLINE);
    assert.equal(
      profileNameSaveError({ message: 'offline', cause: new TypeError('Network request failed') }),
      PROFILE_NAME_OFFLINE
    );
  });

  it('maps form_param_unknown to the generic copy and logs the Clerk error', () => {
    const error = {
      clerkError: true,
      errors: [{ code: CLERK_NAME_PARAM_UNKNOWN, message: 'unknown param', longMessage: 'ignored' }],
    };
    const original = console.log;
    const logged: unknown[][] = [];
    console.log = (...args: unknown[]) => {
      logged.push(args);
    };
    try {
      assert.equal(profileNameSaveError(error), PROFILE_NAME_FAILED);
      assert.equal(logged.length, 1);
      assert.equal(logged[0]?.[1], error);
    } finally {
      console.log = original;
    }
  });

  it('shows Clerk longMessage for max length and other validation errors', () => {
    assert.equal(
      profileNameSaveError({
        clerkError: true,
        errors: [
          {
            code: CLERK_NAME_MAX_LENGTH,
            message: 'too long',
            longMessage: 'First name cannot exceed 50 characters.',
          },
        ],
      }),
      'First name cannot exceed 50 characters.'
    );
    assert.equal(
      profileNameSaveError({
        clerkError: true,
        errors: [
          {
            code: 'form_param_format_invalid',
            longMessage: 'First name contains invalid characters.',
          },
        ],
      }),
      'First name contains invalid characters.'
    );
    assert.equal(
      profileNameSaveError({
        clerkError: true,
        errors: [{ code: 'form_param_nil', message: 'First name is required.' }],
      }),
      'First name is required.'
    );
  });

  it('maps anything else to the generic copy', () => {
    assert.equal(profileNameSaveError(new Error('boom')), PROFILE_NAME_FAILED);
    assert.equal(
      profileNameSaveError({
        clerkError: true,
        errors: [{ code: 'authorization_invalid', longMessage: 'Not allowed.' }],
      }),
      PROFILE_NAME_FAILED
    );
    assert.equal(profileNameSaveError({ clerkError: true, errors: [] }), PROFILE_NAME_FAILED);
    assert.equal(profileNameSaveError(null), PROFILE_NAME_FAILED);
  });
});
