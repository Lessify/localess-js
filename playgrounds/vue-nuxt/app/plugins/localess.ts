import { Localess } from '@localess/vue';

import Button from '../components/localess/Button.vue';
import Page from '../components/localess/Page.vue';

export default defineNuxtPlugin(nuxtApp => {
  nuxtApp.vueApp.use(Localess, {
    origin: 'https://demo.localess.org', // Replace it for your origin
    spaceId: 'MmaT4DL0kJ6nXIILUcQF', // Replace it for your spaceId
    token: 'Y4rvboPnyzVeC7LddEK5', // Replace it for your token — public, safe for the client bundle
    debug: true,
    enableSync: true,
    components: { Page, Button },
  });
});
