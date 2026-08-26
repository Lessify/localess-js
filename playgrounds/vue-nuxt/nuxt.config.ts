import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  compatibilityDate: '2026-08-24',
  future: { compatibilityVersion: 4 },
  css: ['./app/app.css'],
  vite: {
    plugins: [tailwindcss()],
  },
});
