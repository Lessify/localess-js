import { TestBed } from '@angular/core/testing';

import { SafeHtmlPipe } from './safe-html.pipe';

describe('SafeHtmlPipe', () => {
  let pipe: SafeHtmlPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    pipe = TestBed.runInInjectionContext(() => new SafeHtmlPipe());
  });

  it('marks the given HTML as safe via the sanitizer', () => {
    const result = pipe.transform('<b>hello</b>');
    // SafeHtml wraps the string; toString() on Angular's implementation returns the original value.
    expect(String(result)).toContain('hello');
  });

  it('treats null/undefined (as emitted by the async pipe before resolution) as empty HTML', () => {
    expect(String(pipe.transform(null))).toBe(String(pipe.transform('')));
    expect(String(pipe.transform(undefined))).toBe(String(pipe.transform('')));
  });
});
