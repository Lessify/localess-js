<script lang="ts">
  import {
    type LocalessRichTextInput,
    type LocalessRichTextRenderers,
    renderRichTextToHtml,
  } from '@localess/richtext';

  let {
    content,
    renderers,
  }: { content: LocalessRichTextInput; renderers?: LocalessRichTextRenderers<string> } = $props();

  let html = $derived(renderRichTextToHtml(content, { renderers }));
</script>

{@html html}
