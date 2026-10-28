import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  ACCOUNT_COUNTS_KEY_PREFIX,
  accountCountsKey,
  clearAccountCounts,
  completeAccountCounts,
  loadAccountCounts,
  parseStoredAccountCounts,
  saveAccountCounts,
  serializeStoredAccountCounts,
  type AccountCountsStore,
  type StoredAccountCounts,
} from './account-counts';

const USER_A = 'user_alpha';
const USER_B = 'user_bravo';

const SAMPLE: StoredAccountCounts = {
  categoryCount: 4,
  itemCount: 12,
  openCount: 7,
  doneCount: 5,
};

function memoryStore(seed: Record<string, string> = {}): AccountCountsStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(seed));
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      data.set(key, value);
    },
    getAllKeys: async () => [...data.keys()],
    multiRemove: async (keys) => {
      for (const key of keys) data.delete(key);
    },
  };
}

describe('accountCountsKey', () => {
  it('scopes the storage key to the Clerk user id', () => {
    assert.equal(accountCountsKey(USER_A), `${ACCOUNT_COUNTS_KEY_PREFIX}${USER_A}`);
    assert.notEqual(accountCountsKey(USER_A), accountCountsKey(USER_B));
  });
});

describe('parseStoredAccountCounts', () => {
  it('returns null when there is no cache', () => {
    assert.equal(parseStoredAccountCounts(null), null);
    assert.equal(parseStoredAccountCounts(''), null);
  });

  it('reads the four numbers and ignores extra keys', () => {
    const raw = JSON.stringify({
      ...SAMPLE,
      items: [{ text: 'do not persist task bodies' }],
    });
    assert.deepEqual(parseStoredAccountCounts(raw), SAMPLE);
  });

  it('rejects incomplete, non-integer, or negative values', () => {
    assert.equal(parseStoredAccountCounts(JSON.stringify({ categoryCount: 1 })), null);
    assert.equal(
      parseStoredAccountCounts(
        JSON.stringify({ ...SAMPLE, itemCount: 1.5 })
      ),
      null
    );
    assert.equal(
      parseStoredAccountCounts(
        JSON.stringify({ ...SAMPLE, openCount: -1 })
      ),
      null
    );
    assert.equal(parseStoredAccountCounts('{"not":"counts"}'), null);
    assert.equal(parseStoredAccountCounts('not-json'), null);
    assert.equal(parseStoredAccountCounts('[]'), null);
  });
});

describe('serializeStoredAccountCounts', () => {
  it('writes only the four numbers', () => {
    assert.deepEqual(JSON.parse(serializeStoredAccountCounts(SAMPLE)), SAMPLE);
    assert.equal(serializeStoredAccountCounts(SAMPLE).includes('text'), false);
  });
});

describe('completeAccountCounts', () => {
  it('returns null until every total is a number', () => {
    assert.equal(
      completeAccountCounts({
        categoryCount: 1,
        itemCount: null,
        openCount: 0,
        doneCount: 0,
      }),
      null
    );
    assert.deepEqual(
      completeAccountCounts({
        categoryCount: 0,
        itemCount: 0,
        openCount: 0,
        doneCount: 0,
      }),
      { categoryCount: 0, itemCount: 0, openCount: 0, doneCount: 0 }
    );
  });
});

describe('load and save', () => {
  const store = memoryStore();

  afterEach(() => {
    store.data.clear();
  });

  it('round-trips counts for one user', async () => {
    await saveAccountCounts(USER_A, SAMPLE, store);
    assert.deepEqual(await loadAccountCounts(USER_A, store), SAMPLE);
  });

  it('does not let another user read those numbers', async () => {
    await saveAccountCounts(USER_A, SAMPLE, store);
    assert.equal(await loadAccountCounts(USER_B, store), null);
    await saveAccountCounts(USER_B, { ...SAMPLE, itemCount: 3 }, store);
    assert.deepEqual(await loadAccountCounts(USER_A, store), SAMPLE);
    assert.deepEqual(await loadAccountCounts(USER_B, store), { ...SAMPLE, itemCount: 3 });
  });

  it('skips an empty user id so a stray write cannot leak', async () => {
    await saveAccountCounts('', SAMPLE, store);
    assert.equal(store.data.size, 0);
    assert.equal(await loadAccountCounts('', store), null);
  });

  it('returns null on a first load with no cache', async () => {
    assert.equal(await loadAccountCounts(USER_A, store), null);
  });
});

describe('clearAccountCounts', () => {
  it('removes every user-scoped counts key and leaves other keys', async () => {
    const store = memoryStore({
      [accountCountsKey(USER_A)]: serializeStoredAccountCounts(SAMPLE),
      [accountCountsKey(USER_B)]: serializeStoredAccountCounts({ ...SAMPLE, doneCount: 1 }),
      'hasSeenOnboarding': 'true',
      'backforge.review.seen': '{}',
    });
    await clearAccountCounts(store);
    assert.equal(store.data.has(accountCountsKey(USER_A)), false);
    assert.equal(store.data.has(accountCountsKey(USER_B)), false);
    assert.equal(store.data.get('hasSeenOnboarding'), 'true');
    assert.equal(store.data.get('backforge.review.seen'), '{}');
  });

  it('is a no-op when nothing is stored', async () => {
    const store = memoryStore();
    await clearAccountCounts(store);
    assert.equal(store.data.size, 0);
  });
});
