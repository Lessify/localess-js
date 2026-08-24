<script lang="ts">
  type Theme = 'light' | 'dark';

  function getInitialTheme(): Theme {
    const stored = window.localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  let theme = $state<Theme>(getInitialTheme());

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
