import { ResolveFn, Routes } from '@angular/router';
import { resolveLocaleAndSlug } from './shared/utils/route';
import { SlugComponent } from './slug/slug.component';

const localeResolver: ResolveFn<string | undefined> = route => {
  return resolveLocaleAndSlug(route.url.map(segment => segment.path)).locale;
};

const slugResolver: ResolveFn<string> = route => {
  return resolveLocaleAndSlug(route.url.map(segment => segment.path)).slug;
};

export const routes: Routes = [
  {
    path: '**',
    component: SlugComponent,
    resolve: {
      locale: localeResolver,
      slug: slugResolver,
    },
  },
];
