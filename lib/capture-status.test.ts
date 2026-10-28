import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  captureParseFailureMessage,
  captureParseStatus,
  CONFIRM_SAVE_FAILED_MESSAGE,
  confirmSavingLabel,
  PARSE_NO_CONNECTION_MESSAGE,
  PARSE_TIMEOUT_MESSAGE,
  savedTasksLabel,
} from './capture-status';

describe('captureParseStatus', () => {
  it('advances the muted line without a percentage', () => {
    assert.equal(captureParseStatus(0), 'Reading your note…');
    assert.equal(captureParseStatus(2_999), 'Reading your note…');
    assert.equal(captureParseStatus(3_000), 'Splitting it into tasks…');
    assert.equal(captureParseStatus(9_999), 'Splitting it into tasks…');
    assert.equal(captureParseStatus(10_000), 'Adding dates and times…');
    assert.equal(captureParseStatus(19_999), 'Adding dates and times…');
    assert.equal(captureParseStatus(20_000), 'Almost there…');
    assert.equal(captureParseStatus(44_000), 'Almost there…');
    assert.equal(captureParseStatus(0).includes('%'), false);
  });
});

describe('captureParseFailureMessage', () => {
  it('uses the timeout and offline banners', () => {
    assert.equal(captureParseFailureMessage(new Error('ignored'), true), PARSE_TIMEOUT_MESSAGE);
    assert.equal(
      captureParseFailureMessage(new TypeError('Failed to fetch'), false),
      PARSE_NO_CONNECTION_MESSAGE
    );
    assert.equal(
      captureParseFailureMessage(new Error('Network request failed'), false),
      PARSE_NO_CONNECTION_MESSAGE
    );
  });
});

describe('confirm and saved labels', () => {
  it('uses the real task count', () => {
    assert.equal(confirmSavingLabel(1), 'Saving 1 task…');
    assert.equal(confirmSavingLabel(3), 'Saving 3 tasks…');
    assert.equal(savedTasksLabel(1), 'Saved 1 task');
    assert.equal(savedTasksLabel(3), 'Saved 3 tasks');
    assert.equal(CONFIRM_SAVE_FAILED_MESSAGE, "Couldn't save. Your tasks are still here. Try again.");
  });
});
