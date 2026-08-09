import { version } from '../package.json';
import { ICache, NoCache, TTLCache } from './cache';
import { AssetTransformParams, Content, ContentAsset, ContentData, Links, Translations } from './models';
import { buildAssetQueryString } from './utils';

const RESET = '\x1b[0m';
const FG_BLUE = '\x1b[34m';

export type LocalessClientOptions = {
  /**
   * A fully qualified domain name with protocol (http/https) and port.
   *
   * Example: https://my-localess.web.app
   */
  origin: string;
  /**
   * Localess space ID can be found in the Localess Space settings
   */
  spaceId: string;
  /**
   * Localess API token can be found in the Localess Space settings
   */
  token: string;
  /**
   * Content version to fetch, leave empty for 'published' or 'draft' for the latest draft
   */
  version?: 'draft';
  /**
   * Enable debug mode
   */
  debug?: boolean;
  /**
   * Cache TTL (time to live) in **seconds** for API responses.
   *
   * - `undefined` — use default in-memory TTL cache with 5 minutes TTL (default)
   * - `number`    — use in-memory TTL cache with the given TTL in seconds
   * - `false`     — disable caching entirely (always fetches fresh data)
   *
   * @default 300 (5 minutes)
   * @example
   * cacheTTL: 60      // 1 minute
   * cacheTTL: 300     // 5 minutes (default)
   * cacheTTL: 3600    // 1 hour
   * cacheTTL: false   // disabled
   */
  cacheTTL?: number | false;
};

export type LinksFetchParams = {
  /**
   * Content Kind. FOLDER or DOCUMENT. If not provided, it will return all.
   * @example 'DOCUMENT'
   */
  kind?: 'DOCUMENT' | 'FOLDER';
  /**
   * Content parent slug.
   * @example 'legal/policy'
   */
  parentSlug?: string;
  /**
   * If **true**, exclude all sub slugs, otherwise include all content under current selected **parent slug**.
   * @example false
   */
  excludeChildren?: boolean;
};

export type TranslationFetchParams = {
  /**
   * Translation version to fetch, leave empty for 'published' or 'draft' for the latest draft.
   * Overrides the version set in the client options.
   */
  version?: 'draft';
};

export type ContentFetchParams = {
  /**
   * Content version to fetch, leave empty for 'published' or 'draft' for the latest draft.
   * Overrides the version set in the client options.
   */
  version?: 'draft';
  /**
   * Locale identifier (ISO 639-1) to fetch content in, leave empty for default locale.
   *
   * Example: en
   */
  locale?: string;
  /**
   * Resolve references in the content data.
   * @default false
   */
  resolveReference?: boolean;
  /**
   * Resolve links in the content data.
   * @default false
   */
  resolveLink?: boolean;
  /**
   * Resolve all assets.
   * @default false
   */
  resolveAsset?: boolean;
};

export interface LocalessClient {
  /**
   * Get all links
   * @param params{LinksFetchParams} - Fetch parameters
   * @returns {Promise<Links>}
   * @throws {LocalessApiError} When the API responds with a non-2xx status code.
   */
  getLinks(params?: LinksFetchParams): Promise<Links>;

  /**
   * Get content by SLUG
   * @param slug{string} - Content SLUG
   * @param params{ContentFetchParams} - Fetch parameters
   * @returns {Promise<Content>}
   * @throws {LocalessApiError} When the API responds with a non-2xx status code.
   */
  getContentBySlug<T extends ContentData = ContentData>(slug: string, params?: ContentFetchParams): Promise<Content<T>>;

  /**
   * Get content by ID
   * @param id{string} - Content ID
   * @param params{ContentFetchParams} - Fetch parameters
   * @returns {Promise<Content>}
   * @throws {LocalessApiError} When the API responds with a non-2xx status code.
   */
  getContentById<T extends ContentData = ContentData>(id: string, params?: ContentFetchParams): Promise<Content<T>>;

  /**
   * Get translations for the given locale
   * @param locale{string} - Locale identifier (ISO 639-1)
   * @param params{TranslationFetchParams} - Fetch parameters
   * @throws {LocalessApiError} When the API responds with a non-2xx status code.
   */
  getTranslations(locale: string, params?: TranslationFetchParams): Promise<Translations>;

  syncScriptUrl(): string;

  assetLink(asset: ContentAsset | string, params?: AssetTransformParams): string;
}

const LOG_GROUP = `${FG_BLUE}[Localess:Client]${RESET}`;

const NETWORK_ERROR_HINT = 'Check that the origin is correct, reachable from this environment, and not blocked by a firewall or proxy.';

/**
 * Error thrown when the Localess API responds with a non-2xx status code.
 */
export class LocalessApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly url: string,
    public readonly body: unknown,
    public readonly hint: string
  ) {
    super(`Localess API request to ${url} failed with ${status} ${statusText}. ${hint}`);
    this.name = 'LocalessApiError';
  }
}

/**
 * Error thrown when a request to the Localess API fails before a response is received
 * (DNS failure, connection refused, TLS error, etc.) — as opposed to {@link LocalessApiError},
 * which is for a received non-2xx HTTP response.
 */
export class LocalessNetworkError extends Error {
  constructor(
    public readonly origin: string,
    public readonly url: string,
    public readonly hint: string,
    cause: unknown
  ) {
    super(`Could not reach the Localess API at ${origin}. ${hint}`, { cause });
    this.name = 'LocalessNetworkError';
  }
}

function redactToken(url: string): string {
  return url.replace(/([?&]token=)[^&]*/, '$1***');
}

async function readErrorBody(response: Response): Promise<unknown> {
  let text: string;
  try {
    text = await response.text();
  } catch {
    return undefined;
  }
  if (!text) {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractBodyMessage(body: unknown): string | undefined {
  if (typeof body === 'string') {
    return body.trim().length > 0 ? body : undefined;
  }
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    if (typeof record.message === 'string') return record.message;
    if (typeof record.error === 'string') return record.error;
  }
  return undefined;
}

function extractBodyCode(body: unknown): string | undefined {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    if (typeof record.status === 'string') return record.status;
    if (typeof record.code === 'string') return record.code;
  }
  return undefined;
}

interface BodyDetails {
  reason?: string;
  hint?: string;
  requiredPermissions?: string[];
}

function extractBodyDetails(body: unknown): BodyDetails | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }
  const details = (body as Record<string, unknown>).details;
  if (!details || typeof details !== 'object') {
    return undefined;
  }
  const record = details as Record<string, unknown>;
  const result: BodyDetails = {};
  if (typeof record.reason === 'string') result.reason = record.reason;
  if (typeof record.hint === 'string') result.hint = record.hint;
  if (Array.isArray(record.requiredPermissions) && record.requiredPermissions.every(p => typeof p === 'string')) {
    result.requiredPermissions = record.requiredPermissions as string[];
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function tokensSettingsUrl(origin: string, spaceId: string): string {
  return `${origin}/features/spaces/${spaceId}/settings/tokens`;
}

function staticHintForStatus(status: number, tokensUrl: string): string {
  switch (status) {
    case 401:
      return `Missing or invalid API token. Check that \`token\` in \`localessInit\`/\`localessClient\` matches an active token in your Localess Space settings: ${tokensUrl}`;
    case 403:
      return `The token is valid but doesn't have access to this resource. Check that \`spaceId\` matches the token's space and that the token has the permissions needed for this request (e.g. draft access) here: ${tokensUrl}`;
    case 404:
      return 'Resource not found. Check that `origin`, `spaceId`, and the slug/id are correct and that the content exists in this space.';
    case 429:
      return 'Rate limited by the Localess API. Reduce request frequency, or increase `cacheTTL` to cache responses longer.';
    default:
      if (status >= 500) {
        return 'The Localess API returned a server error. This is usually transient — retry after a short delay.';
      }
      return 'Unexpected response from the Localess API. Check `origin`, `spaceId`, and `token`, and inspect `error.body` for details.';
  }
}

function hintForStatus(status: number, body: unknown, tokensUrl: string): string {
  const staticHint = staticHintForStatus(status, tokensUrl);
  const bodyMessage = extractBodyMessage(body);
  const bodyCode = extractBodyCode(body);
  const details = extractBodyDetails(body);

  const segments = [staticHint];
  if (bodyMessage) {
    segments.push(bodyCode ? `API response: "${bodyMessage}" (${bodyCode}).` : `API response: "${bodyMessage}".`);
  }
  if (details?.reason) {
    segments.push(`Reason: ${details.reason}`);
  }
  if (details?.requiredPermissions?.length) {
    segments.push(`Required permission(s): ${details.requiredPermissions.join(', ')}.`);
  }
  if (details?.hint) {
    segments.push(details.hint);
  }
  return segments.join(' ');
}

const BOX_WIDTH = 88;

// Next.js sets NEXT_RUNTIME on its own server process (dev and prod, both the node and edge
// runtimes) and, in dev, mirrors any console.error/warn raised while rendering a Server
// Component into the browser's console/error overlay — verbatim, ANSI codes and all, since
// that's a plain string by the time it leaves this process. A real standalone terminal never
// sets NEXT_RUNTIME, so skip color there even though `isTTY` is otherwise true.
function supportsColor(): boolean {
  return Boolean(process.stdout?.isTTY) && process.env.NO_COLOR === undefined && process.env.NEXT_RUNTIME === undefined;
}

// Breaks a single space-free "word" that's too long to fit a line on its own — the common
// case being a long URL. Splits after path/query separators first (so a wrapped URL stays
// readable), falling back to a hard character cut for any segment still too long on its own.
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
  const colorize = (s: string) => (color ? `\x1b[31m${s}\x1b[0m` : s);
  const boldColorize = (s: string) => (color ? `\x1b[1m${s}\x1b[0m` : s);

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

/**
 * Create a Localess API Client
 * @param {LocalessClientOptions} options connection details
 */
export function localessClient(options: LocalessClientOptions): LocalessClient {
  if (options.debug) {
    console.log(LOG_GROUP, 'Client Options : ', options);
  }
  // Normalize origin to remove trailing slash (if any)
  const normalizedOrigin = options.origin.replace(/\/+$/, '');
  const fetchOptions: RequestInit = {
    redirect: 'follow',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Localess-Agent': 'Localess-JS-Client',
      'X-Localess-Agent-Version': version,
    },
  };

  const ttl = typeof options.cacheTTL === 'number' ? options.cacheTTL * 1000 : undefined;
  // Cache for storing API responses
  const cache: ICache<any> = options.cacheTTL === false ? new NoCache<any>() : new TTLCache<any>(ttl);

  async function fetchJson<T>(url: string, methodLabel: string): Promise<T> {
    if (cache.has(url)) {
      if (options.debug) {
        console.log(LOG_GROUP, `${methodLabel} cache hit`);
      }
      return cache.get(url) as T;
    }

    let response: Response;
    try {
      response = await fetch(url, fetchOptions);
    } catch (cause) {
      const networkError = new LocalessNetworkError(normalizedOrigin, redactToken(url), NETWORK_ERROR_HINT, cause);
      const causeText = cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause);
      console.error(
        LOG_GROUP,
        `${methodLabel} error :\n` +
          renderErrorBox(`Localess Network Error — ${methodLabel}`, [
            ['Origin', normalizedOrigin],
            ['URL', redactToken(url)],
            ['Cause', causeText],
            ['Hint', NETWORK_ERROR_HINT],
          ])
      );
      throw networkError;
    }

    if (options.debug) {
      console.log(LOG_GROUP, `${methodLabel} status : `, response.status);
    }

    if (!response.ok) {
      const body = await readErrorBody(response);
      const hint = hintForStatus(response.status, body, tokensSettingsUrl(normalizedOrigin, options.spaceId));
      const bodyCode = extractBodyCode(body);
      const bodyDetails = extractBodyDetails(body);
      const apiError = new LocalessApiError(response.status, response.statusText, redactToken(url), body, hint);
      console.error(
        LOG_GROUP,
        `${methodLabel} error :\n` +
          renderErrorBox(`Localess API Error — ${methodLabel}`, [
            ['Status', `${response.status} ${response.statusText}`],
            ...(bodyCode ? ([['Code', bodyCode]] as [string, string][]) : []),
            ...(bodyDetails?.reason ? ([['Reason', bodyDetails.reason]] as [string, string][]) : []),
            ...(bodyDetails?.requiredPermissions?.length
              ? ([['Required', bodyDetails.requiredPermissions.join(', ')]] as [string, string][])
              : []),
            ['URL', redactToken(url)],
            ['Hint', hint],
          ])
      );
      throw apiError;
    }

    const data = (await response.json()) as T;
    cache.set(url, data);
    return data;
  }

  return {
    async getLinks(params?: LinksFetchParams): Promise<Links> {
      if (options.debug) {
        console.log(LOG_GROUP, 'getLinks() params : ', JSON.stringify(params));
      }
      let kind = '';
      if (params?.kind) {
        kind = `&kind=${params.kind}`;
      }
      let parentSlug = '';
      if (params?.parentSlug) {
        parentSlug = `&parentSlug=${params.parentSlug}`;
      }
      let excludeChildren = '';
      if (params?.excludeChildren) {
        excludeChildren = `&excludeChildren=${params.excludeChildren}`;
      }
      const url = `${normalizedOrigin}/api/v1/spaces/${options.spaceId}/links?token=${options.token}${kind}${parentSlug}${excludeChildren}`;
      if (options.debug) {
        console.log(LOG_GROUP, 'getLinks fetch url : ', url);
      }

      return fetchJson<Links>(url, 'getLinks');
    },

    async getContentBySlug<T extends ContentData = ContentData>(slug: string, params?: ContentFetchParams): Promise<Content<T>> {
      if (options.debug) {
        console.log(LOG_GROUP, 'getContentBySlug() slug : ', slug);
        console.log(LOG_GROUP, 'getContentBySlug() params : ', JSON.stringify(params));
      }
      let version = '';
      // Options
      if (options?.version && options.version == 'draft') {
        version = `&version=${options.version}`;
      }
      // Params
      if (params?.version && params.version == 'draft') {
        version = `&version=${params.version}`;
      }
      const locale = params?.locale ? `&locale=${params.locale}` : '';
      const resolveReference = params?.resolveReference ? `&resolveReference=${params.resolveReference}` : '';
      const resolveLink = params?.resolveLink ? `&resolveLink=${params.resolveLink}` : '';
      const resolveAsset = params?.resolveAsset ? `&resolveAsset=${params.resolveAsset}` : '';
      const url = `${normalizedOrigin}/api/v1/spaces/${options.spaceId}/contents/slugs/${slug}?token=${options.token}${version}${locale}${resolveReference}${resolveLink}${resolveAsset}`;
      if (options.debug) {
        console.log(LOG_GROUP, 'getContentBySlug fetch url : ', url);
      }

      return fetchJson<Content<T>>(url, 'getContentBySlug');
    },

    async getContentById<T extends ContentData = ContentData>(id: string, params?: ContentFetchParams): Promise<Content<T>> {
      if (options.debug) {
        console.log(LOG_GROUP, 'getContentById() id : ', id);
        console.log(LOG_GROUP, 'getContentById() params : ', JSON.stringify(params));
      }
      let version = '';
      // Options
      if (options?.version && options.version == 'draft') {
        version = `&version=${options.version}`;
      }
      // Params
      if (params?.version && params.version == 'draft') {
        version = `&version=${params.version}`;
      }
      const locale = params?.locale ? `&locale=${params.locale}` : '';
      const resolveReference = params?.resolveReference ? `&resolveReference=${params.resolveReference}` : '';
      const resolveLink = params?.resolveLink ? `&resolveLink=${params.resolveLink}` : '';
      const resolveAsset = params?.resolveAsset ? `&resolveAsset=${params.resolveAsset}` : '';
      const url = `${normalizedOrigin}/api/v1/spaces/${options.spaceId}/contents/${id}?token=${options.token}${version}${locale}${resolveReference}${resolveLink}${resolveAsset}`;
      if (options.debug) {
        console.log(LOG_GROUP, 'getContentById fetch url : ', url);
      }

      return fetchJson<Content<T>>(url, 'getContentById');
    },

    async getTranslations(locale: string, params?: TranslationFetchParams): Promise<Translations> {
      if (options.debug) {
        console.log(LOG_GROUP, 'getTranslations() locale : ', locale);
        console.log(LOG_GROUP, 'getTranslations() params : ', JSON.stringify(params));
      }
      let version = '';
      // Options
      if (options?.version && options.version == 'draft') {
        version = `&version=${options.version}`;
      }
      // Params
      if (params?.version && params.version == 'draft') {
        version = `&version=${params.version}`;
      }
      const url = `${normalizedOrigin}/api/v1/spaces/${options.spaceId}/translations/${locale}?token=${options.token}${version}`;
      if (options.debug) {
        console.log(LOG_GROUP, 'getTranslations fetch url : ', url);
      }

      return fetchJson<Translations>(url, 'getTranslations');
    },

    syncScriptUrl(): string {
      return `${normalizedOrigin}/scripts/sync-v1.js`;
    },

    assetLink(asset: ContentAsset | string, params?: AssetTransformParams): string {
      const uri = typeof asset === 'string' ? asset : asset.uri;
      const base = `${normalizedOrigin}/api/v1/spaces/${options.spaceId}/assets/${uri}`;
      const qs = buildAssetQueryString(params);
      return qs ? `${base}?${qs}` : base;
    },
  };
}
