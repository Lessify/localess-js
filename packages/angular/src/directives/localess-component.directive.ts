import {
  ComponentRef,
  DestroyRef,
  Directive,
  effect,
  inject,
  input,
  reflectComponentType,
  untracked,
  ViewContainerRef,
} from '@angular/core';
import type { Assets, ContentData, Links, References } from '@localess/client';

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
 * @example
 * ```html
 * <ng-container [llComponent]="content.data" [links]="content.links" [references]="content.references" [assets]="content.assets" />
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

  private componentRef: ComponentRef<unknown> | null = null;
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
   * Sets only the inputs the target component actually declares — registered components are
   * not required to accept `links`/`references`/`assets` (a fallback commonly only cares
   * about `data`), and `ComponentRef.setInput` throws for inputs a component doesn't declare.
   */
  private setInputs(data: ContentData, links: Links | undefined, references: References | undefined, assets: Assets | undefined): void {
    if (!this.componentRef) {
      return;
    }
    const inputNames = new Set(reflectComponentType(this.componentRef.componentType)?.inputs.map(i => i.propName));
    if (inputNames.has('data')) this.componentRef.setInput('data', data);
    if (inputNames.has('links')) this.componentRef.setInput('links', links);
    if (inputNames.has('references')) this.componentRef.setInput('references', references);
    if (inputNames.has('assets')) this.componentRef.setInput('assets', assets);
  }
}
