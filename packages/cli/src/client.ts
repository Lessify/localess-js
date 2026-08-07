import { localessClient, LocalessClientOptions } from '@localess/client';
import { OpenAPIObject } from 'openapi3-ts/oas30';

import { version } from '../package.json';
import type { Schemas, Space, Translations, TranslationUpdate, TranslationUpdateResponse, TranslationUpdateType } from './models';
import { FG_BLUE, RESET } from './utils';

export type LocalessCliClientOptions = LocalessClientOptions & {
  /**
   * Number of times to retry failed fetch requests (network errors or 5xx). Default: 3
   */
  retryCount?: number;
  /**
   * Delay in ms between retries. Default: 500ms
   */
  retryDelay?: number;
};

const LOG_GROUP = `${FG_BLUE}[Localess:Client]${RESET}`;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryCount: number = 3,
  retryDelay: number = 500,
  debug?: boolean
): Promise<Response> {
  let attempt = 0;
  let lastError: any;
  while (attempt <= retryCount) {
    try {
      const response = await fetch(url, options);
      if (!response.ok && response.status >= 500) {
        if (debug) {
          console.log(LOG_GROUP, `fetchWithRetry: HTTP ${response.status} on attempt ${attempt + 1}`);
        }
        lastError = new Error(`HTTP ${response.status}`);
      } else {
        return response;
      }
    } catch (err) {
      if (debug) {
        console.log(LOG_GROUP, `fetchWithRetry: network error on attempt ${attempt + 1}`, err);
      }
      lastError = err;
    }
    attempt++;
    if (attempt <= retryCount) {
      await new Promise(res => setTimeout(res, retryDelay));
    }
  }
  throw lastError;
}

export function localessCliClient(options: LocalessCliClientOptions) {
  if (options.debug) {
    console.log(LOG_GROUP, 'Client Options : ', options);
  }
  const cdn = localessClient(options);
  const normalizedOrigin = options.origin.replace(/\/+$/, '');
  const fetchOptions: RequestInit = {
    redirect: 'follow',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Localess-Agent': 'Localess-CLI-Client',
      'X-Localess-Agent-Version': version,
    },
  };

  async function getSpace(): Promise<Space> {
    if (options.debug) {
      console.log(LOG_GROUP, 'getSpace()');
    }
    const url = `${normalizedOrigin}/api/v1/spaces/${options.spaceId}?token=${options.token}`;
    if (options.debug) {
      console.log(LOG_GROUP, 'getSpace fetch url : ', url);
    }
    const response = await fetchWithRetry(url, fetchOptions, options.retryCount, options.retryDelay, options.debug);
    if (options.debug) {
      console.log(LOG_GROUP, 'getSpace status : ', response.status);
    }
    return response.json();
  }

  async function getSchemas(): Promise<Schemas> {
    if (options.debug) {
      console.log(LOG_GROUP, 'getSchemas()');
    }
    const url = `${normalizedOrigin}/api/v1/spaces/${options.spaceId}/schemas?token=${options.token}`;
    if (options.debug) {
      console.log(LOG_GROUP, 'getSchemas fetch url : ', url);
    }
    const response = await fetchWithRetry(url, fetchOptions, options.retryCount, options.retryDelay, options.debug);
    if (options.debug) {
      console.log(LOG_GROUP, 'getSchemas status : ', response.status);
    }
    return response.json();
  }

  async function getOpenApi(): Promise<OpenAPIObject> {
    if (options.debug) {
      console.log(LOG_GROUP, 'getOpenApi()');
    }
    const url = `${normalizedOrigin}/api/v1/spaces/${options.spaceId}/open-api?token=${options.token}`;
    if (options.debug) {
      console.log(LOG_GROUP, 'getOpenApi fetch url : ', url);
    }
    const response = await fetchWithRetry(url, fetchOptions, options.retryCount, options.retryDelay, options.debug);
    if (options.debug) {
      console.log(LOG_GROUP, 'getOpenApi status : ', response.status);
    }
    return response.json();
  }

  async function updateTranslations(
    locale: string,
    type: TranslationUpdateType,
    values: Translations,
    dryRun?: boolean
  ): Promise<TranslationUpdateResponse> {
    if (options.debug) {
      console.log(LOG_GROUP, 'updateTranslations() locale : ', locale);
      console.log(LOG_GROUP, 'updateTranslations() type : ', type);
      console.log(LOG_GROUP, 'updateTranslations() values : ', JSON.stringify(values));
    }
    const url = `${normalizedOrigin}/api/v1/spaces/${options.spaceId}/translations/${locale}`;
    if (options.debug) {
      console.log(LOG_GROUP, 'updateTranslations fetch url : ', url);
    }
    const body: TranslationUpdate = { type, values, dryRun };
    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: {
          'X-API-KEY': options.token,
          ...fetchOptions.headers,
        },
        body: JSON.stringify(body),
      },
      options.retryCount,
      options.retryDelay,
      options.debug
    );
    if (options.debug) {
      console.log(LOG_GROUP, 'updateTranslations status : ', response.status);
    }
    return response.json();
  }

  return { ...cdn, getSpace, getSchemas, getOpenApi, updateTranslations };
}

export type LocalessCliClient = ReturnType<typeof localessCliClient>;
