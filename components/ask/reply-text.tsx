import { Theme } from '@/constants/theme';
import { parseReply, replyPlainText, type ReplySpan } from '@/lib/reply-markdown';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

function Spans({ spans }: { spans: ReplySpan[] }) {
  return (
    <Text style={styles.body}>
      {spans.map((span, index) =>
        span.bold ? (
          <Text key={index} style={styles.bold}>
            {span.text}
          </Text>
        ) : (
          span.text
        )
      )}
    </Text>
  );
}

function ListRow({ marker, spans, numbered }: { marker: string; spans: ReplySpan[]; numbered: boolean }) {
  return (
    <View style={styles.listRow}>
      <Text style={[styles.body, styles.marker, numbered && styles.numberMarker]}>{marker}</Text>
      <View style={styles.listBody}>
        <Spans spans={spans} />
      </View>
    </View>
  );
}

export function ReplyText({ text }: { text: string }) {
  const blocks = useMemo(() => parseReply(text), [text]);
  const label = useMemo(() => replyPlainText(text), [text]);
  if (blocks.length === 0) return null;

  return (
    <View style={styles.wrap} accessible accessibilityLabel={label}>
      {blocks.map((block, index) => {
        if (block.kind === 'paragraph') return <Spans key={index} spans={block.spans} />;
        if (block.kind === 'bullets') {
          return (
            <View key={index} style={styles.list}>
              {block.items.map((spans, row) => (
                <ListRow key={row} marker={'\u2022'} spans={spans} numbered={false} />
              ))}
            </View>
          );
        }
        return (
          <View key={index} style={styles.list}>
            {block.items.map((item, row) => (
              <ListRow key={row} marker={item.marker} spans={item.spans} numbered />
            ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    gap: 10,
  },
  body: {
    fontSize: Theme.type.body,
    lineHeight: 22,
    color: Theme.color.text,
  },
  bold: {
    fontWeight: '600',
  },
  list: {
    gap: 4,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  marker: {
    width: 18,
  },
  numberMarker: {
    width: 26,
    fontVariant: ['tabular-nums'],
  },
  listBody: {
    flex: 1,
    minWidth: 0,
  },
});
