'use client';

import {isBrowser, isIframe} from "../core/utils";
import {isSyncEnabled} from "../core/state";
import {Content, ContentData} from "@localess/client";
import {useEffect} from "react";

export type LocalessSyncProps<T extends ContentData = ContentData> = {
  document: Content<T>;
}

export const LocalessSync = ((props: LocalessSyncProps) => {
  useEffect(() => {
    if (isSyncEnabled() && isBrowser() && isIframe()) {
      window.localess?.on(['input', 'change'], (event) => {
        if (event.type === 'change' || event.type === 'input') {
          props.document.data = event.data;
        }
      })
    }
  }, [])

  return null;
});
