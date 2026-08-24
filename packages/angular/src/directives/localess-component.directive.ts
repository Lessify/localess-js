import { ComponentRef, DestroyRef, Directive, effect, inject, input, untracked, ViewContainerRef } from '@angular/core';

import type { SchemaComponent } from '../components/schema.component';
import type { Assets, ContentData, Links, References } from '../models';
import { LocalessComponentResolver } from '../services/component-resolver.service';

/**
 * Dynamically renders the component registered (via `withLocalessComponents()`) for the given
 * content's `_schema` key.
 *
 * Resolves the schema key through `LocalessComponentResolver` (supporting both eager and
 * lazy-loaded registry entries), then imperatively creates the matched component with
 * `ViewContainerRef.createComponent`. Recreates the component only when `_schema` changes;
 * otherwise reuses the existing instance and updates its `data`/`links`/`references`/`assets`
 * inputs, so unrelated content edits don't tear down component state.
 *
 * Renders directly at this directive's `ng-container` anchor — no wrapper element — so to
 * render a list, apply it inside an `@for` block rather than passing an array:
 *
 * @example
 * ```html
 * <ng-container [llComponent]="content.data" [links]="content.links" [references]="content.references" [assets]="content.assets" />
 *
 * @for (item of data().body; track item._id) {
 *   <ng-container [llComponent]="item" [links]="links()" [references]="references()" [assets]="assets()" />
 * }
 * ```
 */
@Directive({
  selector: '[llComponent]',
})
export class LocalessComponentDirective {
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly resolver = inject(LocalessComponentResolver);
  private readonly destroyRef = inject(DestroyRef);

  readonly llComponent = input.required<ContentData | null | undefined>();
  readonly links = input<Links>();
  readonly references = input<References>();
  readonly assets = input<Assets>();

  private componentRef: ComponentRef<SchemaComponent> | null = null;
  private currentSchema: string | null = null;
  private renderVersion = 0;

  constructor() {
    effect(() => {
      const data = this.llComponent();
      const links = this.links();
      const references = this.references();
      const assets = this.assets();
      untracked(() => this.render(data, links, references, assets));
    });

    this.destroyRef.onDestroy(() => this.componentRef?.destroy());
  }

  private clear(): void {
    this.componentRef?.destroy();
    this.componentRef = null;
    this.currentSchema = null;
    this.viewContainerRef.clear();
  }

  private async render(
    data: ContentData | null | undefined,
    links: Links | undefined,
    references: References | undefined,
    assets: Assets | undefined
  ): Promise<void> {
    const myVersion = ++this.renderVersion;

    if (!data) {
      this.clear();
      return;
    }

    const schema = data._schema;
    const componentType = await this.resolver.resolve(schema);

    if (myVersion !== this.renderVersion || this.destroyRef.destroyed) {
      return;
    }

    if (!componentType) {
      this.clear();
      return;
    }

    if (this.currentSchema !== schema) {
      this.clear();
      this.componentRef = this.viewContainerRef.createComponent(componentType);
    }

    this.currentSchema = schema;
    this.setInputs(data, links, references, assets);
  }

  /**
   * Sets the `data`/`links`/`references`/`assets` inputs every registered component declares
   * by extending {@link SchemaComponent}.
   */
  private setInputs(data: ContentData, links: Links | undefined, references: References | undefined, assets: Assets | undefined): void {
    if (!this.componentRef) {
      return;
    }
    this.componentRef.setInput('data', data);
    this.componentRef.setInput('links', links);
    this.componentRef.setInput('references', references);
    this.componentRef.setInput('assets', assets);
  }
}
