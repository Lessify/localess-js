import { SecurityContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { richTextFixtures } from '@localess/richtext/test-utils';
import { beforeEach, describe, expect, it } from 'vitest';

import { LocalessRichTextPipe } from './rich-text.pipe';

describe('LocalessRichTextPipe', () => {
  let pipe: LocalessRichTextPipe;
  let sanitizer: DomSanitizer;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [LocalessRichTextPipe] });
    pipe = TestBed.inject(LocalessRichTextPipe);
    sanitizer = TestBed.inject(DomSanitizer);
  });

  const unwrap = (value: unknown): string | null => sanitizer.sanitize(SecurityContext.HTML, value as any);

  for (const fixture of richTextFixtures) {
    it(fixture.title, () => {
      expect(unwrap(pipe.transform(fixture.input as any))).toBe(fixture.expected);
    });
  }

  it('applies custom renderers passed as the pipe argument', () => {
    const input: any = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }] };
    const html = unwrap(pipe.transform(input, { paragraph: ({ children }) => `<div class="rt-p">${children}</div>` }));
    expect(html).toBe('<div class="rt-p">Hi</div>');
  });
});
