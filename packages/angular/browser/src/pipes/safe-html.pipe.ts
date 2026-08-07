import {DomSanitizer} from "@angular/platform-browser";
import {inject, Pipe, PipeTransform} from "@angular/core";

@Pipe({
  name: "llSafeHtml",
  standalone: true,
})
export class SafeHtmlPipe implements PipeTransform {
  sanitizer = inject(DomSanitizer)

  transform(html: string) {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
