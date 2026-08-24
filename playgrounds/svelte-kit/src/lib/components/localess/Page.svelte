<script lang="ts">
  import { LocalessComponent } from '@localess/svelte';

  let { data }: { data: { title?: string; body?: any[] } } = $props();
</script>

<main>
  <h1>{data.title}</h1>
  {#each data.body ?? [] as item (item._id)}
    <LocalessComponent data={item} />
  {/each}
</main>
