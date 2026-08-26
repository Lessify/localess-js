<script lang="ts">
  import { page } from '$app/state';
</script>

<h1>{page.status === 404 ? '404' : 'Error'}</h1>
<p>{page.error?.message}</p>
