import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ContentData } from '@localess/client';

import { LOCALESS_COMPONENTS } from '../localess.components';
import { LocalessComponentResolver } from '../services/component-resolver.service';
import { LocalessComponent } from './localess-component.component';

@Component({ selector: 'll-test-hero', template: "hero: {{ data()?.['title'] }}" })
class HeroComponent {
  data = input<ContentData>();
}

@Component({ selector: 'll-test-teaser', template: 'teaser' })
class TeaserComponent {
  data = input<ContentData>();
}

@Component({
  standalone: true,
  imports: [LocalessComponent],
  template: `<ll-component [data]="data()" />`,
})
class HostComponent {
  data = input<ContentData | ContentData[] | null | undefined>();
}

function flushAsync(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('LocalessComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        LocalessComponentResolver,
        { provide: LOCALESS_COMPONENTS, useValue: { hero: HeroComponent, teaser: TeaserComponent } },
      ],
    });
    fixture = TestBed.createComponent(HostComponent);
  });

  async function flush(): Promise<void> {
    fixture.detectChanges();
    await flushAsync();
    fixture.detectChanges();
  }

  it('renders a single content item', async () => {
    fixture.componentRef.setInput('data', { _id: '1', _schema: 'hero', title: 'Hello' });
    await flush();

    expect(fixture.nativeElement.textContent).toContain('hero: Hello');
  });

  it('renders each item of an array of content items', async () => {
    fixture.componentRef.setInput('data', [
      { _id: '1', _schema: 'hero', title: 'Hello' },
      { _id: '2', _schema: 'teaser' },
    ]);
    await flush();

    expect(fixture.nativeElement.textContent).toContain('hero: Hello');
    expect(fixture.nativeElement.textContent).toContain('teaser');
  });

  it('renders nothing when data is undefined', async () => {
    await flush();

    expect(fixture.nativeElement.textContent?.trim()).toBe('');
  });
});
