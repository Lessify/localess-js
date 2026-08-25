<script lang="ts" generics="T extends ContentData = ContentData">
  import { untrack } from 'svelte';

  import { FONT_BOLD, FONT_NORMAL } from '../console';
  import { localessSyncOnChange } from '../core/state';
  import LocalessComponent from './LocalessComponent.svelte';
  import type { LocalessDocumentProps, ContentData } from '../models';

  let { document }: LocalessDocumentProps<T> = $props();

  let contentData = $state(untrack(() => document.data));

  $effect(() => {
    if (!contentData) {
      console.error('LocalessDocument property %cdocument.data%c is not provided.', FONT_BOLD, FONT_NORMAL);
    }
  });

  $effect(() => {
    localessSyncOnChange(event => {
      contentData = event.data;
    });
  });
</script>

{#if contentData}
  <LocalessComponent data={contentData} assets={document.assets} links={document.links} references={document.references} />
{:else}
  <p>LocalessDocument property <b>document.data</b> is not provided.</p>
{/if}
