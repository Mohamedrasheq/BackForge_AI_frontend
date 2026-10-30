import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ITEM_ROW_CHECK_SIZE,
  ITEM_ROW_SKELETON_CHIP_HEIGHT,
  ITEM_ROW_SKELETON_CHIP_WIDTH,
  ITEM_ROW_SKELETON_META_WIDTH,
  ITEM_ROW_SKELETON_TITLE_HEIGHT,
  ITEM_ROW_SKELETON_TITLE_SECOND_WIDTH,
  ITEM_ROW_SKELETON_TITLE_WIDTHS,
  LIST_SKELETON_GAP,
  LIST_SKELETON_LABEL,
  LIST_SKELETON_OPACITY_MAX,
  LIST_SKELETON_OPACITY_MIN,
  LIST_SKELETON_ROW_COUNT,
  LIST_SKELETON_ROW_EST,
  LIST_SKELETON_STAGGER,
  PARSE_SKELETON_BAR_WIDTHS,
  PARSE_SKELETON_LABEL,
  itemRowSkeletonHasSecondTitle,
  itemRowSkeletonTitleWidth,
  listBodyKind,
  rowsForHeight,
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

describe('rowsForHeight', () => {
  const stride = LIST_SKELETON_ROW_EST + LIST_SKELETON_GAP;

  it('uses the Today ItemRow estimate and list gap', () => {
    assert.equal(LIST_SKELETON_ROW_EST, 116);
    assert.equal(LIST_SKELETON_GAP, 12);
    assert.equal(stride, 128);
    assert.match(source('constants/theme.ts'), /listGap:\s*12/);
  });

  it('fills with ceil(height / (row + gap)) and at least one row', () => {
    assert.equal(rowsForHeight(1), 1);
    assert.equal(rowsForHeight(stride), 1);
    assert.equal(rowsForHeight(stride + 1), 2);
    assert.equal(rowsForHeight(stride * 4), 4);
    assert.equal(rowsForHeight(500), 4);
    assert.equal(rowsForHeight(800), 7);
  });

  it('falls back to four rows when height is not usable', () => {
    assert.equal(LIST_SKELETON_ROW_COUNT, 4);
    assert.equal(rowsForHeight(0), LIST_SKELETON_ROW_COUNT);
    assert.equal(rowsForHeight(-20), LIST_SKELETON_ROW_COUNT);
    assert.equal(rowsForHeight(Number.NaN), LIST_SKELETON_ROW_COUNT);
    assert.equal(rowsForHeight(Number.POSITIVE_INFINITY), LIST_SKELETON_ROW_COUNT);
  });
});

describe('list skeleton shape', () => {
  it('mirrors ItemRow: check, title widths, chip, due line', () => {
    assert.equal(LIST_SKELETON_LABEL, 'Loading');
    assert.equal(ITEM_ROW_CHECK_SIZE, 26);
    assert.equal(ITEM_ROW_SKELETON_TITLE_HEIGHT, 16);
    assert.deepEqual([...ITEM_ROW_SKELETON_TITLE_WIDTHS], ['88%', '72%', '80%', '64%']);
    assert.equal(itemRowSkeletonTitleWidth(0), '88%');
    assert.equal(itemRowSkeletonTitleWidth(4), '88%');
    assert.equal(itemRowSkeletonTitleWidth(1), '72%');
    assert.equal(itemRowSkeletonHasSecondTitle(0), false);
    assert.equal(itemRowSkeletonHasSecondTitle(1), true);
    assert.equal(ITEM_ROW_SKELETON_TITLE_SECOND_WIDTH, '56%');
    assert.equal(ITEM_ROW_SKELETON_CHIP_HEIGHT, 26);
    assert.equal(ITEM_ROW_SKELETON_CHIP_WIDTH, '30%');
    assert.equal(ITEM_ROW_SKELETON_META_WIDTH, '40%');
  });

  it('staggers the pulse by about 0.12 of the period between 0.35 and 0.65', () => {
    assert.equal(LIST_SKELETON_STAGGER, 0.12);
    assert.equal(LIST_SKELETON_OPACITY_MIN, 0.35);
    assert.equal(LIST_SKELETON_OPACITY_MAX, 0.65);
  });
});

describe('ItemListSkeleton', () => {
  const src = source('components/ui/skeleton.tsx');

  it('fills the measured list area and falls back to the window height', () => {
    assert.match(src, /rows\?: number/);
    assert.match(src, /rowsForHeight/);
    assert.match(src, /onLayout/);
    assert.match(src, /Dimensions\.get\('window'\)\.height/);
    assert.match(src, /useNativeDriver:\s*true/);
    assert.match(src, /LIST_SKELETON_STAGGER/);
    assert.match(src, /Animated\.modulo/);
    assert.doesNotMatch(src, /CountPill/);
    assert.doesNotMatch(src, /expo-linear-gradient/);
  });

  it('draws a chip pill with accentSoft and a 16px title bar', () => {
    assert.match(src, /ITEM_ROW_SKELETON_CHIP_HEIGHT/);
    assert.match(src, /Theme\.color\.accentSoft/);
    assert.match(src, /Theme\.radius\.full/);
    assert.match(src, /ITEM_ROW_SKELETON_TITLE_HEIGHT/);
    assert.match(src, /itemRowSkeletonHasSecondTitle/);
    assert.match(src, /cardSurface/);
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
      assert.match(src, /styles\.listFill/);
      assert.doesNotMatch(src, /ActivityIndicator/);
      assert.doesNotMatch(src, /<ItemListSkeleton rows=/);
    }
  });

  it('does not add a CountPill placeholder on Today while loading', () => {
    const src = source('app/(tabs)/index.tsx');
    const start = src.indexOf("listBodyKind({ loading, itemCount: items.length }) === 'skeleton'");
    const end = src.indexOf('<FlatList');
    assert.ok(start >= 0 && end > start);
    assert.doesNotMatch(src.slice(start, end), /CountPill/);
    assert.doesNotMatch(source('components/ui/skeleton.tsx'), /CountPill/);
  });
});
