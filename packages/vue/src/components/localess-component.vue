<script setup lang="ts">
import { computed } from 'vue';

import { getComponent, getFallbackComponent } from '../client';
import { LocalessComponentProps } from '../models';
import { localessEditable } from '../utils';

defineOptions({ name: 'LocalessComponent' });

const props = defineProps<LocalessComponentProps>();

const resolved = computed(() => getComponent(props.data._schema));
const fallback = computed(() => getFallbackComponent());
</script>

<template>
  <component :is="resolved" v-if="resolved" :data="data" :assets="assets" :links="links" :references="references" v-bind="localessEditable(data)" />
  <component :is="fallback" v-else-if="fallback" :data="data" :assets="assets" :links="links" :references="references" />
  <p v-else>LocalessComponent could not find component with key <b>{{ data._schema }}</b>. Please check if your configuration is correct.</p>
</template>
