<script lang="ts">
  import { LocalessComponent, localessEditable } from '@localess/svelte';
  import type { Page } from '../../../shared/models/localess';

  let { data }: { data: Page } = $props();
</script>

<main use:localessEditable={data} class="flex flex-col gap-4">
  <h1 class="text-center">{data.title}</h1>
  {#if data.description}
    <p class="text-center whitespace-pre-line">{data.description}</p>
  {/if}
  {#if data.buttons?.length}
    <div class="flex justify-center gap-2">
      {#each data.buttons as button (button._id)}
        <LocalessComponent data={button} />
      {/each}
    </div>
  {/if}
</main>
