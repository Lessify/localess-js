<script lang="ts">
  let { data }: { data: { label?: string; url?: string } } = $props();
</script>

<a href={data.url} class="button">{data.label}</a>
