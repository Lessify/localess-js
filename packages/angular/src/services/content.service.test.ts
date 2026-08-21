import { PLATFORM_ID, TransferState, makeStateKey } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LocalessClientService } from './client.service';
import { LocalessContentService } from './content.service';

describe('LocalessContentService', () => {
  // None of these calls are wrapped in TestBed.runInInjectionContext — contentBySlug() must work
  // when called from outside an injection context (e.g. a component's ngOnInit), since it creates
  // its resource() using this service's own injector internally.
  function createService(platformId: string, getContentBySlug = vi.fn()) {
    TestBed.configureTestingModule({
      providers: [
        LocalessContentService,
        TransferState,
        { provide: PLATFORM_ID, useValue: platformId },
        { provide: LocalessClientService, useValue: { getContentBySlug, getContentById: vi.fn(), getLinks: vi.fn() } },
      ],
    });
    return {
      service: TestBed.inject(LocalessContentService),
      transferState: TestBed.inject(TransferState),
    };
  }

  it('fetches content on the server and writes it to TransferState', async () => {
    const getContentBySlug = vi.fn().mockResolvedValue({ _id: 'c1' });
    const { service, transferState } = createService('server', getContentBySlug);

    const ref = service.contentBySlug(() => 'home');
    await vi.waitFor(() => expect(ref.hasValue()).toBe(true));

    expect(getContentBySlug).toHaveBeenCalledWith('home', undefined);
    expect(transferState.get(makeStateKey<{ _id: string }>('ll:content:slug:home'), undefined)).toEqual({ _id: 'c1' });
  });

  it('hydrates from TransferState on the browser without calling the client', async () => {
    const getContentBySlug = vi.fn();
    const { service, transferState } = createService('browser', getContentBySlug);
    transferState.set(makeStateKey<{ _id: string }>('ll:content:slug:home'), { _id: 'c1' });

    const ref = service.contentBySlug(() => 'home');
    await vi.waitFor(() => expect(ref.hasValue()).toBe(true));

    expect(getContentBySlug).not.toHaveBeenCalled();
    expect(ref.value()).toEqual({ _id: 'c1' });
  });

  it('falls back to calling the client on the browser when nothing was hydrated (pure CSR)', async () => {
    const getContentBySlug = vi.fn().mockResolvedValue({ _id: 'c1' });
    const { service } = createService('browser', getContentBySlug);

    const ref = service.contentBySlug(() => 'home');
    await vi.waitFor(() => expect(ref.hasValue()).toBe(true));

    expect(getContentBySlug).toHaveBeenCalledWith('home', undefined);
    expect(ref.value()).toEqual({ _id: 'c1' });
  });
});
