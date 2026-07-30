import type {ContentLink, Links} from "../models";

export function findLink(links: Links | undefined, link: ContentLink): string {
  switch (link.type) {
    case "content": {
      if (links) {
        const path = links[link.uri]
        if (path) {
          return '/' + path.fullSlug;
        } else {
          return '/not-found';
        }
      }
      return '/not-found';
    }
    case "url":
      return link.uri
    default:
      return 'no-type'
  }
}
