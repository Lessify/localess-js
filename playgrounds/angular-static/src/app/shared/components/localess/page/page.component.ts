import { Component } from '@angular/core';
import { LocalessComponentDirective, LocalessRichText, SchemaComponent } from '@localess/angular';
import { Page } from '../../../models/localess';

@Component({
  selector: 'app-page',
  imports: [LocalessComponentDirective, LocalessRichText],
  templateUrl: './page.component.html',
  styleUrl: './page.component.scss',
})
export class PageComponent extends SchemaComponent<Page> {}
