import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  // All provided by the host app at runtime — bundling any of them would ship a
  // second copy alongside Nuxt's own.
  externals: ['@localess/vue', '@localess/client', '@localess/model', '@localess/richtext', 'vue', 'nuxt', 'h3', '#app', '#imports'],
});
