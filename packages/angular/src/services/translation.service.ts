import { inject, Injectable } from '@angular/core';
import type { TranslationFetchParams, Translations } from '@localess/client';

import { LocalessClientService } from './client.service';

@Injectable()
export class LocalessTranslationService {
  private readonly client = inject(LocalessClientService);

  /**
   * Retrieve all Translations by Localess for the given locale.
   */
  fetch(locale: string, params?: TranslationFetchParams): Promise<Translations> {
    return this.client.getTranslations(locale, params);
  }
}
