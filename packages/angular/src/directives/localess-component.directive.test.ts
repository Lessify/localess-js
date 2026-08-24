import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ContentData } from '@localess/client';

import { SchemaComponent } from '../components/schema.component';
import { LOCALESS_COMPONENTS, LOCALESS_FALLBACK_COMPONENT } from '../localess.components';
import { LocalessClientService } from '../services/client.service';
import { LocalessComponentResolver } from '../services/component-resolver.service';
import { LocalessComponentDirective } from './localess-component.directive';

@Component({ selector: 'll-test-hero', template: "hero: {{ data()['title'] }}" })
class HeroComponent extends SchemaComponent {}

@Component({ selector: 'll-test-teaser', template: 'teaser' })
class TeaserComponent extends SchemaComponent {}

@Component({ selector: 'll-test-fallback', template: 'fallback: {{ data()._schema }}' })
class FallbackComponent extends SchemaComponent {}

@Component({
  standalone: true,
  imports: [LocalessComponentDirective],
  template: `<ng-container [llComponent]="data()" />`,
})
class HostComponent {
  data = input<ContentData | null | undefined>();
}

/**
 * Waits for a macrotask tick, which only runs once the JS microtask queue has fully drained —
 * unlike `fixture.whenStable()`, this reliably flushes chained/nested promises (e.g. a lazy
 * loader awaited inside `LocalessComponentResolver.resolve()`) regardless of zone tracking.
 */
function flushAsync(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('LocalessComponentDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  function setup(components: Record<string, unknown>, fallback?: unknown): void {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        LocalessComponentResolver,
        LocalessClientService,
        { provide: LOCALESS_COMPONENTS, useValue: components },
        ...(fallback ? [{ provide: LOCALESS_FALLBACK_COMPONENT, useValue: fallback }] : []),
      ],
    });
    fixture = TestBed.createComponent(HostComponent);
  }

  it('renders the eagerly-registered component matching the data schema', async () => {
    setup({ hero: HeroComponent });
    fixture.componentRef.setInput('data', { _id: '1', _schema: 'hero', title: 'Hello' });
    fixture.detectChanges();
    await flushAsync();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('hero: Hello');
  });

  it('renders a lazy-loaded component after its loader resolves', async () => {
    setup({ teaser: () => Promise.resolve(TeaserComponent) });
    fixture.componentRef.setInput('data', { _id: '1', _schema: 'teaser' });
    fixture.detectChanges();
    await flushAsync();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('teaser');
  });

  it('updates the existing component instance instead of recreating it when the schema is unchanged', async () => {
    setup({ hero: HeroComponent });
    fixture.componentRef.setInput('data', { _id: '1', _schema: 'hero', title: 'First' });
    fixture.detectChanges();
    await flushAsync();
    fixture.detectChanges();
    const firstInstance = fixture.nativeElement.querySelector('ll-test-hero');

    fixture.componentRef.setInput('data', { _id: '1', _schema: 'hero', title: 'Second' });
    fixture.detectChanges();
    await flushAsync();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('hero: Second');
    expect(fixture.nativeElement.querySelector('ll-test-hero')).toBe(firstInstance);
  });

  it('recreates the component when the schema changes', async () => {
    setup({ hero: HeroComponent, teaser: TeaserComponent });
    fixture.componentRef.setInput('data', { _id: '1', _schema: 'hero', title: 'Hello' });
    fixture.detectChanges();
    await flushAsync();
    fixture.detectChanges();

    fixture.componentRef.setInput('data', { _id: '2', _schema: 'teaser' });
    fixture.detectChanges();
    await flushAsync();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ll-test-hero')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('teaser');
  });

  it('renders the fallback component when the schema has no match', async () => {
    setup({ hero: HeroComponent }, FallbackComponent);
    fixture.componentRef.setInput('data', { _id: '1', _schema: 'unknown-schema' });
    fixture.detectChanges();
    await flushAsync();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('fallback: unknown-schema');
  });

  it('renders nothing when the schema has no match and no fallback is registered', async () => {
    setup({ hero: HeroComponent });
    fixture.componentRef.setInput('data', { _id: '1', _schema: 'unknown-schema' });
    fixture.detectChanges();
    await flushAsync();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent?.trim()).toBe('');
  });

  it('renders nothing when data is not provided', async () => {
    setup({ hero: HeroComponent });
    fixture.detectChanges();
    await flushAsync();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent?.trim()).toBe('');
  });
});
