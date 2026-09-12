import { Component, inject, input } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { RouteMeta } from '@analogjs/router';
import { Content, LocalessApiError, LocalessContentService, LocalessDocument } from '@localess/angular';
import { Page } from '../shared/models/localess';
import { resolveLocaleAndSlug, segmentsFromUrl } from '../shared/utils/route';

const contentResolver: ResolveFn<Content | undefined> = async (_route, state) => {
  const { locale, slug } = resolveLocaleAndSlug(segmentsFromUrl(state.url));
  try {
    return await inject(LocalessContentService).contentBySlug(slug, { locale });
  } catch (error) {
    if (error instanceof LocalessApiError && error.status === 404) {
      return undefined;
    }
    throw error;
  }
};

export const routeMeta: RouteMeta = {
  resolve: { content: contentResolver },
};

@Component({
  selector: 'app-slug',
  imports: [LocalessDocument],
  template: `
    @if (content(); as content) {
      <ll-document [document]="content" />
    }
  `,
})
export default class SlugPage {
  readonly content = input<Content<Page>>();
}
