<script lang="ts">
  let { data }: { data: { _schema: string; title?: string } } = $props();
</script>

<p>{data.title}</p>
