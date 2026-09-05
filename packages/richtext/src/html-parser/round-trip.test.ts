import { describe, expect, it } from 'vitest';

import { renderRichTextToHtml } from '../render-html';
import { richTextFixtures } from '../test-utils/fixtures';
import { parseHtmlToRichText } from './index';

/**
 * The strongest correctness signal available: every fixture already backs the
 * TipTap parity test, so if rendering a fixture, parsing that HTML, and
 * rendering again reproduces the same string, the parser is the renderer's
 * inverse over the whole supported model.
 */
describe('HTML round-trip over the fixture corpus', () => {
  for (const fixture of richTextFixtures) {
    it(`round-trips: ${fixture.title}`, () => {
      const html = renderRichTextToHtml(fixture.input);
      const { doc } = parseHtmlToRichText(html);

      expect(renderRichTextToHtml(doc)).toBe(html);
    });
  }

  it('reports nothing unsupported for any fixture', () => {
    for (const fixture of richTextFixtures) {
      const { unsupported } = parseHtmlToRichText(renderRichTextToHtml(fixture.input));
      expect(unsupported, fixture.title).toEqual([]);
    }
  });
});
