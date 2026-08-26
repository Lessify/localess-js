<script setup lang="ts">
import { LocalessDocument, type Content } from '@localess/vue';

import type { Page } from '#shared/models/localess';

const route = useRoute();
const slug = Array.isArray(route.params.slug) ? route.params.slug.join('/') : route.params.slug || '';

const { data: content, error } = await useAsyncData(`content-${slug}`, () =>
  $fetch<Content<Page>>('/api/content', { query: { slug } })
);

if (error.value) {
  throw createError({ statusCode: error.value.statusCode ?? 500, statusMessage: error.value.statusMessage, fatal: true });
}
</script>

<template>
  <LocalessDocument v-if="content" :document="content" />
</template>
