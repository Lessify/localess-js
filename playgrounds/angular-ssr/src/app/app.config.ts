import {provideHttpClient, withFetch} from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import {provideRouter, withComponentInputBinding} from '@angular/router';

import { routes } from './app.routes';
import {provideClientHydration, withEventReplay, withHttpTransferCacheOptions} from '@angular/platform-browser';
import {provideLocalessBrowser} from '@localess/angular/browser';
import {LocalessService} from './shared/services/localess.service';
import { LocalessBrowserService } from './shared/services/localess-browser.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(
      withHttpTransferCacheOptions({
        filter: req => !req.url.startsWith("https://demo.localess.org"),
      }),
    ),
    provideHttpClient(withFetch()),
    provideLocalessBrowser({
      origin: "https://demo.localess.org", // Replace it for your origin
      spaceId: "MmaT4DL0kJ6nXIILUcQF", // Replace it for your spaceId
      debug: true,
      enableSync: true,
    }),
    {
      provide: LocalessService,
      useClass: LocalessBrowserService,
    },
  ]
};
