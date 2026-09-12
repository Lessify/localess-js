import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ThemeService } from './shared/services/theme.service';
import { LOCALES } from './shared/utils/locales';
import { resolveLocaleAndSlug, segmentsFromUrl } from './shared/utils/route';

function localeFromUrl(url: string): string {
  return resolveLocaleAndSlug(segmentsFromUrl(url)).locale ?? '';
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <div class="flex flex-col w-full gap-8 mx-auto max-w-5xl">
      <header class="flex items-center justify-center gap-4 py-8">
        <nav class="flex justify-center">
          <ul
            class="flex rounded-full bg-white/90 px-3 text-sm font-medium text-zinc-800 shadow-lg ring-1 shadow-zinc-800/5 ring-zinc-900/5 backdrop-blur-sm dark:bg-zinc-800/90 dark:text-zinc-200 dark:ring-white/10">
            @for (locale of LOCALES; track locale.id) {
              <li>
                <a
                  href="/{{ locale.id }}"
                  [class]="localeLinkClass(locale.id)"
                  [attr.aria-current]="locale.id === currentLocale() ? 'page' : null">
                  {{ locale.name }}
                </a>
              </li>
            }
          </ul>
        </nav>
        <button
          type="button"
          (click)="themeService.toggle()"
          aria-label="Toggle theme"
          class="flex size-9 items-center justify-center rounded-full bg-white/90 text-sm shadow-lg ring-1 shadow-zinc-800/5 ring-zinc-900/5 backdrop-blur-sm dark:bg-zinc-800/90 dark:ring-white/10">
          {{ themeService.theme() === 'dark' ? '☀️' : '🌙' }}
        </button>
      </header>
      <router-outlet />
    </div>
  `,
})
export class App {
  readonly LOCALES = LOCALES;
  readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);

  readonly currentLocale = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => localeFromUrl(event.urlAfterRedirects))
    ),
    { initialValue: localeFromUrl(this.router.url) }
  );

  localeLinkClass(id: string): string {
    const classes = 'relative block px-3 py-2 transition hover:text-teal-500 dark:hover:text-teal-400';
    return id === this.currentLocale() ? classes + ' text-teal-500 dark:text-teal-400' : classes;
  }
}
