<script lang="ts">
  import { localessInit } from '@localess/svelte';
  import { env } from '$env/dynamic/public';
  import type { Snippet } from 'svelte';

  let { children }: { children: Snippet } = $props();

  localessInit({
    origin: env.PUBLIC_LOCALESS_ORIGIN,
    spaceId: env.PUBLIC_LOCALESS_SPACE_ID,
    token: env.PUBLIC_LOCALESS_PUBLIC_TOKEN, // public — safe for the client bundle
    enableSync: true,
  });
</script>

{@render children()}
