<script module lang="ts">
  export { escapeAttr, escapeHtml, sanitizeUrl } from '@localess/richtext';
</script>

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
