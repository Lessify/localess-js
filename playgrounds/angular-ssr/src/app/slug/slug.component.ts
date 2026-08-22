import { Component, input } from '@angular/core';
import { Content, LocalessDocument } from '@localess/angular';
import { Page } from '../shared/models/localess';

@Component({
  selector: 'app-slug',
  imports: [LocalessDocument],
  templateUrl: './slug.component.html',
  styleUrl: './slug.component.scss',
})
export class SlugComponent {
  content = input<Content<Page>>();
}
