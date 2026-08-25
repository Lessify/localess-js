import { localessClient } from '@localess/client';
import { OpenAPIObject } from 'openapi3-ts/oas30';

import { version } from '../package.json';
import type {
  LocalessClientOptions,
  Schemas,
  Space,
  Translations,
  TranslationUpdate,
  TranslationUpdateResponse,
  TranslationUpdateType,
} from './models';
import { LocalessApiError } from './models';
import { BRIGHT, FG_BLUE, FG_RED, RESET } from './utils';

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

function redactToken(url: string): string {
  return url.replace(/([?&]token=)[^&]*/, '$1***');
}

function tokensSettingsUrl(origin: string, spaceId: string): string {
  return `${origin}/features/spaces/${spaceId}/settings/tokens`;
}

function extractErrorMessage(body: unknown): string | undefined {
  if (body && typeof body === 'object' && typeof (body as Record<string, unknown>).message === 'string') {
    return (body as Record<string, unknown>).message as string;
  }
  return undefined;
}

function extractRequiredPermissions(body: unknown): string[] | undefined {
  const details = body && typeof body === 'object' ? (body as Record<string, unknown>).details : undefined;
  const permissions = details && typeof details === 'object' ? (details as Record<string, unknown>).requiredPermissions : undefined;
  return Array.isArray(permissions) && permissions.every(p => typeof p === 'string') ? (permissions as string[]) : undefined;
}

function extractErrorCode(body: unknown): string | undefined {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    if (typeof record.status === 'string') return record.status;
    if (typeof record.code === 'string') return record.code;
  }
  return undefined;
}

function hintForStatus(status: number, body: unknown, tokensUrl: string): string {
  const message = extractErrorMessage(body);
  const permissions = extractRequiredPermissions(body);
  switch (status) {
    case 401:
      return `Missing or invalid API token. Check that the credentials configured for the CLI (env vars or .localess/credentials.json) match an active token in your Localess Space settings: ${tokensUrl}`;
    case 403:
      return permissions?.length
        ? `The token is missing the required permission(s): ${permissions.join(', ')}. Make sure you're using a CLI/API token with these permissions, not a CDN (read-only) token: ${tokensUrl}`
        : `The token doesn't have access to this resource. Check the token's permissions in your Localess Space settings: ${tokensUrl}`;
    default:
      return message ? `API responded with: "${message}".` : 'Unexpected response from the Localess API.';
  }
}

const BOX_WIDTH = 88;

function supportsColor(): boolean {
  return Boolean(process.stdout?.isTTY) && process.env.NO_COLOR === undefined;
}

function splitLongWord(word: string, maxLineWidth: number): string[] {
  const tokens = word.split(/(?<=[/?&])/);
  const lines: string[] = [];
  let current = '';
  for (const token of tokens) {
    if (token.length > maxLineWidth) {
      if (current) {
        lines.push(current);
        current = '';
      }
      for (let i = 0; i < token.length; i += maxLineWidth) {
        lines.push(token.slice(i, i + maxLineWidth));
      }
      continue;
    }
    if (current.length + token.length > maxLineWidth && current) {
      lines.push(current);
      current = token;
    } else {
      current += token;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

function wrapText(text: string, prefixLength: number): string[] {
  const maxLineWidth = Math.max(BOX_WIDTH - prefixLength, 1);
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (word.length > maxLineWidth) {
      if (current) {
        lines.push(current);
        current = '';
      }
      lines.push(...splitLongWord(word, maxLineWidth));
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxLineWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines.length > 0 ? lines : [''];
}

function renderErrorBox(title: string, rows: [label: string, value: string][]): string {
  const color = supportsColor();
  const colorize = (s: string) => (color ? `${FG_RED}${s}${RESET}` : s);
  const boldColorize = (s: string) => (color ? `${BRIGHT}${FG_RED}${s}${RESET}` : s);

  const labelWidth = Math.max(...rows.map(([label]) => label.length));
  const contentLines: string[] = [];
  for (const [label, value] of rows) {
    const prefix = `${label.padEnd(labelWidth)} : `;
    const wrapped = wrapText(value, prefix.length);
    contentLines.push(`${prefix}${wrapped[0]}`);
    for (const line of wrapped.slice(1)) {
      contentLines.push(' '.repeat(prefix.length) + line);
    }
  }

  const pad = (s: string) => s + ' '.repeat(Math.max(BOX_WIDTH - s.length, 0));
  const horizontal = '─'.repeat(BOX_WIDTH + 2);
  const left = colorize('│');
  const right = colorize('│');

  const lines = [
    colorize(`┌${horizontal}┐`),
    `${left} ${boldColorize(pad(title))} ${right}`,
    colorize(`├${horizontal}┤`),
    ...contentLines.map(line => `${left} ${pad(line)} ${right}`),
    colorize(`└${horizontal}┘`),
  ];

  return lines.join('\n');
}

async function parseJsonOrThrow<T>(response: Response, url: string, methodLabel: string, tokensUrl: string): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => undefined);
    const hint = hintForStatus(response.status, body, tokensUrl);
    const bodyCode = extractErrorCode(body);
    console.error(
      renderErrorBox(`Localess API Error — ${methodLabel}`, [
        ['Status', `${response.status} ${response.statusText}`],
        ...(bodyCode ? ([['Code', bodyCode]] as [string, string][]) : []),
        ['URL', redactToken(url)],
        ['Hint', hint],
      ])
    );
    throw new LocalessApiError(response.status, response.statusText, redactToken(url), body, hint);
  }
  return response.json();
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
    return parseJsonOrThrow<Space>(response, url, 'getSpace', tokensSettingsUrl(normalizedOrigin, options.spaceId));
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
    return parseJsonOrThrow<Schemas>(response, url, 'getSchemas', tokensSettingsUrl(normalizedOrigin, options.spaceId));
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
    return parseJsonOrThrow<OpenAPIObject>(response, url, 'getOpenApi', tokensSettingsUrl(normalizedOrigin, options.spaceId));
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
    return parseJsonOrThrow<TranslationUpdateResponse>(
      response,
      url,
      'updateTranslations',
      tokensSettingsUrl(normalizedOrigin, options.spaceId)
    );
  }

  return { ...cdn, getSpace, getSchemas, getOpenApi, updateTranslations };
}

export type LocalessCliClient = ReturnType<typeof localessCliClient>;
