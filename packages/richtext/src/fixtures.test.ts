import { describe, expect, it } from 'vitest';

import { renderRichTextToHtml } from './render-html';
import { richTextFixtures } from './test-utils/fixtures';

describe('renderRichTextToHtml against the fixture corpus', () => {
  for (const fixture of richTextFixtures) {
    it(fixture.title, () => {
      expect(renderRichTextToHtml(fixture.input)).toBe(fixture.expected);
    });
  }
});
