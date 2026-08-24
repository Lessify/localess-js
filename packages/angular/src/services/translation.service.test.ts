import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { LOCALESS_CONFIG, LocalessConfig } from '../localess.config';
import { LocalessClientService } from './client.service';
import { LocalessTranslationService } from './translation.service';

describe('LocalessTranslationService', () => {
  const config: LocalessConfig = { origin: 'https://cms.example.com', spaceId: 'space-1', token: 'token-123' };

  it('delegates to LocalessClientService.getTranslations', async () => {
    const getTranslations = vi.fn().mockResolvedValue({ hello: 'world' });
    TestBed.configureTestingModule({
      providers: [
        LocalessTranslationService,
        { provide: LOCALESS_CONFIG, useValue: config },
        { provide: LocalessClientService, useValue: { getTranslations } },
      ],
    });
    const service = TestBed.inject(LocalessTranslationService);

    const result = await service.fetch('en');

    expect(getTranslations).toHaveBeenCalledWith('en', undefined);
    expect(result).toEqual({ hello: 'world' });
  });

  it('forwards fetch params', async () => {
    const getTranslations = vi.fn().mockResolvedValue({});
    TestBed.configureTestingModule({
      providers: [
        LocalessTranslationService,
        { provide: LOCALESS_CONFIG, useValue: config },
        { provide: LocalessClientService, useValue: { getTranslations } },
      ],
    });
    const service = TestBed.inject(LocalessTranslationService);

    await service.fetch('en', { version: 'draft' });

    expect(getTranslations).toHaveBeenCalledWith('en', { version: 'draft' });
  });
});
