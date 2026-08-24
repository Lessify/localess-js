<script lang="ts">
  let { data, ...rest }: { data: { _id: string; _schema: string } } = $props();
</script>

<div data-testid="hero" {...rest}>{data._schema}</div>
