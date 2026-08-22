import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Assets, ContentData, Links, References } from '@localess/client';

import { LocalessComponentDirective } from '../directives/localess-component.directive';

/**
 * Renders one or more content items by dynamically resolving each item's `_schema` against the
 * registry configured via `withLocalessComponents()`.
 *
 * Accepts either a single {@link ContentData} item or an array (e.g. a schema's body field),
 * so consumers don't need to `@for` over child blocks themselves.
 *
 * @example
 * ```html
 * <ll-component [data]="page.body" [links]="content.links" [references]="content.references" [assets]="content.assets" />
 * ```
 */
@Component({
  selector: 'll-component',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LocalessComponentDirective],
  template: `
    @for (item of items(); track item._id) {
      <ng-container [llComponent]="item" [links]="links()" [references]="references()" [assets]="assets()" />
    }
  `,
})
export class LocalessComponent {
  readonly data = input<ContentData | ContentData[] | null | undefined>();
  readonly links = input<Links>();
  readonly references = input<References>();
  readonly assets = input<Assets>();

  readonly items = computed<ContentData[]>(() => {
    const value = this.data();
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  });
}
