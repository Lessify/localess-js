import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { LOCALESS_COMPONENTS } from '../localess.components';
import type { Content, EventToAppOf } from '../models';
import { LocalessClientService } from '../services/client.service';
import { LocalessComponentResolver } from '../services/component-resolver.service';
import { LocalessSyncService } from '../services/sync.service';
import { LocalessDocument } from './localess-document.component';
import { SchemaComponent } from './schema.component';

@Component({ selector: 'll-test-hero', template: "hero: {{ data()['title'] }}" })
class HeroComponent extends SchemaComponent {}

@Component({
  standalone: true,
  imports: [LocalessDocument],
  template: `<ll-document [document]="document()" />`,
})
class HostComponent {
  document = input.required<Content>();
}

function flushAsync(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

describe('LocalessDocument', () => {
  let fixture: ComponentFixture<HostComponent>;
  let onChangeCallback: ((event: EventToAppOf<'change' | 'input'>) => void) | undefined;

  function setup(): void {
    onChangeCallback = undefined;
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        LocalessComponentResolver,
        LocalessClientService,
        { provide: LOCALESS_COMPONENTS, useValue: { hero: HeroComponent } },
        {
          provide: LocalessSyncService,
          useValue: {
            onChange: (callback: (event: EventToAppOf<'change' | 'input'>) => void) => {
              onChangeCallback = callback;
            },
          },
        },
      ],
    });
    fixture = TestBed.createComponent(HostComponent);
  }

  async function flush(): Promise<void> {
    fixture.detectChanges();
    await flushAsync();
    fixture.detectChanges();
  }

  it("renders the document's initial data", async () => {
    setup();
    fixture.componentRef.setInput('document', { id: 'doc-1', data: { _id: '1', _schema: 'hero', title: 'Hello' } });
    await flush();

    expect(fixture.nativeElement.textContent).toContain('hero: Hello');
  });

  it('re-renders with the updated data when a Visual Editor sync change event fires', async () => {
    setup();
    fixture.componentRef.setInput('document', { id: 'doc-1', data: { _id: '1', _schema: 'hero', title: 'Hello' } });
    await flush();

    onChangeCallback?.({ type: 'change', data: { _id: '1', _schema: 'hero', title: 'Updated live' } } as EventToAppOf<'change'>);
    await flush();

    expect(fixture.nativeElement.textContent).toContain('hero: Updated live');
  });

  it('logs an error and renders nothing when the document has no data', async () => {
    setup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    fixture.componentRef.setInput('document', { id: 'doc-1' });
    await flush();

    expect(consoleError).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('ll-test-hero')).toBeNull();

    consoleError.mockRestore();
  });
});
