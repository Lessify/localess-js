import { assertInInjectionContext, DestroyRef, inject, Injectable, type Signal, signal } from '@angular/core';

import { LOCALESS_CONFIG, LOCALESS_LATEST_EDITS, LOCALESS_SYNC_READY } from '../localess.config';
import type { ContentData, EventToAppOf, EventToAppType } from '../models';
import { isBrowser, isIframe } from '../utils';

/**
 * Visual Editor sync state, provided by `provideLocaless`.
 *
 * Self-sufficient: `enabled()` already accounts for browser + Visual Editor iframe context, so
 * callers don't need to separately check `isPlatformBrowser`/`isIframe` before using it.
 *
 * Subscriptions made in an injection context (a constructor or field initializer) are removed
 * automatically when that component, directive or service is destroyed. Anywhere else (e.g.
 * `ngOnInit`), pass a `DestroyRef` or call the returned function.
 *
 * @example
 * ```ts
 * export class SlugComponent {
 *   private readonly sync = inject(LocalessSyncService);
 *   liveContent = signal<ContentData | undefined>(undefined);
 *
 *   constructor() {
 *     this.sync.onChange(event => this.liveContent.set(event.data));
 *   }
 * }
 * ```
 *
 * @example Outside an injection context
 * ```ts
 * private readonly destroyRef = inject(DestroyRef);
 *
 * ngOnInit(): void {
 *   this.sync.onChange(event => this.liveContent.set(event.data), this.destroyRef);
 * }
 * ```
 */
@Injectable()
export class LocalessSyncService {
  private readonly config = inject(LOCALESS_CONFIG);
  private readonly syncReadyPromise = inject(LOCALESS_SYNC_READY);
  private readonly latestEdits = inject(LOCALESS_LATEST_EDITS);

  /**
   * Returns `true` when `enableSync: true` was passed to `provideLocaless`, the code is
   * running in the browser, and the page is loaded inside the Visual Editor iframe.
   */
  enabled(): boolean {
    return (this.config.enableSync ?? false) && isBrowser() && isIframe();
  }

  /**
   * Resolves once the Visual Editor sync script has loaded and `window.localess` is available.
   *
   * Resolves immediately if sync was not enabled, or if the script has already loaded. Never
   * rejects — a failed script load is logged and resolves anyway, since the rest of the app
   * functions without live editing.
   */
  ready(): Promise<void> {
    return this.syncReadyPromise;
  }

  /**
   * Subscribes to Visual Editor sync event(s), handling the `enabled()` check and the {@link ready}
   * wait internally so callers don't have to.
   *
   * No-op if sync isn't enabled or usable in the current context (see {@link enabled}).
   *
   * @param event - A single event type or array of event types to subscribe to.
   * @param callback - Called with the event, narrowed to the variant(s) matching `event`.
   * @param destroyRef - Removes the subscription when destroyed; defaults to the caller's injection context.
   * @returns A function that removes the subscription, also before the script has loaded.
   */
  on<T extends EventToAppType>(event: T | T[], callback: (event: EventToAppOf<T>) => void, destroyRef?: DestroyRef): () => void {
    return this.subscribe(sync => sync.on(event, callback), destroyRef);
  }

  /**
   * Subscribes to content-change Visual Editor sync events (`input` and `change`), handling the
   * `enabled()` check and the {@link ready} wait internally so callers don't have to.
   *
   * Equivalent to `on(['input', 'change'], callback)` (mirrors `window.localess.onChange`).
   * For other event types (`save`, `publish`, `unpublish`, `pong`, `enterSchema`, `leaveSchema`, `hoverSchema`), use {@link on}.
   *
   * No-op if sync isn't enabled or usable in the current context (see {@link enabled}).
   *
   * @param callback - Called with the `input`/`change` event.
   * @param destroyRef - Removes the subscription when destroyed; defaults to the caller's injection context.
   * @returns A function that removes the subscription, also before the script has loaded.
   */
  onChange(callback: (event: EventToAppOf<'change' | 'input'>) => void, destroyRef?: DestroyRef): () => void {
    return this.subscribe(sync => sync.onChange(callback), destroyRef);
  }

  /**
   * Subscribes to the live edits (`input` and `change`) of one document and calls `callback` with
   * the edited content. Edits to other documents on the page — a shared header, or the previous page
   * after a link was clicked in the preview — are ignored. `<ll-document>` uses it internally.
   *
   * A subscriber that attaches after the document was already edited — the editor sends its current
   * state as a `change` the moment the preview connects — is called once straight away with the
   * latest edit, so a component that mounts late still shows what the editor shows.
   *
   * No-op if sync isn't enabled or usable in the current context (see {@link enabled}).
   *
   * @param documentId - The rendered document's `Content.id`.
   * @param callback - Called with the edited content data, and the raw event.
   * @param destroyRef - Removes the subscription when destroyed; defaults to the caller's injection context.
   * @returns A function that removes the subscription, also before the script has loaded.
   */
  onDocument<T extends ContentData = ContentData>(
    documentId: string,
    callback: (data: T, event: EventToAppOf<'change' | 'input'>) => void,
    destroyRef?: DestroyRef
  ): () => void {
    return this.subscribe(sync => {
      const detach = sync.onChange(event => {
        if (event.documentId === documentId) callback(event.data, event);
      });
      const latest = this.latestEdits.get(documentId);
      if (latest) callback(latest.data as T, latest);
      return detach;
    }, destroyRef);
  }

  private subscribe(attach: (sync: NonNullable<Window['localess']>) => () => void, destroyRef = injectionContextDestroyRef()): () => void {
    if (!this.enabled()) return () => undefined;
    let cancelled = false;
    let detach: (() => void) | undefined;
    this.ready().then(() => {
      if (cancelled || !window.localess) return;
      detach = attach(window.localess);
    });
    const removeDestroyHook = destroyRef?.onDestroy(() => unsubscribe());
    const unsubscribe = () => {
      if (cancelled) return;
      cancelled = true;
      detach?.();
      detach = undefined;
      removeDestroyHook?.();
    };
    return unsubscribe;
  }
}

/**
 * The caller's `DestroyRef` when called from an injection context, otherwise `undefined`.
 * Angular has no public "am I in an injection context" check; `inject()` throws outside one.
 */
function injectionContextDestroyRef(): DestroyRef | undefined {
  try {
    return inject(DestroyRef);
  } catch {
    return undefined;
  }
}

/**
 * The latest Visual Editor event of the given type(s) as a signal, `undefined` until the first one.
 *
 * Must be called in an injection context; the subscription is removed when that context is
 * destroyed. The Angular counterpart of Vue's `useLocalessSync` and Svelte's `localessSync` store.
 *
 * @example
 * ```ts
 * export class PageComponent {
 *   readonly saved = localessSyncEvent('save');
 * }
 * ```
 */
export function localessSyncEvent<T extends EventToAppType>(event: T | T[]): Signal<EventToAppOf<T> | undefined> {
  assertInInjectionContext(localessSyncEvent);
  const latest = signal<EventToAppOf<T> | undefined>(undefined);
  inject(LocalessSyncService).on(event, e => latest.set(e));
  return latest.asReadonly();
}
