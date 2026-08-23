import {Component, inject} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {LOCALES} from './shared/utils/locales';
import {ThemeService} from './shared/services/theme.service';

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

  constructor() {
    console.log('Hello from AppComponent');
  }
}
