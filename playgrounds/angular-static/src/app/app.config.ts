import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { provideLocaless, withLocalessComponents } from '@localess/angular';
import { routes } from './app.routes';
import { PageComponent } from './shared/components/localess/page/page.component';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(
      withHttpTransferCacheOptions({
        filter: req => !req.url.startsWith('https://demo.localess.org'),
      })
    ),
    provideHttpClient(withFetch()),
    provideLocaless(
      {
        origin: 'https://demo.localess.org', // Replace it for your origin
        spaceId: 'MmaT4DL0kJ6nXIILUcQF', // Replace it for your spaceId
        token: 'Y4rvboPnyzVeC7LddEK5', // Replace it for your Public token
        debug: true,
        enableSync: true,
      },
      withLocalessComponents({
        Page: PageComponent, // eager — always needed, it's the page root
        Button: () => import('./shared/components/localess/button/button.component').then(m => m.ButtonComponent), // lazy
      })
    ),
  ],
};
