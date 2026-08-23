import {Component, inject} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {filter, map} from 'rxjs';
import {LOCALES} from './shared/utils/locales';
import {resolveLocaleAndSlug} from './shared/utils/route';
import {ThemeService} from './shared/services/theme.service';

function localeFromUrl(url: string): string {
  const segments = url.split('?')[0].split('/').filter(Boolean);
  return resolveLocaleAndSlug(segments).locale ?? '';
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'angular-ssr';
  LOCALES = LOCALES
  themeService = inject(ThemeService);
  private router = inject(Router);

  currentLocale = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(event => localeFromUrl(event.urlAfterRedirects))
    ),
    {initialValue: localeFromUrl(this.router.url)}
  );

  constructor() {
    console.log('Hello from AppComponent');
  }

  localeLinkClass(id: string): string {
    const classes = 'relative block px-3 py-2 transition hover:text-teal-500 dark:hover:text-teal-400';
    return id === this.currentLocale() ? classes + ' text-teal-500 dark:text-teal-400' : classes;
  }
}
