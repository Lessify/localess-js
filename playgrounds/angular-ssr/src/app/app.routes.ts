import {inject} from '@angular/core';
import {ResolveFn, Routes} from '@angular/router';
import {Content} from '@localess/js-client';
import {LocalessService} from './shared/services/localess.service';
import {SlugComponent} from './slug/slug.component';

const resolveContent: ResolveFn<Content> = (route) => {
  const locale = route.queryParams['locale'] || undefined;
  const localessService = inject(LocalessService);
  return localessService.getContentBySlug('home', locale );
}

const wildcardSlugsResolver: ResolveFn<Array<string>> = (route) => {
  return route.url.map(segment => segment.path);
};

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/home',
    pathMatch: 'full',
  },
  {
    path: '**',
    component: SlugComponent,
    resolve: {
      content: resolveContent,
      slug: wildcardSlugsResolver
    }
  }
];
