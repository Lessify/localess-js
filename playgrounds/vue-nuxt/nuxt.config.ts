export default defineNuxtConfig({
  compatibilityDate: '2026-08-24',
  runtimeConfig: {
    localessToken: '', // secret — set via NUXT_LOCALESS_TOKEN env var, server-only
    localessOrigin: '',
    localessSpaceId: '',
    public: {
      localessOrigin: '',
      localessSpaceId: '',
      localessPublicToken: '', // set via NUXT_PUBLIC_LOCALESS_PUBLIC_TOKEN
    },
  },
});
