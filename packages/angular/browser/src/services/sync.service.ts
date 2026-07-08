import {Injectable, inject} from '@angular/core';
import {isBrowser, isIframe} from '@localess/client';
import {LOCALESS_BROWSER_CONFIG, LOCALESS_SYNC_READY} from '../localess.config';

/**
 * Visual Editor sync state, provided by `provideLocalessBrowser`.
 *
 * Self-sufficient: `enabled` already accounts for browser + Visual Editor iframe context, so
 * callers don't need to separately check `isPlatformBrowser`/`isIframe` before using it.
 *
 * @example
 * ```ts
 * export class SlugComponent implements OnInit {
 *   private readonly sync = inject(LocalessSyncService);
 *   liveContent = signal<ContentData | undefined>(undefined);
 *
 *   ngOnInit(): void {
 *     if (this.sync.enabled) {
 *       this.sync.ready().then(() => {
 *         window.localess?.on(['input', 'change'], event => {
 *           this.liveContent.set(event.data);
 *         });
 *       });
 *     }
 *   }
 * }
 * ```
 */
@Injectable()
export class LocalessSyncService {
  private readonly config = inject(LOCALESS_BROWSER_CONFIG);
  private readonly syncReadyPromise = inject(LOCALESS_SYNC_READY);

  /**
   * `true` when `enableSync: true` was passed to `provideLocalessBrowser`, the code is running
   * in the browser, and the page is loaded inside the Visual Editor iframe.
   */
  get enabled(): boolean {
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
}
