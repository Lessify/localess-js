import { Component, inject, input, OnInit } from '@angular/core';
import { LocalessContentService } from '@localess/angular';

@Component({
  selector: 'app-slug',
  imports: [],
  templateUrl: './slug.component.html',
  styleUrl: './slug.component.scss',
})
export class SlugComponent implements OnInit {
  slug = input.required<string>();
  locale = input<string>();
  title = 'SlugComponent';

  private readonly contentService = inject(LocalessContentService);
  content!: ReturnType<LocalessContentService['contentBySlug']>;

  constructor() {
    console.log('Hello from SlugComponent');
  }

  ngOnInit(): void {
    this.content = this.contentService.contentBySlug(() => this.slug(), { locale: this.locale() });
  }
}
