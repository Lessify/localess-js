<script setup lang="ts">
import { LocalessComponent } from '@localess/vue';

const route = useRoute();
const slug = Array.isArray(route.params.slug) ? route.params.slug.join('/') : route.params.slug || 'home';

const { data: content } = await useAsyncData(`content-${slug}`, () => $fetch('/api/content', { query: { slug } }));
</script>

<template>
  <LocalessComponent v-if="content" :data="content.data" />
</template>
