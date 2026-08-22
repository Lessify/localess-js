import { ChangeDetectionStrategy, Component, effect, inject, input, linkedSignal } from '@angular/core';
import type { Content, ContentData } from '@localess/client';

import { LocalessSyncService } from '../services/sync.service';
import { LocalessComponent } from './localess-component.component';

/**
 * Renders a full `Content` response and keeps it in sync with the Localess Visual Editor.
 *
 * Wraps {@link LocalessComponent} with a signal seeded from `document().data`, and subscribes
 * once to `LocalessSyncService.onChange` so `input`/`change` events replace the rendered content
 * without a full page reload — no manual sync wiring needed in consumer code.
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
  imports: [LocalessComponent],
  template: `
    @if (contentData(); as data) {
      <ll-component [data]="data" [links]="document().links" [references]="document().references" [assets]="document().assets" />
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
    this.sync.onChange(event => this.contentData.set(event.data));

    effect(() => {
      if (!this.contentData()) {
        console.error("LocalessDocument property 'document.data' is not provided.");
      }
    });
  }
}
