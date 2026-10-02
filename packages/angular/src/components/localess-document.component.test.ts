import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { LOCALESS_COMPONENTS } from '../localess.components';
import type { Content, ContentData } from '../models';
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
  let subscriptions: { documentId: string; callback: (data: ContentData) => void; active: boolean }[];

  function setup(): void {
    subscriptions = [];
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [
        LocalessComponentResolver,
        LocalessClientService,
        { provide: LOCALESS_COMPONENTS, useValue: { hero: HeroComponent } },
        {
          provide: LocalessSyncService,
          useValue: {
            onDocument: (documentId: string, callback: (data: ContentData) => void) => {
              const subscription = { documentId, callback, active: true };
              subscriptions.push(subscription);
              return () => (subscription.active = false);
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

    subscriptions[0].callback({ _id: '1', _schema: 'hero', title: 'Updated live' });
    await flush();

    expect(fixture.nativeElement.textContent).toContain('hero: Updated live');
  });

  // Filtering by documentId itself is covered in LocalessSyncService.onDocument's tests.
  it('subscribes to its own document, and follows a document change', async () => {
    setup();
    fixture.componentRef.setInput('document', { id: 'doc-1', data: { _id: '1', _schema: 'hero', title: 'Hello' } });
    await flush();
    fixture.componentRef.setInput('document', { id: 'doc-2', data: { _id: '2', _schema: 'hero', title: 'About' } });
    await flush();

    expect(subscriptions.map(it => [it.documentId, it.active])).toEqual([
      ['doc-1', false],
      ['doc-2', true],
    ]);
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
