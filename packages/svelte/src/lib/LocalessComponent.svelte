<script lang="ts">
  import { getComponent, getFallbackComponent } from './core/state';
  import { localessEditable, type Assets, type ContentDataSchema, type Links, type References } from './models';

  let { data, assets, links, references }: { data: ContentDataSchema; assets?: Assets; links?: Links; references?: References } =
    $props();

  let Comp = $derived(getComponent(data._schema));
  let Fallback = $derived(getFallbackComponent());
  let attrs = $derived(localessEditable(data));
</script>

{#if Comp}
  <Comp {data} {assets} {links} {references} {...attrs} />
{:else if Fallback}
  <Fallback {data} {assets} {links} {references} />
{:else}
  <p>LocalessComponent could not find component with key <b>{data._schema}</b>. Please check if your configuration is correct.</p>
{/if}
