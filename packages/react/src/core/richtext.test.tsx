import { richTextFixtures } from '@localess/richtext/test-utils';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LocalessRichText } from './components/localess-rich-text';
import { renderRichText, sanitizeUrl } from './richtext';

describe('renderRichText fixture parity', () => {
  for (const fixture of richTextFixtures) {
    it(fixture.title, () => {
      expect(renderToStaticMarkup(<>{renderRichText(fixture.input)}</>)).toBe(fixture.expected);
    });
  }
});

describe('renderRichText overrides', () => {
  it('renders a custom link component with children and node attrs', () => {
    const input = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Go', marks: [{ type: 'link', attrs: { href: 'https://x.com' } }] }],
        },
      ],
    } as any;
    const html = renderToStaticMarkup(
      <>
        {renderRichText(input, {
          renderers: {
            link: ({ attrs, children }: any) => (
              <a className="app-link" href={attrs.href}>
                {children}
              </a>
            ),
          },
        })}
      </>
    );
    expect(html).toBe('<p><a class="app-link" href="https://x.com">Go</a></p>');
  });

  it('passes a sanitized href to a custom link component', () => {
    const input = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Go', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }] },
      ],
    } as any;
    const hrefs: string[] = [];
    renderToStaticMarkup(
      <>
        {renderRichText(input, {
          renderers: {
            link: ({ attrs, children }: any) => {
              hrefs.push(attrs.href);
              return <span>{children}</span>;
            },
          },
        })}
      </>
    );
    expect(hrefs).toEqual(['']);
  });
});

describe('LocalessRichText component', () => {
  it('renders content', () => {
    const input = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }] } as any;
    expect(renderToStaticMarkup(<LocalessRichText content={input} />)).toBe('<p>Hi</p>');
  });
});

describe('sanitizeUrl re-export', () => {
  it('applies the rich text URL allowlist', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeUrl('/path')).toBe('/path');
  });
});
