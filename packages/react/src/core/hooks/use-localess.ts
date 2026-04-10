import {useEffect, useState} from "react";
import {getLocalessClient, isSyncEnabled} from "../state";
import {ContentData, ContentFetchParams, isBrowser} from "@localess/client";
import {Content} from "../models";

export type UseLocalessOptions = ContentFetchParams & {

}

export const useLocaless = <T extends ContentData = ContentData>(slug: string | string[], options: UseLocalessOptions = {}):  Content<T> | undefined => {
  const [document, setDocument] = useState<Content<T>>();
  const client = getLocalessClient();
  let normalizedSlug: string;
  if (Array.isArray(slug)) {
    normalizedSlug = slug.join('/');
  } else {
    normalizedSlug = slug;
  }


  useEffect(() => {
    async function loadDocument() {
      const document = await client.getContentBySlug<T>(normalizedSlug, options)
      setDocument(document);
      if(isSyncEnabled()  && isBrowser()) {
        window.localess?.on(['input', 'change'], (event) => {
          if (event.type === 'change' || event.type === 'input') {
            setDocument({...document, data: event.data})
          }
        })
      }
    }
    loadDocument();
  }, [slug, options, client]);

  return document;
}
