<script setup lang="ts">
import {LocalessComponent, LocalessRichText, type LocalessSchemaProps, localessEditable, localessEditableField} from '@localess/vue';

import type { Page } from '#shared/models/localess';

const props = defineProps<LocalessSchemaProps<Page>>();
</script>

<template>
  <main v-bind="localessEditable(props.data)" class="flex flex-col gap-4">
    <h1 v-bind="localessEditableField<Page>('title')" class="text-center">{{ props.data.title }}</h1>
    <p v-if="props.data.description" v-bind="localessEditableField<Page>('description')" class="text-center whitespace-pre-line">
      {{ props.data.description }}
    </p>
    <div v-if="props.data.buttons?.length" class="flex justify-center gap-2">
      <LocalessComponent v-for="button in props.data.buttons" :key="button._id" :data="button" />
    </div>
    <div v-if="props.data.content" v-bind="localessEditableField<Page>('content')" class="prose dark:prose-invert mx-auto">
      <LocalessRichText :content="props.data.content" />
    </div>
  </main>
</template>
