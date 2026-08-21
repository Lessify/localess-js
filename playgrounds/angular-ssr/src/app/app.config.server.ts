import { provideServerRendering, withRoutes } from '@angular/ssr';
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideLocaless } from '@localess/angular';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    provideLocaless({
      origin: 'https://demo.localess.org', // Replace it for your origin
      spaceId: 'MmaT4DL0kJ6nXIILUcQF', // Replace it for your spaceId
      token: 'Y4rvboPnyzVeC7LddEK5', // Replace it for your secret token — server-only, overrides the public token from app.config.ts for this platform
      debug: true,
    }),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
