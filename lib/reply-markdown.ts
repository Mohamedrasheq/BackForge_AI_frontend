/**
 * Tiny markdown subset for Ask replies: paragraphs, **bold**, `- ` / `* ` bullets
 * and `1.` numbered lists. Everything else stays plain text.
 */

export type ReplySpan = { text: string; bold: boolean };

export type ReplyBlock =
  | { kind: 'paragraph'; spans: ReplySpan[] }
  | { kind: 'bullets'; items: ReplySpan[][] }
  | { kind: 'numbered'; items: { marker: string; spans: ReplySpan[] }[] };

const BULLET = /^[-*][ \t]+(\S.*)$/;
const NUMBERED = /^(\d+)\.[ \t]+(\S.*)$/;

export function parseInline(text: string): ReplySpan[] {
  const spans: ReplySpan[] = [];
  const push = (value: string, bold: boolean) => {
    if (!value) return;
    const last = spans[spans.length - 1];
    if (last && last.bold === bold) last.text += value;
    else spans.push({ text: value, bold });
  };

  let rest = text;
  while (rest) {
    const open = rest.indexOf('**');
    if (open === -1) break;
    const close = rest.indexOf('**', open + 2);
    if (close === -1) break;
    const inner = rest.slice(open + 2, close);
    if (!inner.trim()) {
      push(rest.slice(0, close + 2), false);
      rest = rest.slice(close + 2);
      continue;
    }
    push(rest.slice(0, open), false);
    push(inner, true);
    rest = rest.slice(close + 2);
  }
  push(rest, false);
  return spans;
}

export function parseReply(text: string): ReplyBlock[] {
  const blocks: ReplyBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: 'paragraph', spans: parseInline(paragraph.join('\n')) });
    paragraph = [];
  };

  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      continue;
    }
    const bullet = BULLET.exec(line);
    const numbered = bullet ? null : NUMBERED.exec(line);
    if (!bullet && !numbered) {
      paragraph.push(line);
      continue;
    }
    flushParagraph();
    const last = blocks[blocks.length - 1];
    if (bullet) {
      const spans = parseInline(bullet[1]);
      if (last?.kind === 'bullets') last.items.push(spans);
      else blocks.push({ kind: 'bullets', items: [spans] });
    } else if (numbered) {
      const item = { marker: `${numbered[1]}.`, spans: parseInline(numbered[2]) };
      if (last?.kind === 'numbered') last.items.push(item);
      else blocks.push({ kind: 'numbered', items: [item] });
    }
  }
  flushParagraph();
  return blocks;
}

function spansText(spans: ReplySpan[]): string {
  return spans.map((span) => span.text).join('');
}

/** Reply without markdown symbols, for screen readers and announcements. */
export function replyPlainText(text: string): string {
  return parseReply(text)
    .map((block) => {
      if (block.kind === 'paragraph') return spansText(block.spans);
      if (block.kind === 'bullets') return block.items.map(spansText).join('\n');
      return block.items.map((item) => `${item.marker} ${spansText(item.spans)}`).join('\n');
    })
    .join('\n\n');
}
