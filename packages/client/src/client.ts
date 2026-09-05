import { version } from '../package.json';
import { ICache, NoCache, TTLCache } from './cache';
import { localessCacheTags, LocalessCacheTarget } from './cache-tags';
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
  /**
   * Per-request timeout in **milliseconds**, or `false` to wait indefinitely.
   *
   * `fetch` has no default timeout in Node, so without this a hung connection stalls until the
   * platform's own limit — during static generation that can mean a build that never finishes.
   *
   * Each attempt gets its own timeout, so with retries enabled the worst case is roughly
   * `attempts × timeoutMs` plus backoff.
   *
   * @default 15000
   */
  timeoutMs?: number | false;
  /**
   * Retry policy for failed requests, or `false` to disable retrying.
   *
   * All four fetching methods are `GET`s, so retrying is always idempotent.
   *
   * @default { attempts: 3, baseDelayMs: 300, maxDelayMs: 5000 }
   */
  retry?: LocalessRetryOptions | false;
  /**
   * Replacement for the global `fetch`.
   *
   * Useful for instrumentation, a runtime-specific implementation, or a test double. The client
   * calls it with the same arguments it would pass to the global.
   */
  fetch?: typeof globalThis.fetch;
  /**
   * Cache implementation to use instead of the built-in one.
   *
   * When set, {@link LocalessClientOptions.cacheTTL} is ignored — the supplied cache owns expiry.
   * Methods may return promises, so a Redis- or KV-backed cache works without wrapping.
   *
   * Cache keys exclude the token, so **one cache instance shared between two clients is shared
   * across their tokens**. That is safe for tokens with equal permissions — the API returns the
   * same bytes for a given key, and draft-ness is part of the key via `version`. Do **not** share
   * one instance between tokens with *different* permissions: a token lacking `CONTENT_DRAFT` would
   * get a hit on a draft entry another client stored, instead of the `403` the API would return.
   */
  cache?: ICache<unknown>;
  /**
   * Extra `fetch` options merged into every request, for frameworks that extend `fetch`.
   *
   * **Setting either field disables the client's own cache for that request.** Two caching layers
   * over one call is how content survives a `revalidateTag()` and looks like a bug — so when a
   * request carries framework directives, the framework owns caching for it entirely.
   */
  fetchInit?: LocalessFetchInit;
};

/**
 * Framework-specific `fetch` options.
 *
 * Passed through verbatim, so a runtime that does not understand them simply ignores them.
 */
export type LocalessFetchInit = {
  /**
   * Next.js App Router caching. Passed as `fetch(url, { next })`.
   *
   * When `next` is present and `tags` is not, the client fills in the tags described by
   * {@link localessCacheTags} — so `revalidateTag('localess:slug:home')` works without any
   * bookkeeping. An explicit `tags` array **replaces** the generated ones rather than merging, so
   * you can opt out entirely.
   */
  next?: { revalidate?: number | false; tags?: string[] };
  /**
   * Standard `RequestCache` mode. Passed as `fetch(url, { cache })`.
   */
  cache?: RequestCache;
};

/**
 * Retry policy. Only network failures and the configured statuses are retried — a `401` or `403`
 * is thrown immediately, since it will not resolve itself.
 */
export type LocalessRetryOptions = {
  /**
   * Maximum requests per call, including the first. `1` disables retrying.
   * @default 3
   */
  attempts?: number;
  /**
   * Base delay in milliseconds for exponential backoff.
   * @default 300
   */
  baseDelayMs?: number;
  /**
   * Upper bound on any single backoff delay, in milliseconds. Also clamps a `Retry-After` the
   * server asks for.
   * @default 5000
   */
  maxDelayMs?: number;
  /**
   * Response statuses worth retrying.
   * @default [408, 429, 500, 502, 503, 504]
   */
  retryStatuses?: number[];
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
  /**
   * Framework `fetch` options for this request, shallow-merged over the client's own
   * {@link LocalessClientOptions.fetchInit}. Setting either field bypasses the client's cache.
   */
  fetchInit?: LocalessFetchInit;
  /**
   * Abort this request. Composed with the client's own timeout, so whichever fires first wins.
   *
   * Aborting through this signal is treated as the caller's decision and is **not** retried.
   */
  signal?: AbortSignal;
};

export type TranslationFetchParams = {
  /**
   * Translation version to fetch, leave empty for 'published' or 'draft' for the latest draft.
   * Overrides the version set in the client options.
   */
  version?: 'draft';
  /**
   * Framework `fetch` options for this request, shallow-merged over the client's own
   * {@link LocalessClientOptions.fetchInit}. Setting either field bypasses the client's cache.
   */
  fetchInit?: LocalessFetchInit;
  /**
   * Abort this request. Composed with the client's own timeout, so whichever fires first wins.
   *
   * Aborting through this signal is treated as the caller's decision and is **not** retried.
   */
  signal?: AbortSignal;
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
   * Populate {@link Content.references} with the documents this content references.
   *
   * **What each entry carries.** Metadata, `locale` and `data` — and none of its own
   * `references`/`links`/`assets`. The API strips those raw id arrays, exactly as it does for the
   * top-level document, so although `References` values are typed as `Content`, those three fields
   * are always `undefined` here.
   *
   * **One level only.** To follow a reference further, read the `uri` from the `REFERENCE` field
   * value in `data` and look it up — or fetch it yourself if it is not in the map:
   *
   * ```ts
   * const authorId = content.data?.author?.uri;
   * const author = authorId ? content.references?.[authorId] : undefined;
   * ```
   *
   * There is no depth option yet.
   *
   * **All or nothing.** Every id the document references is resolved; you cannot select
   * individual fields.
   *
   * **Partial failure is silent.** A reference whose target has been deleted is omitted from the
   * map and the request still succeeds — so a lookup that misses means "could not resolve", not
   * "not referenced". Guard the lookup rather than assuming every `uri` in `data` resolves.
   *
   * @default false
   */
  resolveReference?: boolean;
  /**
   * Populate {@link Content.links} with metadata for the content this document links to.
   *
   * Values are `ContentMetadata` — id, kind, name, slugs and timestamps. No `data`, and
   * nothing nested, so unlike `resolveReference` there is no deeper level to ask for.
   *
   * **Partial failure is silent.** A link whose target has been deleted is omitted from the map
   * and the request still succeeds.
   *
   * @default false
   */
  resolveLink?: boolean;
  /**
   * Populate {@link Content.assets} with metadata for the assets this document uses.
   *
   * Values are `AssetMetadata` — id, name, extension, type and `alt`. No URL: build one
   * with {@link LocalessClient.assetLink}. Nothing nested.
   *
   * **Partial failure is silent.** An asset that has been deleted is omitted from the map and the
   * request still succeeds.
   *
   * @default false
   */
  resolveAsset?: boolean;
  /**
   * Framework `fetch` options for this request, shallow-merged over the client's own
   * {@link LocalessClientOptions.fetchInit}. Setting either field bypasses the client's cache.
   */
  fetchInit?: LocalessFetchInit;
  /**
   * Abort this request. Composed with the client's own timeout, so whichever fires first wins.
   *
   * Aborting through this signal is treated as the caller's decision and is **not** retried.
   */
  signal?: AbortSignal;
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
    public readonly hint: string,
    /** How many requests were issued before giving up. `1` when the failure was not retried. */
    public readonly attempts: number = 1
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
    cause: unknown,
    /** How many requests were issued before giving up. `1` when the failure was not retried. */
    public readonly attempts: number = 1
  ) {
    super(`Could not reach the Localess API at ${origin}. ${hint}`, { cause });
    this.name = 'LocalessNetworkError';
  }
}

const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_BASE_DELAY_MS = 300;
const DEFAULT_RETRY_MAX_DELAY_MS = 5_000;
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Statuses worth retrying. Every other 4xx is a client mistake that will not fix itself — retrying
 * a 401 or 403 only delays the error the consumer needs to see.
 */
const DEFAULT_RETRY_STATUSES = [408, 429, 500, 502, 503, 504];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Backoff with **full** jitter: a delay drawn uniformly from `[0, cap]`.
 *
 * Equal jitter would still cluster retries; full jitter spreads them, which is what matters when a
 * batch of SSG workers all start against a cold origin at the same moment.
 */
function backoffDelay(attempt: number, baseDelayMs: number, maxDelayMs: number): number {
  const cap = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
  return Math.round(Math.random() * cap);
}

/**
 * `Retry-After` as milliseconds — either delta-seconds or an HTTP-date. Returns `undefined` when
 * the header is absent or unparseable, so the caller falls back to computed backoff.
 */
function retryAfterMs(response: Response): number | undefined {
  const header = response.headers?.get?.('Retry-After');
  if (!header) return undefined;

  const seconds = Number(header);
  if (Number.isFinite(seconds)) {
    return seconds > 0 ? seconds * 1000 : 0;
  }

  const date = Date.parse(header);
  if (Number.isNaN(date)) return undefined;
  return Math.max(0, date - Date.now());
}

/**
 * Cache key for a request URL.
 *
 * Excludes the token — it is a credential, not part of what identifies a response, and including it
 * meant two clients on the same space could not share an entry, and any cache that logs or persists
 * keys persisted a secret. Remaining params are sorted so key equality does not depend on the order
 * the URL happened to be built in.
 */
function cacheKey(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('token');
    parsed.searchParams.sort();
    return parsed.toString();
  } catch {
    // A non-absolute URL should not happen, but a cache key is not worth throwing over.
    return url.replace(/([?&])token=[^&]*&?/, '$1');
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
  // Cache for storing API responses. A supplied cache owns expiry, so cacheTTL no longer applies.
  if (options.cache && options.cacheTTL !== undefined && options.debug) {
    console.warn(LOG_GROUP, 'Both `cache` and `cacheTTL` were set — `cache` wins and `cacheTTL` is ignored.');
  }
  const cache: ICache<any> = options.cache ?? (options.cacheTTL === false ? new NoCache<any>() : new TTLCache<any>(ttl));

  /**
   * Merge the per-call fetch options over the client's, and fill in cache tags when the caller
   * asked for Next.js caching without naming its own.
   */
  function resolveFetchInit(target: LocalessCacheTarget, perCall?: LocalessFetchInit): LocalessFetchInit | undefined {
    const merged: LocalessFetchInit = { ...options.fetchInit, ...perCall };
    if (merged.next === undefined && merged.cache === undefined) {
      return undefined;
    }
    if (merged.next && merged.next.tags === undefined) {
      merged.next = { ...merged.next, tags: localessCacheTags(options.spaceId, target) };
    }
    return merged;
  }

  const doFetch = options.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));

  const retry = options.retry === false ? undefined : (options.retry ?? {});
  const maxAttempts = retry ? Math.max(1, Math.floor(retry.attempts ?? DEFAULT_RETRY_ATTEMPTS)) : 1;
  const baseDelayMs = retry?.baseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS;
  const maxDelayMs = retry?.maxDelayMs ?? DEFAULT_RETRY_MAX_DELAY_MS;
  const retryStatuses = retry?.retryStatuses ?? DEFAULT_RETRY_STATUSES;
  const timeoutMs = options.timeoutMs === false ? undefined : (options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  /**
   * Compose the caller's signal with this attempt's timeout. Each attempt gets a fresh timeout, so
   * a retry is not penalised by time the previous one spent hanging.
   */
  function attemptSignal(callerSignal?: AbortSignal): AbortSignal | undefined {
    const signals: AbortSignal[] = [];
    if (timeoutMs !== undefined) signals.push(AbortSignal.timeout(timeoutMs));
    if (callerSignal) signals.push(callerSignal);
    if (signals.length === 0) return undefined;
    return signals.length === 1 ? signals[0] : AbortSignal.any(signals);
  }

  async function fetchJson<T>(url: string, methodLabel: string, callerSignal?: AbortSignal, fetchInit?: LocalessFetchInit): Promise<T> {
    // When the framework has been asked to cache this request, it owns caching for it entirely.
    // Layering our cache underneath would let a stale entry survive a `revalidateTag()`.
    const useInternalCache = fetchInit === undefined;
    const key = cacheKey(url);

    if (useInternalCache && (await cache.has(key))) {
      if (options.debug) {
        console.log(LOG_GROUP, `${methodLabel} cache hit`);
      }
      return (await cache.get(key)) as T;
    }

    let attempt = 0;

    // Retrying is safe here because every method that reaches this function is a GET.
    for (;;) {
      attempt++;
      const isLastAttempt = attempt >= maxAttempts;

      let response: Response;
      try {
        response = await doFetch(url, { ...fetchOptions, ...fetchInit, signal: attemptSignal(callerSignal) });
      } catch (cause) {
        // An abort the caller asked for is a decision, not a failure — never retry it.
        const callerAborted = callerSignal?.aborted === true;
        if (!callerAborted && !isLastAttempt) {
          if (options.debug) {
            console.log(LOG_GROUP, `${methodLabel} attempt ${attempt} failed, retrying`);
          }
          await sleep(backoffDelay(attempt, baseDelayMs, maxDelayMs));
          continue;
        }
        const networkError = new LocalessNetworkError(normalizedOrigin, redactToken(url), NETWORK_ERROR_HINT, cause, attempt);
        const causeText = cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause);
        console.error(
          LOG_GROUP,
          `${methodLabel} error :\n` +
            renderErrorBox(`Localess Network Error — ${methodLabel}`, [
              ['Origin', normalizedOrigin],
              ['URL', redactToken(url)],
              ['Cause', causeText],
              ...(attempt > 1 ? ([['Attempts', String(attempt)]] as [string, string][]) : []),
              ['Hint', NETWORK_ERROR_HINT],
            ])
        );
        throw networkError;
      }

      if (options.debug) {
        console.log(LOG_GROUP, `${methodLabel} status : `, response.status);
      }

      if (!response.ok) {
        if (retryStatuses.includes(response.status) && !isLastAttempt) {
          const serverAsked = retryAfterMs(response);
          const wait = serverAsked === undefined ? backoffDelay(attempt, baseDelayMs, maxDelayMs) : Math.min(serverAsked, maxDelayMs);
          if (options.debug) {
            console.log(LOG_GROUP, `${methodLabel} attempt ${attempt} got ${response.status}, retrying in ${wait}ms`);
          }
          await sleep(wait);
          continue;
        }

        const body = await readErrorBody(response);
        const hint = hintForStatus(response.status, body, tokensSettingsUrl(normalizedOrigin, options.spaceId));
        const bodyCode = extractBodyCode(body);
        const bodyDetails = extractBodyDetails(body);
        const apiError = new LocalessApiError(response.status, response.statusText, redactToken(url), body, hint, attempt);
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
              ...(attempt > 1 ? ([['Attempts', String(attempt)]] as [string, string][]) : []),
              ['URL', redactToken(url)],
              ['Hint', hint],
            ])
        );
        throw apiError;
      }

      const data = (await response.json()) as T;
      if (useInternalCache) {
        await cache.set(key, data);
      }
      return data;
    }
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

      return fetchJson<Links>(url, 'getLinks', params?.signal, resolveFetchInit({ kind: 'links' }, params?.fetchInit));
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

      return fetchJson<Content<T>>(url, 'getContentBySlug', params?.signal, resolveFetchInit({ kind: 'slug', slug }, params?.fetchInit));
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

      return fetchJson<Content<T>>(url, 'getContentById', params?.signal, resolveFetchInit({ kind: 'content', id }, params?.fetchInit));
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

      return fetchJson<Translations>(
        url,
        'getTranslations',
        params?.signal,
        resolveFetchInit({ kind: 'translations', locale }, params?.fetchInit)
      );
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
