import { provideServerRendering, withRoutes } from '@angular/ssr';
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import {provideLocalessServer} from '@localess/angular/server';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import {LocalessServerService} from './shared/services/localess-server.service';
import {LocalessService} from './shared/services/localess.service';

const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering(withRoutes(serverRoutes)), provideLocalessServer({
      origin: "https://demo.localess.org", // Replace it for your origin
      spaceId: "MmaT4DL0kJ6nXIILUcQF", // Replace it for your spaceId
      version: "draft",
      token: "Y4rvboPnyzVeC7LddEK5", // Replace it for your token
      debug: true,
    }), {
      provide: LocalessService,
      useClass: LocalessServerService,
    }]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
