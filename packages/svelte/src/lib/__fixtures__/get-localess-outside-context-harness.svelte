<script lang="ts">
  import { getLocaless } from '../localess-context';

  let { onError }: { onError: (error: unknown) => void } = $props();

  try {
    getLocaless();
  } catch (error) {
    onError(error);
  }
</script>
