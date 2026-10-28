import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  getDataGeneration,
  isLatestRequest,
  notifyAfterWrite,
  notifyDataChanged,
  subscribeDataChanges,
} from './data-changes';

describe('notifyAfterWrite', () => {
  const start = getDataGeneration();

  afterEach(() => {
    // generation is monotonic; tests assert deltas from a captured baseline
    void start;
  });

  it('notifies once per successful write', async () => {
    const generations: number[] = [];
    const stop = subscribeDataChanges(() => generations.push(getDataGeneration()));
    const before = getDataGeneration();
    const value = await notifyAfterWrite(Promise.resolve('milk'));
    assert.equal(value, 'milk');
    assert.equal(generations.length, 1);
    assert.equal(generations[0], before + 1);
    await notifyAfterWrite(Promise.resolve('eggs'));
    assert.equal(generations.length, 2);
    assert.equal(generations[1], before + 2);
    stop();
  });

  it('does not notify when the write fails', async () => {
    const generations: number[] = [];
    const stop = subscribeDataChanges(() => generations.push(getDataGeneration()));
    const before = getDataGeneration();
    await assert.rejects(
      () => notifyAfterWrite(Promise.reject(new Error('Could not save'))),
      /Could not save/
    );
    assert.equal(generations.length, 0);
    assert.equal(getDataGeneration(), before);
    stop();
  });
});

describe('isLatestRequest', () => {
  it('lets an older response lose to a newer one', async () => {
    let latest = 0;
    let shown: number | null = null;

    const apply = async (requestId: number, delayMs: number, count: number) => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      if (!isLatestRequest(requestId, latest)) return;
      shown = count;
    };

    latest = 1;
    const older = apply(1, 20, 4);
    latest = 2;
    const newer = apply(2, 5, 5);
    await Promise.all([older, newer]);
    assert.equal(shown, 5);
    assert.equal(isLatestRequest(1, 2), false);
    assert.equal(isLatestRequest(2, 2), true);
  });
});

describe('notifyDataChanged', () => {
  it('wakes every subscriber on a direct notify', () => {
    let ticks = 0;
    const stop = subscribeDataChanges(() => {
      ticks += 1;
    });
    notifyDataChanged();
    assert.equal(ticks, 1);
    stop();
    notifyDataChanged();
    assert.equal(ticks, 1);
  });
});
