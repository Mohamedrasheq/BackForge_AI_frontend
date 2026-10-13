import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Item } from '../types/api';
import { isUpcoming } from './format';
import { upcomingHeading, upcomingSections } from './upcoming';

const NOW = new Date(2026, 9, 13, 15, 0, 0);

function item(id: string, dueAt: string | null, status: Item['status'] = 'open'): Item {
  return {
    id,
    text: id,
    status,
    dueAt,
    createdAt: null,
    updatedAt: null,
    folderId: null,
  };
}

function at(day: number, hour: number, minute = 0): string {
  return new Date(2026, 9, day, hour, minute).toISOString();
}

describe('isUpcoming', () => {
  it('keeps a due time from one minute ago onward and drops earlier times', () => {
    const justNow = new Date(NOW.getTime() - 30_000).toISOString();
    const tooEarly = new Date(NOW.getTime() - 120_000).toISOString();
    assert.equal(isUpcoming(justNow, NOW), true);
    assert.equal(isUpcoming(tooEarly, NOW), false);
    assert.equal(isUpcoming(null, NOW), false);
    assert.equal(isUpcoming('not-a-date', NOW), false);
  });
});

describe('upcoming sections', () => {
  const items = [
    item('later-morning', at(19, 9)),
    item('today-evening', at(13, 18)),
    item('today-soon', at(13, 16)),
    item('today-past', at(13, 9)),
    item('tomorrow', at(14, 9)),
    item('thursday', at(15, 10)),
    item('saturday', at(17, 11)),
    item('sunday', at(18, 12)),
    item('next-monday', at(19, 8)),
    item('done-tomorrow', at(14, 15), 'done'),
    item('undated', null),
  ];

  it('groups open upcoming items into Today, Tomorrow, This week, and Later', () => {
    const sections = upcomingSections(items, null, NOW, 1);
    assert.deepEqual(
      sections.map((section) => [section.title, section.data.map((entry) => entry.id)]),
      [
        ['Today', ['today-soon', 'today-evening']],
        ['Tomorrow', ['tomorrow']],
        ['This week', ['thursday', 'saturday', 'sunday']],
        ['Later', ['next-monday', 'later-morning']],
      ]
    );
  });

  it('ends the week on Saturday when the week starts on Sunday', () => {
    assert.equal(upcomingHeading(at(17, 11), NOW, 0), 'This week');
    assert.equal(upcomingHeading(at(18, 12), NOW, 0), 'Later');
    const sections = upcomingSections(items, null, NOW, 0);
    const week = sections.find((section) => section.title === 'This week');
    const later = sections.find((section) => section.title === 'Later');
    assert.deepEqual(week?.data.map((entry) => entry.id), ['thursday', 'saturday']);
    assert.deepEqual(later?.data.map((entry) => entry.id), ['sunday', 'next-monday', 'later-morning']);
  });

  it('keeps Tomorrow ahead of Later when tomorrow starts the next week', () => {
    const saturday = new Date(2026, 9, 17, 15, 0, 0);
    assert.equal(upcomingHeading(at(18, 9), saturday, 1), 'Tomorrow');
    assert.equal(upcomingHeading(at(19, 9), saturday, 1), 'Later');
  });

  it('filters a selected day down to that local day', () => {
    const thursday = { year: 2026, month: 10, day: 15 };
    const sections = upcomingSections(items, thursday, NOW, 1);
    assert.deepEqual(
      sections.map((section) => [section.title, section.data.map((entry) => entry.id)]),
      [['This week', ['thursday']]]
    );
    assert.deepEqual(upcomingSections(items, { year: 2026, month: 10, day: 20 }, NOW, 1), []);
  });
});
