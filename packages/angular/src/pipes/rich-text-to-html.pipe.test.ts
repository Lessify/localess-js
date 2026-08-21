import { RichTextToHtmlPipe } from './rich-text-to-html.pipe';

describe('RichTextToHtmlPipe', () => {
  it('returns an empty string for null/undefined without loading tiptap', async () => {
    const pipe = new RichTextToHtmlPipe();
    expect(await pipe.transform(null)).toBe('');
    expect(await pipe.transform(undefined)).toBe('');
  });

  it('returns a plain string unchanged without loading tiptap', async () => {
    const pipe = new RichTextToHtmlPipe();
    expect(await pipe.transform('<p>already html</p>')).toBe('<p>already html</p>');
  });

  it('converts Tiptap JSON content to an HTML string', async () => {
    const pipe = new RichTextToHtmlPipe();
    const result = await pipe.transform({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    } as never);
    expect(result).toContain('Hello');
    expect(result).toContain('<p>');
  });
});
