import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { type LocalessRichTextInput, type LocalessRichTextRenderers, renderRichTextToHtml } from '@localess/richtext';

/**
 * Renders a Localess rich text field into the host element.
 *
 * @example
 * ```html
 * <ll-rich-text [content]="data.body" />
 * ```
 */
@Component({
  selector: 'll-rich-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  host: { '[innerHTML]': 'html()' },
})
export class LocalessRichText {
  private readonly sanitizer = inject(DomSanitizer);

  readonly content = input.required<LocalessRichTextInput>();
  readonly renderers = input<LocalessRichTextRenderers<string>>();

  readonly html = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(renderRichTextToHtml(this.content(), { renderers: this.renderers() }))
  );
}
