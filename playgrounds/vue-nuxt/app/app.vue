<script setup lang="ts">
import { resolveLocaleAndSlug } from '#shared/utils/route';
import { LOCALES } from '#shared/utils/locales';
import ThemeToggle from './components/theme-toggle.vue';

const route = useRoute();
const locale = computed(() => resolveLocaleAndSlug(route.path).locale);

function localeLinkClass(id: string): string {
  const classes = 'relative block px-3 py-2 transition hover:text-teal-500 dark:hover:text-teal-400';
  return (locale.value ?? '') === id ? `${classes} text-teal-500 dark:text-teal-400` : classes;
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-8">
    <header class="flex items-center justify-center gap-4 py-8">
      <nav class="flex justify-center">
        <ul
          class="flex rounded-full bg-white/90 px-3 text-sm font-medium text-zinc-800 shadow-lg ring-1 shadow-zinc-800/5 ring-zinc-900/5 backdrop-blur-sm dark:bg-zinc-800/90 dark:text-zinc-200 dark:ring-white/10"
        >
          <li v-for="item in LOCALES" :key="item.id">
            <NuxtLink
              :to="item.id ? `/${item.id}` : '/'"
              :class="localeLinkClass(item.id)"
              :aria-current="(locale ?? '') === item.id ? 'page' : undefined"
            >
              {{ item.name }}
            </NuxtLink>
          </li>
        </ul>
      </nav>
      <ThemeToggle />
    </header>

    <NuxtPage />
  </div>
</template>
