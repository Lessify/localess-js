import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { withComponentInputBinding } from '@angular/router';
import { provideFileRouter, requestContextInterceptor } from '@analogjs/router';
import { provideLocaless, withLocalessComponents } from '@localess/angular';
import { PageComponent } from './shared/components/localess/page/page.component';
import { LOCALESS_CONNECTION } from './shared/utils/localess-config';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideFileRouter(withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([requestContextInterceptor])),
    provideClientHydration(
      withEventReplay(),
      withHttpTransferCacheOptions({
        filter: req => !req.url.startsWith('https://demo.localess.org'),
      })
    ),
    provideLocaless(
      {
        ...LOCALESS_CONNECTION,
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
