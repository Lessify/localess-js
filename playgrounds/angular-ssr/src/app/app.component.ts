import {Component} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {LOCALES} from './shared/utils/locales';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'angular-ssr';
  LOCALES = LOCALES

  constructor() {
    console.log('Hello from AppComponent');
  }
}
