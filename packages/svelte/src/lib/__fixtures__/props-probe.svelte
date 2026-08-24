<script lang="ts">
  import type { Assets, ContentDataSchema, Links, References } from '../models';

  let { data, assets, links, references }: { data: ContentDataSchema; assets?: Assets; links?: Links; references?: References } =
    $props();
</script>

<div data-testid="props-probe" data-schema={data._schema}>
  <span data-testid="assets-keys">{Object.keys(assets ?? {}).join(',')}</span>
  <span data-testid="links-keys">{Object.keys(links ?? {}).join(',')}</span>
  <span data-testid="references-keys">{Object.keys(references ?? {}).join(',')}</span>
</div>
