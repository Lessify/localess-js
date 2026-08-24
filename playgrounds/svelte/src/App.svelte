<script lang="ts">
  import { getLocaless, LocalessApiError, localessInit, LocalessDocument, type Content } from '@localess/svelte';

  import Button from './lib/components/localess/Button.svelte';
  import Page from './lib/components/localess/Page.svelte';
  import { LOCALES } from './lib/locales';
  import { resolveLocaleAndSlug } from './lib/route';
  import ThemeToggle from './lib/ThemeToggle.svelte';
  import type { Page as PageModel } from './shared/models/localess';

  localessInit({
    origin: 'https://demo.localess.org', // Replace it for your origin
    spaceId: 'MmaT4DL0kJ6nXIILUcQF', // Replace it for your spaceId
    token: 'Y4rvboPnyzVeC7LddEK5', // Replace it for your token
    debug: true,
    enableSync: true,
    components: { Page, Button },
  });

  const { locale, slug } = resolveLocaleAndSlug(window.location.pathname);

  function localeLinkClass(id: string): string {
    const classes = 'relative block px-3 py-2 transition hover:text-teal-500 dark:hover:text-teal-400';
    return (locale ?? '') === id ? `${classes} text-teal-500 dark:text-teal-400` : classes;
  }

  let content = $state<Content<PageModel> | undefined>(undefined);
  let notFound = $state(false);
  let error = $state<string | undefined>(undefined);

  getLocaless()
    .getContentBySlug<PageModel>(slug, { locale })
    .then(result => (content = result))
    .catch((err: unknown) => {
      if (err instanceof LocalessApiError && err.status === 404) {
        notFound = true;
      } else {
        error = err instanceof Error ? err.message : String(err);
      }
    });
</script>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-8">
  <header class="flex items-center justify-center gap-4 py-8">
    <nav class="flex justify-center">
      <ul
        class="flex rounded-full bg-white/90 px-3 text-sm font-medium text-zinc-800 shadow-lg ring-1 shadow-zinc-800/5 ring-zinc-900/5 backdrop-blur-sm dark:bg-zinc-800/90 dark:text-zinc-200 dark:ring-white/10"
      >
        {#each LOCALES as item (item.id)}
          <li>
            <a
              href={item.id ? `/${item.id}` : '/'}
              class={localeLinkClass(item.id)}
              aria-current={(locale ?? '') === item.id ? 'page' : undefined}
            >
              {item.name}
            </a>
          </li>
        {/each}
      </ul>
    </nav>
    <ThemeToggle />
  </header>

  {#if error}
    <p>Failed to load content: {error}</p>
  {:else if notFound}
    <p>404 — content not found for slug "{slug}".</p>
  {:else if content}
    <LocalessDocument document={content} />
  {:else}
    <p>Loading…</p>
  {/if}
</div>
