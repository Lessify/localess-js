<script setup lang="ts">
defineProps<{ data: { label?: string; url?: string } }>();
</script>

<template>
  <a :href="data.url" class="button">{{ data.label }}</a>
</template>
