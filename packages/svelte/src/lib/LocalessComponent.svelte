<script lang="ts">
  import { localessEditable, type ContentDataSchema } from '@localess/client';

  import { getComponent, getFallbackComponent } from './core/state';

  let { data }: { data: ContentDataSchema } = $props();

  let Comp = $derived(getComponent(data._schema));
  let Fallback = $derived(getFallbackComponent());
  let attrs = $derived(localessEditable(data));
</script>

{#if Comp}
  <Comp {data} {...attrs} />
{:else if Fallback}
  <Fallback {data} />
{:else}
  <p>LocalessComponent could not find component with key <b>{data._schema}</b>. Please check if your configuration is correct.</p>
{/if}
