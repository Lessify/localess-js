<script lang="ts">
  import { LocalessDocument } from '@localess/svelte';

  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<LocalessDocument document={data.content} />
