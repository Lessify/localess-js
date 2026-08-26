<script lang="ts">
  type Theme = 'light' | 'dark';

  let theme = $state<Theme>('light');

  // Reads the persisted/preferred theme after mount only — `window` isn't available during SSR,
  // so the server-rendered markup always starts from the 'light' default above.
  $effect(() => {
    const stored = window.localStorage.getItem('theme');
    theme = stored === 'light' || stored === 'dark' ? stored : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  $effect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('theme', theme);
  });

  function toggle() {
    theme = theme === 'dark' ? 'light' : 'dark';
  }
</script>

<button
  type="button"
  onclick={toggle}
  aria-label="Toggle theme"
  class="flex size-9 items-center justify-center rounded-full bg-white/90 text-sm shadow-lg ring-1 shadow-zinc-800/5 ring-zinc-900/5 backdrop-blur-sm dark:bg-zinc-800/90 dark:ring-white/10"
>
  {theme === 'dark' ? '☀️' : '🌙'}
</button>
