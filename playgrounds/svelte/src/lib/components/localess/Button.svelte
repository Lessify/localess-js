<script lang="ts">
  import { localessEditable } from '@localess/svelte';
  import type { Button } from '../../../shared/models/localess';

  let { data }: { data: Button } = $props();

  const baseClass =
    "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

  let variantClass = $derived(
    data.type === 'primary'
      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
      : data.type === 'secondary'
        ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        : ''
  );
</script>

<button use:localessEditable={data} type="button" class="{baseClass} {variantClass}">
  {data.label}
</button>
