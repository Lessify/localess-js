<script setup lang="ts">
import { onMounted, ref, watch, watchEffect } from 'vue';

import { localessSyncOnChange } from '../client';
import { ContentData, LocalessDocumentProps} from '../models';
import LocalessComponent from './localess-component.vue';

defineOptions({ name: 'LocalessDocument' });

const props = defineProps<LocalessDocumentProps>();

const contentData = ref<ContentData | undefined>(props.document.data);

// Re-syncs whenever the `document` prop itself changes — e.g. client-side navigation to a new
// slug in Nuxt reuses this component instance and just updates its props, so without this the
// previously rendered content would stick even though `document` now points elsewhere.
watch(
  () => props.document,
  doc => {
    contentData.value = doc.data;
  }
);

onMounted(() => {
  localessSyncOnChange(event => {
    contentData.value = event.data;
  });
});

watchEffect(() => {
  if (!contentData.value) {
    console.error('LocalessDocument property document.data is not provided.');
  }
});
</script>

<template>
  <LocalessComponent v-if="contentData" :data="contentData" :assets="document.assets" :links="document.links" :references="document.references" />
  <p v-else>LocalessDocument property <b>document.data</b> is not provided.</p>
</template>
