import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { type LocalessRichTextInput, type LocalessRichTextRenderers, renderRichTextToHtml } from '@localess/richtext';

/**
 * Converts a Localess rich text field to sanitizer-trusted HTML, synchronously.
 * The HTML is generated and escaped by `@localess/richtext` (never sourced from
 * raw input), which justifies `bypassSecurityTrustHtml`.
 *
 * @example
 * ```html
 * <div [innerHTML]="data.body | llRichText"></div>
 * ```
 */
@Pipe({ name: 'llRichText', standalone: true })
export class LocalessRichTextPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: LocalessRichTextInput, renderers?: LocalessRichTextRenderers<string>): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(renderRichTextToHtml(value, { renderers }));
  }
}
