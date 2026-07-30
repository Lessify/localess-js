import {Injectable, inject} from '@angular/core';
import {type EventToAppOf, type EventToAppType, isBrowser, isIframe} from '@localess/client';
import {LOCALESS_BROWSER_CONFIG, LOCALESS_SYNC_READY} from '../localess.config';

/**
 * Visual Editor sync state, provided by `provideLocalessBrowser`.
 *
 * Self-sufficient: `enabled()` already accounts for browser + Visual Editor iframe context, so
 * callers don't need to separately check `isPlatformBrowser`/`isIframe` before using it.
 *
 * @example
 * ```ts
 * export class SlugComponent implements OnInit {
 *   private readonly sync = inject(LocalessSyncService);
 *   liveContent = signal<ContentData | undefined>(undefined);
 *
 *   ngOnInit(): void {
 *     this.sync.onChange(event => this.liveContent.set(event.data));
 *   }
 * }
 * ```
 */
@Injectable()
export class LocalessSyncService {
  private readonly config = inject(LOCALESS_BROWSER_CONFIG);
  private readonly syncReadyPromise = inject(LOCALESS_SYNC_READY);

  /**
   * Returns `true` when `enableSync: true` was passed to `provideLocalessBrowser`, the code is
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
   */
  on<T extends EventToAppType>(event: T | T[], callback: (event: EventToAppOf<T>) => void): void {
    if (!this.enabled()) return;
    this.ready().then(() => {
      window.localess?.on(event, callback);
    });
  }

  /**
   * Subscribes to content-change Visual Editor sync events (`input` and `change`), handling the
   * `enabled()` check and the {@link ready} wait internally so callers don't have to.
   *
   * Equivalent to `on(['input', 'change'], callback)` (mirrors `window.localess.onChange`).
   * For other event types (`save`, `publish`, `pong`, `enterSchema`, `hoverSchema`), use {@link on}.
   *
   * No-op if sync isn't enabled or usable in the current context (see {@link enabled}).
   *
   * @param callback - Called with the `input`/`change` event.
   */
  onChange(callback: (event: EventToAppOf<'change' | 'input'>) => void): void {
    if (!this.enabled()) return;
    this.ready().then(() => {
      window.localess?.onChange(callback);
    });
  }
}
