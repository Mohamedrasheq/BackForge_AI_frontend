import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ITEM_ROW_CHECK_SIZE,
  LIST_SKELETON_LABEL,
  LIST_SKELETON_ROW_COUNT,
  PARSE_SKELETON_BAR_WIDTHS,
  PARSE_SKELETON_LABEL,
  listBodyKind,
} from './list-skeleton';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function source(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('listBodyKind', () => {
  it('shows skeleton while loading then the list', () => {
    assert.equal(listBodyKind({ loading: true, itemCount: 0 }), 'skeleton');
    assert.equal(listBodyKind({ loading: false, itemCount: 3 }), 'list');
  });

  it('keeps existing rows on screen while a later load is in flight', () => {
    assert.equal(listBodyKind({ loading: true, itemCount: 2 }), 'list');
  });

  it('shows the empty list after load with nothing', () => {
    assert.equal(listBodyKind({ loading: false, itemCount: 0 }), 'list');
  });

  it('stays on skeleton while an extra wait is pending', () => {
    assert.equal(listBodyKind({ loading: false, itemCount: 0, pending: true }), 'skeleton');
    assert.equal(listBodyKind({ loading: false, itemCount: 4, pending: true }), 'skeleton');
  });
});

describe('list skeleton shape', () => {
  it('uses four ItemRow-shaped placeholders and a Loading label', () => {
    assert.equal(LIST_SKELETON_ROW_COUNT, 4);
    assert.equal(LIST_SKELETON_LABEL, 'Loading');
    assert.equal(ITEM_ROW_CHECK_SIZE, 26);
  });
});

describe('ParseSkeleton', () => {
  it('still uses three bars and the parse label', () => {
    assert.equal(PARSE_SKELETON_LABEL, 'Breaking down your note');
    assert.deepEqual([...PARSE_SKELETON_BAR_WIDTHS], ['88%', '72%', '80%']);
    const src = source('components/capture/parse-skeleton.tsx');
    assert.match(src, /SkeletonBar/);
    assert.match(src, /PARSE_SKELETON_BAR_WIDTHS/);
    assert.match(src, /PARSE_SKELETON_LABEL/);
  });
});

describe('item list screens', () => {
  it('show ItemListSkeleton while loading instead of a spinner', () => {
    for (const file of ['app/(tabs)/index.tsx', 'app/(tabs)/items.tsx', 'app/category/[id].tsx']) {
      const src = source(file);
      assert.match(src, /ItemListSkeleton/);
      assert.match(src, /listBodyKind/);
      assert.doesNotMatch(src, /ActivityIndicator/);
    }
  });
});
