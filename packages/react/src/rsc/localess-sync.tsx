'use client';

import { Content, ContentData, loadLocalessSync } from '@localess/client';
import { useEffect } from 'react';

import { isBrowser, isIframe } from '../core/utils';
import {localessSyncOnChange} from "../core/state";

export type LocalessSyncProps<T extends ContentData = ContentData> = {
  document: Content<T>;
  origin: string;
  enableSync: boolean;
};

export const LocalessSync = (props: LocalessSyncProps) => {
  console.info(`LocalessSync:init`);
  useEffect(() => {
    async function loadSync() {
      if (props.enableSync && isBrowser() && isIframe()) {
        await loadLocalessSync(props.origin);
        localessSyncOnChange(event => {
          console.info(`LocalessSync:change:`, event);
          props.document.data = event.data;
        });
      }
    }
    loadSync();
  }, []);

  return null;
};
