import { ChangeDetectionStrategy, Component, effect, inject, input, linkedSignal } from '@angular/core';

import { LocalessComponentDirective } from '../directives/localess-component.directive';
import type { Content, ContentData } from '../models';
import { LocalessSyncService } from '../services/sync.service';

/**
 * Renders a full `Content` response and keeps it in sync with the Localess Visual Editor.
 *
 * Wraps the `[llComponent]` directive with a signal seeded from `document().data`, and
 * subscribes once to `LocalessSyncService.onChange` so `input`/`change` events replace the
 * rendered content without a full page reload — no manual sync wiring needed in consumer code.
 *
 * Sync only activates when `LocalessSyncService.enabled()` is `true` (`enableSync: true` was
 * passed to `provideLocaless`, running in the browser, inside the Visual Editor iframe).
 *
 * @example
 * ```html
 * <ll-document [document]="content" />
 * ```
 */
@Component({
  selector: 'll-document',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LocalessComponentDirective],
  template: `
    @if (contentData(); as data) {
      <ng-container [llComponent]="data" [links]="document().links" [references]="document().references" [assets]="document().assets" />
    } @else {
      <p><b>LocalessDocument</b> property <b>document.data</b> is not provided.</p>
    }
  `,
})
export class LocalessDocument<T extends ContentData = ContentData> {
  private readonly sync = inject(LocalessSyncService);

  readonly document = input.required<Content<T>>();

  readonly contentData = linkedSignal<ContentData | undefined>(() => this.document().data);

  constructor() {
    // Only this document's edits apply; the page may render several documents. Re-subscribes when
    // the document changes (e.g. route reuse), and the cleanup also runs when this component is destroyed.
    effect(onCleanup => {
      onCleanup(this.sync.onDocument(this.document().id, data => this.contentData.set(data)));
    });

    effect(() => {
      if (!this.contentData()) {
        console.error("LocalessDocument property 'document.data' is not provided.");
      }
    });
  }
}
