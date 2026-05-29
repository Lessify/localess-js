import {Directive, ElementRef, input, OnInit} from "@angular/core";
import type {ContentDataSchema} from "../models";

@Directive({
  selector: '[data-ll-id]',
  standalone: true
})
export class ContentIdDirective {
}

@Directive({
  selector: '[data-ll-schema]',
  standalone: true
})
export class ContentSchemaDirective {
}

@Directive({
  selector: '[data-ll-field]',
  standalone: true
})
export class ContentFieldDirective {
}

@Directive({
  selector: '[llContent]',
  standalone: true
})
export class ContentDirective implements OnInit {
  content = input.required<ContentDataSchema>({alias: 'llContent'})

  constructor(
    private el: ElementRef
  ) {
  }

  ngOnInit(): void {
    this.el.nativeElement.setAttribute('data-ll-id', this.content()._id);
    this.el.nativeElement.setAttribute('data-ll-schema', this.content()._schema);
  }
}
