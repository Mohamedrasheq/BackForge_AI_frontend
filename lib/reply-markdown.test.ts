import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseInline, parseReply, replyPlainText } from './reply-markdown';

describe('parseInline', () => {
  it('splits bold runs out of plain text', () => {
    assert.deepEqual(parseInline('Pay **rent** today'), [
      { text: 'Pay ', bold: false },
      { text: 'rent', bold: true },
      { text: ' today', bold: false },
    ]);
  });

  it('handles several bold runs and bold at the edges', () => {
    assert.deepEqual(parseInline('**Two** things: **rent** and **gym**'), [
      { text: 'Two', bold: true },
      { text: ' things: ', bold: false },
      { text: 'rent', bold: true },
      { text: ' and ', bold: false },
      { text: 'gym', bold: true },
    ]);
  });

  it('keeps an unclosed marker as plain text', () => {
    assert.deepEqual(parseInline('5 ** 2 is big'), [{ text: '5 ** 2 is big', bold: false }]);
  });

  it('keeps an empty pair as plain text', () => {
    assert.deepEqual(parseInline('a **** b'), [{ text: 'a **** b', bold: false }]);
  });
});

describe('parseReply', () => {
  it('returns plain text as one paragraph', () => {
    assert.deepEqual(parseReply('You have nothing due today.'), [
      { kind: 'paragraph', spans: [{ text: 'You have nothing due today.', bold: false }] },
    ]);
  });

  it('splits paragraphs on blank lines and keeps single line breaks', () => {
    assert.deepEqual(parseReply('First line\nsame paragraph\n\nSecond'), [
      { kind: 'paragraph', spans: [{ text: 'First line\nsame paragraph', bold: false }] },
      { kind: 'paragraph', spans: [{ text: 'Second', bold: false }] },
    ]);
  });

  it('parses - and * bullets into one list', () => {
    assert.deepEqual(parseReply('Due this week:\n- Pay **rent**\n* Call mom'), [
      { kind: 'paragraph', spans: [{ text: 'Due this week:', bold: false }] },
      {
        kind: 'bullets',
        items: [
          [
            { text: 'Pay ', bold: false },
            { text: 'rent', bold: true },
          ],
          [{ text: 'Call mom', bold: false }],
        ],
      },
    ]);
  });

  it('parses numbered lists and keeps their numbers', () => {
    assert.deepEqual(parseReply('1. Gym\n2. **Groceries**\n\nThat is all.'), [
      {
        kind: 'numbered',
        items: [
          { marker: '1.', spans: [{ text: 'Gym', bold: false }] },
          { marker: '2.', spans: [{ text: 'Groceries', bold: true }] },
        ],
      },
      { kind: 'paragraph', spans: [{ text: 'That is all.', bold: false }] },
    ]);
  });

  it('starts a new list when the list type changes', () => {
    const blocks = parseReply('- a\n1. b');
    assert.deepEqual(
      blocks.map((block) => block.kind),
      ['bullets', 'numbered']
    );
  });

  it('falls back to plain text for unsupported markdown', () => {
    assert.deepEqual(parseReply('# Heading\n*soft* and `code`\n-5 degrees\n1) one'), [
      {
        kind: 'paragraph',
        spans: [{ text: '# Heading\n*soft* and `code`\n-5 degrees\n1) one', bold: false }],
      },
    ]);
  });

  it('does not read a bold line start as a bullet', () => {
    assert.deepEqual(parseReply('**Rent** is due'), [
      {
        kind: 'paragraph',
        spans: [
          { text: 'Rent', bold: true },
          { text: ' is due', bold: false },
        ],
      },
    ]);
  });

  it('returns no blocks for empty text', () => {
    assert.deepEqual(parseReply('  \n\n'), []);
  });
});

describe('replyPlainText', () => {
  it('drops the supported markdown symbols', () => {
    assert.equal(
      replyPlainText('Two things:\n- Pay **rent**\n- Gym\n\n1. First'),
      'Two things:\n\nPay rent\nGym\n\n1. First'
    );
  });
});
