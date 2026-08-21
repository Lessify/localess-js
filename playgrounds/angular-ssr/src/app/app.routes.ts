import { inject } from '@angular/core';
import { ResolveFn, Routes } from '@angular/router';
import { Content, LocalessApiError, LocalessContentService } from '@localess/angular';
import { resolveLocaleAndSlug } from './shared/utils/route';
import { SlugComponent } from './slug/slug.component';

const contentResolver: ResolveFn<Content | undefined> = async route => {
  const { locale, slug } = resolveLocaleAndSlug(route.url.map(segment => segment.path));
  try {
    return await inject(LocalessContentService).contentBySlug(slug, { locale });
  } catch (error) {
    if (error instanceof LocalessApiError && error.status === 404) {
      return undefined;
    }
    throw error;
  }
};

export const routes: Routes = [
  {
    path: '**',
    component: SlugComponent,
    resolve: {
      content: contentResolver,
    },
  },
];
