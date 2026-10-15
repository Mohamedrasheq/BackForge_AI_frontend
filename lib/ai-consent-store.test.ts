import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  aiConsentNoticeDone,
  aiConsentStorageKey,
  aiConsentStoredValue,
  signedInRoute,
} from './ai-consent';
import { createAiConsentStore, type AiConsentStorage } from './ai-consent-store';

type Deferred = { resolve: (value: string | null) => void; reject: (error: unknown) => void };

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const pending: Deferred[] = [];
  let reads = 0;
  let manual = false;
  const storage: AiConsentStorage = {
    getItem: (key) => {
      reads += 1;
      if (!manual) return Promise.resolve(data.get(key) ?? null);
      return new Promise<string | null>((resolve, reject) => pending.push({ resolve, reject }));
    },
    setItem: async (key, value) => {
      data.set(key, value);
    },
    removeItem: async (key) => {
      data.delete(key);
    },
  };
  return {
    storage,
    data,
    pending,
    get reads() {
      return reads;
    },
    holdReads() {
      manual = true;
    },
  };
}

function fakeTimers() {
  const timers: { callback: () => void; cleared: boolean }[] = [];
  return {
    setTimer: (callback: () => void) => {
      const timer = { callback, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimer: (handle: unknown) => {
      (handle as { cleared: boolean }).cleared = true;
    },
    fireAll: () => {
      for (const timer of timers) if (!timer.cleared) timer.callback();
    },
  };
}

const USER = 'user_1';
const KEY = aiConsentStorageKey(USER) as string;

describe('createAiConsentStore', () => {
  it('reads storage once and notifies every subscriber', async () => {
    const fake = fakeStorage({ [KEY]: aiConsentStoredValue() });
    const store = createAiConsentStore({ storage: fake.storage });
    let askCalls = 0;
    let captureCalls = 0;
    store.subscribe(() => (askCalls += 1));
    store.subscribe(() => (captureCalls += 1));

    assert.equal(store.getStatus(USER), 'loading');
    await Promise.all([store.ensureLoaded(USER), store.ensureLoaded(USER)]);

    assert.equal(fake.reads, 1);
    assert.equal(store.getStatus(USER), 'agreed');
    assert.equal(askCalls, 1);
    assert.equal(captureCalls, 1);
  });

  it('asks a user with nothing stored', async () => {
    const store = createAiConsentStore({ storage: fakeStorage().storage });
    await store.ensureLoaded(USER);
    assert.equal(store.getStatus(USER), 'needed');
  });

  it('keeps the result when the screen unmounts during the read', async () => {
    const fake = fakeStorage({ [KEY]: aiConsentStoredValue() });
    fake.holdReads();
    const store = createAiConsentStore({ storage: fake.storage });
    const unsubscribe = store.subscribe(() => undefined);
    const read = store.ensureLoaded(USER);
    unsubscribe();

    fake.pending[0].resolve(aiConsentStoredValue());
    await read;

    assert.equal(store.getStatus(USER), 'agreed');
    let notified = 0;
    store.subscribe(() => (notified += 1));
    await store.ensureLoaded(USER);
    assert.equal(fake.reads, 1);
    assert.equal(notified, 0);
  });

  it('falls back to needed when the read fails', async () => {
    const fake = fakeStorage();
    fake.holdReads();
    const store = createAiConsentStore({ storage: fake.storage });
    const read = store.ensureLoaded(USER);
    fake.pending[0].reject(new Error('storage unavailable'));
    await read;
    assert.equal(store.getStatus(USER), 'needed');
  });

  it('falls back to needed when the read is slow, and a late agreement still wins', async () => {
    const fake = fakeStorage();
    fake.holdReads();
    const timers = fakeTimers();
    const store = createAiConsentStore({ storage: fake.storage, ...timers });
    const read = store.ensureLoaded(USER);

    timers.fireAll();
    assert.equal(store.getStatus(USER), 'needed');

    fake.pending[0].resolve(aiConsentStoredValue());
    await read;
    assert.equal(store.getStatus(USER), 'agreed');
  });

  it('agreeing unlocks every screen and is saved for next launch', async () => {
    const fake = fakeStorage();
    const store = createAiConsentStore({ storage: fake.storage });
    await store.ensureLoaded(USER);
    let notified = 0;
    store.subscribe(() => (notified += 1));

    await store.agree(USER);

    assert.equal(store.getStatus(USER), 'agreed');
    assert.equal(notified, 1);
    assert.equal(fake.data.get(KEY), aiConsentStoredValue());

    const nextLaunch = createAiConsentStore({ storage: fake.storage });
    await nextLaunch.ensureLoaded(USER);
    assert.equal(nextLaunch.getStatus(USER), 'agreed');
  });

  it('Agree closes the notice at once and it never shows again', async () => {
    const fake = fakeStorage();
    let finishWrite: () => void = () => undefined;
    const slowDisk: AiConsentStorage = {
      ...fake.storage,
      setItem: (key, value) =>
        new Promise<void>((resolve) => {
          finishWrite = () => {
            fake.data.set(key, value);
            resolve();
          };
        }),
    };
    const store = createAiConsentStore({ storage: slowDisk });
    await store.ensureLoaded(USER);
    assert.deepEqual(signedInRoute('(tabs)', store.getStatus(USER)), {
      kind: 'redirect',
      to: '/ai-consent',
    });

    const seen: string[] = [];
    store.subscribe(() => seen.push(store.getStatus(USER)));
    const saving = store.agree(USER);

    // Before the disk write finishes: the screen is told, and every route lets the user in.
    assert.deepEqual(seen, ['agreed']);
    assert.equal(aiConsentNoticeDone(store.getStatus(USER), false), true);
    assert.deepEqual(signedInRoute('ai-consent', store.getStatus(USER)), { kind: 'stay' });
    assert.deepEqual(signedInRoute('(tabs)', store.getStatus(USER)), { kind: 'stay' });

    finishWrite();
    await saving;

    const nextLaunch = createAiConsentStore({ storage: fake.storage });
    await nextLaunch.ensureLoaded(USER);
    for (const route of ['(tabs)', 'sign-in', undefined]) {
      assert.notDeepEqual(signedInRoute(route, nextLaunch.getStatus(USER)), {
        kind: 'redirect',
        to: '/ai-consent',
      });
    }
  });

  it('agreeing during the read is not undone by an empty result', async () => {
    const fake = fakeStorage();
    fake.holdReads();
    const store = createAiConsentStore({ storage: fake.storage });
    const read = store.ensureLoaded(USER);
    await store.agree(USER);
    fake.pending[0].resolve(null);
    await read;
    assert.equal(store.getStatus(USER), 'agreed');
  });

  it('keeps users apart and forgets a cleared user', async () => {
    const fake = fakeStorage({ [KEY]: aiConsentStoredValue() });
    const store = createAiConsentStore({ storage: fake.storage });
    await store.ensureLoaded(USER);
    await store.ensureLoaded('user_2');
    assert.equal(store.getStatus(USER), 'agreed');
    assert.equal(store.getStatus('user_2'), 'needed');

    await store.clear(USER);
    assert.equal(store.getStatus(USER), 'loading');
    assert.equal(fake.data.has(KEY), false);
  });

  it('stays loading without a signed-in user and does not read', async () => {
    const fake = fakeStorage();
    const store = createAiConsentStore({ storage: fake.storage });
    await store.ensureLoaded(null);
    assert.equal(store.getStatus(null), 'loading');
    assert.equal(fake.reads, 0);
  });
});
