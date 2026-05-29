import {Component, input} from '@angular/core';
import {Content} from '@localess/js-client';

@Component({
  selector: 'app-slug',
  imports: [],
  templateUrl: './slug.component.html',
  styleUrl: './slug.component.scss'
})
export class SlugComponent {
  content = input.required<Content>()
  slug = input.required<string>()
  locale = input.required<string>()
  title = 'SlugComponent';

  constructor() {
    console.log('Hello from SlugComponent');
  }

}
