<script setup lang="ts">
import { LocalessComponent, localessEditableField, vLocalessEditable } from '@localess/vue';

import type { Page } from '#shared/models/localess';

defineProps<{ data: Page }>();
</script>

<template>
  <main v-localess-editable="data" class="flex flex-col gap-4">
    <h1 v-bind="localessEditableField<Page>('title')" class="text-center">{{ data.title }}</h1>
    <p v-if="data.description" v-bind="localessEditableField<Page>('description')" class="text-center whitespace-pre-line">
      {{ data.description }}
    </p>
    <div v-if="data.buttons?.length" class="flex justify-center gap-2">
      <LocalessComponent v-for="button in data.buttons" :key="button._id" :data="button" />
    </div>
  </main>
</template>
