import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Category, Item } from '../types/api';
import {
  UNFILED_LABEL,
  UNFILED_ROUTE_ID,
  buildCategoryBrowseRows,
  categoryBrowseAccessibilityLabel,
  categoryBrowseTitle,
  categoryCountLabel,
  categoryCountParts,
  itemsInCategory,
  sortDoneByCompleted,
  sortOpenByDue,
} from './category-browse';

function item(patch: Partial<Item> & Pick<Item, 'id'>): Item {
  return {
    text: 'Task',
    status: 'open',
    dueAt: null,
    createdAt: null,
    updatedAt: null,
    folderId: null,
    ...patch,
  };
}

const categories: Category[] = [
  { id: 'work', name: 'Work' },
  { id: 'home', name: 'Home' },
  { id: 'beta', name: 'beta' },
];

describe('categoryCountLabel', () => {
  it('joins both counts, keeps a single side, and uses No tasks at zero', () => {
    assert.equal(categoryCountLabel(4, 12), '4 open · 12 done');
    assert.equal(categoryCountLabel(4, 0), '4 open');
    assert.equal(categoryCountLabel(0, 12), '12 done');
    assert.equal(categoryCountLabel(0, 0), 'No tasks');
  });

  it('marks only the open count for the amber accent', () => {
    assert.deepEqual(categoryCountParts(4, 12), [
      { text: '4 open', tone: 'open' },
      { text: '12 done', tone: 'muted' },
    ]);
    assert.deepEqual(categoryCountParts(2, 0), [{ text: '2 open', tone: 'open' }]);
    assert.deepEqual(categoryCountParts(0, 3), [{ text: '3 done', tone: 'muted' }]);
    assert.deepEqual(categoryCountParts(0, 0), [{ text: 'No tasks', tone: 'muted' }]);
  });
});

describe('categoryBrowseAccessibilityLabel', () => {
  it('reads the name, the counts, and that the row opens', () => {
    assert.equal(
      categoryBrowseAccessibilityLabel('Work', 4, 12),
      'Work, 4 open, 12 done, opens category'
    );
    assert.equal(categoryBrowseAccessibilityLabel('Work', 4, 0), 'Work, 4 open, opens category');
    assert.equal(categoryBrowseAccessibilityLabel('Work', 0, 12), 'Work, 12 done, opens category');
    assert.equal(
      categoryBrowseAccessibilityLabel('Work', 0, 0),
      'Work, No tasks, opens category'
    );
  });
});

describe('buildCategoryBrowseRows', () => {
  const items: Item[] = [
    item({ id: '1', folderId: 'work', status: 'open' }),
    item({ id: '2', folderId: 'work', status: 'open' }),
    item({ id: '3', folderId: 'work', status: 'done' }),
    item({ id: '4', folderId: 'home', status: 'done', text: 'Buy milk' }),
    item({ id: '5', folderId: null, status: 'open' }),
    item({ id: '6', folderId: 'missing', status: 'done' }),
  ];

  it('sorts A to Z, pins Unfiled last, and counts open and done', () => {
    const rows = buildCategoryBrowseRows(
      [
        { id: 'beta', name: 'beta' },
        { id: 'work', name: 'Work' },
        { id: 'alpha', name: 'Alpha' },
      ],
      items
    );

    assert.deepEqual(
      rows.map((row) => [row.name, row.unfiled, row.openCount, row.doneCount]),
      [
        ['Alpha', false, 0, 0],
        ['beta', false, 0, 0],
        ['Work', false, 2, 1],
        // Home is not in this category list, so that done task counts as Unfiled.
        [UNFILED_LABEL, true, 1, 2],
      ]
    );
    assert.equal(rows[rows.length - 1]?.id, UNFILED_ROUTE_ID);
  });

  it('hides Unfiled when it has no tasks and still lists empty categories', () => {
    const rows = buildCategoryBrowseRows(categories, [
      item({ id: '1', folderId: 'work', status: 'open' }),
    ]);

    assert.deepEqual(
      rows.map((row) => row.name),
      ['beta', 'Home', 'Work']
    );
    assert.equal(rows.find((row) => row.id === 'beta')?.openCount, 0);
    assert.equal(categoryCountLabel(0, 0), 'No tasks');
  });

  it('shows only Unfiled when that is the only place with tasks and there are no categories', () => {
    const rows = buildCategoryBrowseRows([], [item({ id: '1', folderId: null, status: 'done' })]);
    assert.deepEqual(rows, [
      {
        id: UNFILED_ROUTE_ID,
        name: UNFILED_LABEL,
        unfiled: true,
        openCount: 0,
        doneCount: 1,
      },
    ]);
  });

  it('filters category names only, including Unfiled, and ignores task text', () => {
    assert.deepEqual(
      buildCategoryBrowseRows(categories, items, 'work').map((row) => row.name),
      ['Work']
    );
    assert.deepEqual(
      buildCategoryBrowseRows(categories, items, 'MILK').map((row) => row.name),
      []
    );
    assert.deepEqual(
      buildCategoryBrowseRows(categories, items, 'unf').map((row) => row.name),
      [UNFILED_LABEL]
    );
    assert.equal(buildCategoryBrowseRows(categories, items, '  Ho ').length, 1);
    assert.equal(buildCategoryBrowseRows(categories, items, '  Ho ')[0]?.openCount, 0);
    assert.equal(buildCategoryBrowseRows(categories, items, '  Ho ')[0]?.doneCount, 1);
  });

  it('keeps a real category named Unfiled distinct from the synthetic row', () => {
    const rows = buildCategoryBrowseRows(
      [{ id: 'named', name: 'Unfiled' }],
      [
        item({ id: '1', folderId: 'named', status: 'done' }),
        item({ id: '2', folderId: null, status: 'open' }),
      ]
    );

    assert.deepEqual(
      rows.map((row) => [row.id, row.unfiled, row.doneCount, row.openCount]),
      [
        ['named', false, 1, 0],
        [UNFILED_ROUTE_ID, true, 0, 1],
      ]
    );
  });

  it('returns no rows when there are no categories and no unfiled tasks', () => {
    assert.deepEqual(buildCategoryBrowseRows([], []), []);
    assert.deepEqual(
      buildCategoryBrowseRows([], [item({ id: '1', folderId: 'missing', status: 'open' })]).map(
        (row) => row.id
      ),
      [UNFILED_ROUTE_ID]
    );
  });
});

describe('categoryBrowseTitle', () => {
  it('resolves Unfiled and known names', () => {
    assert.equal(categoryBrowseTitle(UNFILED_ROUTE_ID, []), UNFILED_LABEL);
    assert.equal(categoryBrowseTitle('home', categories), 'Home');
    assert.equal(categoryBrowseTitle('missing', categories), null);
  });
});

describe('itemsInCategory', () => {
  const items = [
    item({ id: '1', folderId: 'work' }),
    item({ id: '2', folderId: null }),
    item({ id: '3', folderId: 'missing' }),
    item({ id: '4', folderId: 'home' }),
  ];

  it('returns only that category', () => {
    assert.deepEqual(
      itemsInCategory(items, 'work', categories).map((entry) => entry.id),
      ['1']
    );
  });

  it('treats null and unknown folder ids as Unfiled once categories are known', () => {
    assert.deepEqual(
      itemsInCategory(items, UNFILED_ROUTE_ID, categories).map((entry) => entry.id),
      ['2', '3']
    );
    assert.deepEqual(
      itemsInCategory(items, UNFILED_ROUTE_ID, categories, {
        unknownFolderIsUnfiled: false,
      }).map((entry) => entry.id),
      ['2']
    );
  });
});

describe('sortOpenByDue', () => {
  it('orders soonest due first and leaves undated last without mutating the input', () => {
    const later = item({ id: 'later', dueAt: '2026-10-03T15:00:00.000Z' });
    const sooner = item({ id: 'sooner', dueAt: '2026-10-01T09:00:00.000Z' });
    const undated = item({ id: 'undated', dueAt: null });
    const invalid = item({ id: 'invalid', dueAt: 'not-a-date' });
    const input = [undated, later, sooner, invalid];

    assert.deepEqual(
      sortOpenByDue(input).map((entry) => entry.id),
      ['sooner', 'later', 'undated', 'invalid']
    );
    assert.equal(input[0]?.id, 'undated');
  });
});

describe('sortDoneByCompleted', () => {
  it('orders newest updatedAt first, falls back to createdAt, and leaves blanks last', () => {
    const older = item({
      id: 'older',
      status: 'done',
      updatedAt: '2026-10-01T00:00:00.000Z',
      createdAt: '2026-09-01T00:00:00.000Z',
    });
    const newer = item({
      id: 'newer',
      status: 'done',
      updatedAt: '2026-10-05T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const createdOnly = item({
      id: 'created',
      status: 'done',
      createdAt: '2026-10-04T00:00:00.000Z',
    });
    const blank = item({ id: 'blank', status: 'done' });

    assert.deepEqual(
      sortDoneByCompleted([blank, older, createdOnly, newer]).map((entry) => entry.id),
      ['newer', 'created', 'older', 'blank']
    );
  });
});
