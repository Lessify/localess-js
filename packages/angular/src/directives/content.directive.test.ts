import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { ContentDataSchema } from '../models';
import { ContentDirective } from './content.directive';

@Component({
  standalone: true,
  imports: [ContentDirective],
  template: `<div [llContent]="content"></div>`,
})
class HostComponent {
  content: ContentDataSchema = { _id: 'content-1', _schema: 'page' };
}

describe('ContentDirective', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('sets the data-ll-id and data-ll-schema attributes from the bound content', () => {
    const el: HTMLElement = fixture.nativeElement.querySelector('div');
    expect(el.getAttribute('data-ll-id')).toBe('content-1');
    expect(el.getAttribute('data-ll-schema')).toBe('page');
  });
});
