<script setup lang="ts">
import { LocalessComponent, useLocaless } from '@localess/vue';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const client = useLocaless();
const content = ref();

onMounted(async () => {
  const slug = Array.isArray(route.params.slug) ? route.params.slug.join('/') : (route.params.slug as string) || 'home';
  content.value = await client.getContentBySlug(slug);
});
</script>

<template>
  <LocalessComponent v-if="content" :data="content.data" />
  <p v-else>Loading…</p>
</template>
