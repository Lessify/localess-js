<script setup lang="ts">
import { LocalessComponent } from '@localess/vue';

defineProps<{ data: { title?: string; body?: unknown[] } }>();
</script>

<template>
  <main>
    <h1>{{ data.title }}</h1>
    <LocalessComponent v-for="item in data.body" :key="(item as any)._id" :data="item as any" />
  </main>
</template>
