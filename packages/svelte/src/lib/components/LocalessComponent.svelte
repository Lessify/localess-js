<script lang="ts" generics="T extends ContentData = ContentData">
  import { getComponent, getFallbackComponent } from '../core/state';
  import type { LocalessComponentProps, ContentData} from '../models';
  import {localessEditable} from "$lib/utils";

  let { data, assets, links, references }: LocalessComponentProps<T> = $props();

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
