import { describe, expect, it } from 'vitest';

import { buildMarkTree } from './marks';

const bold = { type: 'bold' } as const;
const italic = { type: 'italic' } as const;
const link = { type: 'link', attrs: { href: 'https://x.com' } } as const;
const otherLink = { type: 'link', attrs: { href: 'https://y.com' } } as const;

describe('buildMarkTree', () => {
  it('returns bare text segments for unmarked text', () => {
    expect(buildMarkTree([{ text: 'a' }, { text: 'b' }])).toEqual([
      { kind: 'text', text: 'a' },
      { kind: 'text', text: 'b' },
    ]);
  });

  it('wraps marked text', () => {
    expect(buildMarkTree([{ text: 'a', marks: [bold] }])).toEqual([{ kind: 'mark', mark: bold, children: [{ kind: 'text', text: 'a' }] }]);
  });

  it('merges adjacent nodes sharing an outer mark', () => {
    expect(
      buildMarkTree([
        { text: 'a', marks: [bold] },
        { text: 'b', marks: [bold, italic] },
      ])
    ).toEqual([
      {
        kind: 'mark',
        mark: bold,
        children: [
          { kind: 'text', text: 'a' },
          { kind: 'mark', mark: italic, children: [{ kind: 'text', text: 'b' }] },
        ],
      },
    ]);
  });

  it('merges a link spanning differently-marked text into one group', () => {
    const tree = buildMarkTree([
      { text: 'go ', marks: [link] },
      { text: 'bold', marks: [link, bold] },
      { text: ' now', marks: [link] },
    ]);
    expect(tree).toHaveLength(1);
    expect((tree[0] as any).mark).toEqual(link);
    expect((tree[0] as any).children).toEqual([
      { kind: 'text', text: 'go ' },
      { kind: 'mark', mark: bold, children: [{ kind: 'text', text: 'bold' }] },
      { kind: 'text', text: ' now' },
    ]);
  });

  it('does not merge links with different attrs', () => {
    const tree = buildMarkTree([
      { text: 'a', marks: [link] },
      { text: 'b', marks: [otherLink] },
    ]);
    expect(tree).toHaveLength(2);
  });

  it('closes and reopens marks when the shared prefix breaks', () => {
    const tree = buildMarkTree([
      { text: 'a', marks: [bold] },
      { text: 'b', marks: [italic] },
    ]);
    expect(tree).toEqual([
      { kind: 'mark', mark: bold, children: [{ kind: 'text', text: 'a' }] },
      { kind: 'mark', mark: italic, children: [{ kind: 'text', text: 'b' }] },
    ]);
  });
});
