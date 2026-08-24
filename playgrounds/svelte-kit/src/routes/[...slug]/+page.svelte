<script lang="ts">
  import { LocalessComponent } from '@localess/svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<LocalessComponent data={data.content.data} />
