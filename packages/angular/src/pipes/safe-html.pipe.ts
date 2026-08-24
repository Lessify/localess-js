import { inject, Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
  name: 'llSafeHtml',
  standalone: true,
})
export class SafeHtmlPipe implements PipeTransform {
  sanitizer = inject(DomSanitizer);

  transform(html: string | null | undefined) {
    return this.sanitizer.bypassSecurityTrustHtml(html ?? '');
  }
}
