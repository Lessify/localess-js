<script lang="ts">
  import { getLocaless, localessInit } from '../localess-context';

  let { onReady }: { onReady: (client: unknown) => void } = $props();

  localessInit({ origin: 'https://example.com', spaceId: 'space-1', token: 'public-token' });
  onReady(getLocaless());
</script>
