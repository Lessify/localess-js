<script setup lang="ts">
type Theme = 'light' | 'dark';

const theme = ref<Theme>('light');

// Reads the persisted/preferred theme after mount only — `window` isn't available during SSR,
// so the server-rendered markup always starts from the 'light' default above.
onMounted(() => {
  const stored = window.localStorage.getItem('theme');
  theme.value = stored === 'light' || stored === 'dark' ? stored : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
});

watch(theme, value => {
  document.documentElement.classList.toggle('dark', value === 'dark');
  window.localStorage.setItem('theme', value);
});

function toggle() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
}
</script>

<template>
  <button
    type="button"
    aria-label="Toggle theme"
    class="flex size-9 items-center justify-center rounded-full bg-white/90 text-sm shadow-lg ring-1 shadow-zinc-800/5 ring-zinc-900/5 backdrop-blur-sm dark:bg-zinc-800/90 dark:ring-white/10"
    @click="toggle"
  >
    {{ theme === 'dark' ? '☀️' : '🌙' }}
  </button>
</template>
