import { Localess } from '@localess/vue';

export default defineNuxtPlugin(nuxtApp => {
  const config = useRuntimeConfig();
  nuxtApp.vueApp.use(Localess, {
    origin: config.public.localessOrigin,
    spaceId: config.public.localessSpaceId,
    token: config.public.localessPublicToken, // public — safe for the client bundle
    enableSync: true,
  });
});
