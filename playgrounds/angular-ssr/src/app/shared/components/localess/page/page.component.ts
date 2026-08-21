import { Component, input } from '@angular/core';
import { Content } from '@localess/angular';
import {SchemaComponent} from "@localess/angular/src/components/schema.component";
import {Page} from "../../../models/localess";

@Component({
  selector: 'app-page',
  imports: [],
  templateUrl: './page.component.html',
  styleUrl: './page.component.scss',
})
export class PageComponent extends SchemaComponent<Page>{
}
