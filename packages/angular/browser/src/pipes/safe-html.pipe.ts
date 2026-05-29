import {DomSanitizer} from "@angular/platform-browser";
import {Pipe, PipeTransform} from "@angular/core";

@Pipe({
  name: "llSafeHtml",
  standalone: true,
})
export class SafeHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {
  }

  transform(html: string) {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
