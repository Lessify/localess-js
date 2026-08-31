import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { LocalessRichText } from './localess-rich-text.component';

@Component({
  imports: [LocalessRichText],
  template: '<ll-rich-text [content]="doc()" />',
})
class HostComponent {
  doc = signal<any>({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }] });
}

describe('LocalessRichText component', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [HostComponent] }));

  it('renders content into its host element', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement.querySelector('ll-rich-text');
    expect(host.innerHTML).toBe('<p>Hi</p>');
  });

  it('re-renders when content changes', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    fixture.componentInstance.doc.set({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Two' }] }] });
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement.querySelector('ll-rich-text');
    expect(host.innerHTML).toBe('<p>Two</p>');
  });
});
