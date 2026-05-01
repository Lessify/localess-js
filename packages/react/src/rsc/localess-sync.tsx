'use client';

import { Content, ContentData, loadLocalessSync } from '@localess/client';
import { useEffect } from 'react';

import { isBrowser, isIframe } from '../core/utils';

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
        window.localess?.on(['input', 'change'], event => {
          console.info(`LocalessSync:change:`, event);
          if (event.type === 'change' || event.type === 'input') {
            props.document.data = event.data;
          }
        });
      }
    }
    loadSync();
  }, []);

  return null;
};
