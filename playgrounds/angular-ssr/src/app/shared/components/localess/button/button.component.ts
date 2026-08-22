import { Component } from '@angular/core';
import { SchemaComponent } from '@localess/angular';
import { Button } from '../../../models/localess';

@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent extends SchemaComponent<Button> {}
