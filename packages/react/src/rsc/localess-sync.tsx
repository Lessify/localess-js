'use client';

import {isBrowser, isIframe} from "../core/utils";
import {Content, ContentData, loadLocalessSync} from "@localess/client";
import {useEffect} from "react";

export type LocalessSyncProps<T extends ContentData = ContentData> = {
  document: Content<T>;
  origin: string;
  enableSync: boolean;
}

export const LocalessSync = ((props: LocalessSyncProps) => {
  console.info(`LocalessSync:init`);
  useEffect(() => {
    console.info(`LocalessSync:effect`, props.enableSync, isBrowser(), isIframe());
    if (props.enableSync && isBrowser() && isIframe()) {
      loadLocalessSync(props.origin);
      window.localess?.on(['input', 'change'], (event) => {
        if (event.type === 'change' || event.type === 'input') {
          props.document.data = event.data;
        }
      })
    }
  }, [])

  return null;
});
