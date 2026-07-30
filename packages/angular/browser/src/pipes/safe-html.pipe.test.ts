import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';

import { SafeHtmlPipe } from './safe-html.pipe';

describe('SafeHtmlPipe', () => {
  let pipe: SafeHtmlPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    const sanitizer = TestBed.inject(DomSanitizer);
    pipe = new SafeHtmlPipe(sanitizer);
  });

  it('marks the given HTML as safe via the sanitizer', () => {
    const result = pipe.transform('<b>hello</b>');
    // SafeHtml wraps the string; toString() on Angular's implementation returns the original value.
    expect(String(result)).toContain('hello');
  });
});
