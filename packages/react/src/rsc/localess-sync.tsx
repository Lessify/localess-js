'use client';

import {isIframe, isBrowser} from "../core/utils";
import {isSyncEnabled} from "../core/state";

export type LocalessSyncProps = {
}

export const LocalessSync = ((props: LocalessSyncProps) => {
  if (!isSyncEnabled() || !isBrowser() || !isIframe()) return null;

  return null;
});
