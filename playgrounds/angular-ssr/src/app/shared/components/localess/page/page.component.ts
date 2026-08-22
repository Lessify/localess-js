import { Component } from '@angular/core';
import { LocalessComponent, SchemaComponent } from '@localess/angular';
import { Page } from '../../../models/localess';

@Component({
  selector: 'app-page',
  imports: [LocalessComponent],
  templateUrl: './page.component.html',
  styleUrl: './page.component.scss',
})
export class PageComponent extends SchemaComponent<Page> {}
