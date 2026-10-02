import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { LOCALESS_CONFIG, LOCALESS_SYNC_READY, LocalessConfig } from '../localess.config';
import { localessSyncEvent, LocalessSyncService } from './sync.service';

describe('LocalessSyncService', () => {
  const baseConfig: LocalessConfig = {
    origin: 'https://cms.example.com',
    spaceId: 'space-1',
    token: 'token-123',
  };

  function createService(config: LocalessConfig, syncReady: Promise<void> = Promise.resolve()): LocalessSyncService {
    TestBed.configureTestingModule({
      providers: [
        LocalessSyncService,
        { provide: LOCALESS_CONFIG, useValue: config },
        { provide: LOCALESS_SYNC_READY, useValue: syncReady },
      ],
    });
    return TestBed.inject(LocalessSyncService);
  }

  it('reports disabled when enableSync is not set', () => {
    const service = createService(baseConfig);
    expect(service.enabled()).toBe(false);
  });

  it('reflects enableSync combined with the iframe/browser context', () => {
    // Simulate the Visual Editor iframe context (window.self !== window.top),
    // independent of whether the test runner itself embeds an iframe.
    const originalTop = window.top;
    Object.defineProperty(window, 'top', { value: {}, configurable: true });
    try {
      const service = createService({ ...baseConfig, enableSync: true });
      expect(service.enabled()).toBe(true);
    } finally {
      Object.defineProperty(window, 'top', { value: originalTop, configurable: true });
    }
  });

  it('resolves ready() with the injected promise', async () => {
    let resolved = false;
    const readyPromise = Promise.resolve().then(() => {
      resolved = true;
    });
    const service = createService(baseConfig, readyPromise);

    await service.ready();
    expect(resolved).toBe(true);
  });

  it('does not subscribe via on() when sync is disabled', () => {
    const service = createService(baseConfig);
    const callback = vi.fn();

    service.on('change', callback);

    expect(callback).not.toHaveBeenCalled();
  });

  it('does not subscribe via onChange() when sync is disabled', () => {
    const service = createService(baseConfig);
    const callback = vi.fn();

    service.onChange(callback);

    expect(callback).not.toHaveBeenCalled();
  });

  describe('subscriptions', () => {
    const originalTop = window.top;
    let listeners: Map<string, Set<(event: unknown) => void>>;
    let on: ReturnType<typeof vi.fn<(types: string | string[], callback: (event: unknown) => void) => () => void>>;
    let detach: ReturnType<typeof vi.fn<() => void>>;

    beforeEach(() => {
      // Inside the Visual Editor frame, with a script that records what is attached.
      Object.defineProperty(window, 'top', { value: {}, configurable: true });
      listeners = new Map();
      detach = vi.fn<() => void>();
      on = vi.fn((types: string | string[], callback: (event: unknown) => void) => {
        const list = Array.isArray(types) ? types : [types];
        list.forEach(type => (listeners.get(type) ?? listeners.set(type, new Set()).get(type)!).add(callback));
        return () => {
          detach();
          list.forEach(type => listeners.get(type)?.delete(callback));
        };
      });
      window.localess = {
        on,
        onChange: (callback: (event: unknown) => void) => on(['input', 'change'], callback),
        off: vi.fn(),
      } as unknown as NonNullable<Window['localess']>;
    });

    afterEach(() => {
      Object.defineProperty(window, 'top', { value: originalTop, configurable: true });
      delete window.localess;
    });

    const emit = (event: { type: string; documentId?: string; data?: unknown }) =>
      listeners.get(event.type)?.forEach(callback => callback(event));
    const settle = () => new Promise(resolve => setTimeout(resolve));

    it('returns a function that removes the subscription', async () => {
      const service = createService({ ...baseConfig, enableSync: true });
      const callback = vi.fn();

      const unsubscribe = service.on('save', callback);
      await settle();
      emit({ type: 'save', documentId: 'doc-1' });
      unsubscribe();
      unsubscribe();
      emit({ type: 'save', documentId: 'doc-1' });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(detach).toHaveBeenCalledTimes(1);
    });

    it("onDocument() delivers only the given document's edits, as data", async () => {
      const service = createService({ ...baseConfig, enableSync: true });
      const callback = vi.fn();

      service.onDocument('doc-1', callback);
      await settle();
      emit({ type: 'input', documentId: 'header', data: { title: 'Header' } });
      emit({ type: 'change', documentId: 'doc-1', data: { title: 'Edited' } });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0]).toEqual({ title: 'Edited' });
    });

    it('never attaches when unsubscribed before the script is ready', async () => {
      let ready!: () => void;
      const service = createService({ ...baseConfig, enableSync: true }, new Promise<void>(resolve => (ready = resolve)));

      service.onChange(vi.fn())();
      ready();
      await settle();

      expect(on).not.toHaveBeenCalled();
    });

    it('removes a subscription made in a constructor when the component is destroyed', async () => {
      const callback = vi.fn();
      @Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
      class ConstructorSubscriber {
        constructor() {
          inject(LocalessSyncService).onChange(callback);
        }
      }
      createService({ ...baseConfig, enableSync: true });
      const fixture = TestBed.createComponent(ConstructorSubscriber);
      await settle();
      emit({ type: 'input', documentId: 'doc-1', data: {} });

      fixture.destroy();
      emit({ type: 'change', documentId: 'doc-1', data: {} });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(detach).toHaveBeenCalledTimes(1);
    });

    it('removes a subscription made outside an injection context when the given destroyRef is destroyed', async () => {
      const callback = vi.fn();
      @Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
      class OnInitSubscriber implements OnInit {
        private readonly sync = inject(LocalessSyncService);
        private readonly destroyRef = inject(DestroyRef);

        ngOnInit(): void {
          this.sync.on('save', callback, this.destroyRef);
        }
      }
      createService({ ...baseConfig, enableSync: true });
      const fixture = TestBed.createComponent(OnInitSubscriber);
      fixture.detectChanges();
      await settle();

      fixture.destroy();
      emit({ type: 'save', documentId: 'doc-1' });

      expect(callback).not.toHaveBeenCalled();
      expect(detach).toHaveBeenCalledTimes(1);
    });

    it('keeps a subscription made outside an injection context until it is removed', async () => {
      const service = createService({ ...baseConfig, enableSync: true });
      const callback = vi.fn();

      service.on('save', callback);
      await settle();
      TestBed.resetTestingModule();
      emit({ type: 'save', documentId: 'doc-1' });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('localessSyncEvent() exposes the latest event as a signal and cleans up with its component', async () => {
      @Component({ template: '', changeDetection: ChangeDetectionStrategy.OnPush })
      class SignalReader {
        readonly saved = localessSyncEvent(['save', 'publish']);
      }
      createService({ ...baseConfig, enableSync: true });
      const fixture = TestBed.createComponent(SignalReader);
      expect(fixture.componentInstance.saved()).toBeUndefined();
      await settle();

      emit({ type: 'publish', documentId: 'doc-1' });
      expect(fixture.componentInstance.saved()).toEqual({ type: 'publish', documentId: 'doc-1' });

      fixture.destroy();
      expect(detach).toHaveBeenCalledTimes(1);
    });

    it('localessSyncEvent() must be called in an injection context', () => {
      expect(() => localessSyncEvent('save')).toThrow();
    });
  });
});
