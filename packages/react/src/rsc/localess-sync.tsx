'use client';

import {isBrowser, isIframe} from "../core/utils";
import {getOrigin, isSyncEnabled} from "../core/state";
import {Content, ContentData, loadLocalessSync} from "@localess/client";
import {useEffect} from "react";

export type LocalessSyncProps<T extends ContentData = ContentData> = {
  document: Content<T>;
}

export const LocalessSync = ((props: LocalessSyncProps) => {
  console.info(`LocalessSync:init`);
  useEffect(() => {
    console.info(`LocalessSync:effect`, isSyncEnabled(), isBrowser(), isIframe());
    if (isSyncEnabled() && isBrowser() && isIframe()) {
      loadLocalessSync(getOrigin());
      window.localess?.on(['input', 'change'], (event) => {
        if (event.type === 'change' || event.type === 'input') {
          props.document.data = event.data;
        }
      })
    }
  }, [])

  return null;
});
