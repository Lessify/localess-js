import { Component } from '@angular/core';
import { LocalessComponentDirective, SchemaComponent } from '@localess/angular';
import { Page } from '../../../models/localess';

@Component({
  selector: 'app-page',
  imports: [LocalessComponentDirective],
  templateUrl: './page.component.html',
  styleUrl: './page.component.scss',
})
export class PageComponent extends SchemaComponent<Page> {}
