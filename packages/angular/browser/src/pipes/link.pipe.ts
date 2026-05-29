import {Pipe, PipeTransform} from "@angular/core";
import type {ContentLink, Links} from "../models";
import {findLink} from "../utils/link.utils";

@Pipe({
  name: 'llLink',
  standalone: true
})
export class LinkPipe implements PipeTransform {
  transform(links: Links, link: ContentLink): string {
    return findLink(links, link)
  }
}
