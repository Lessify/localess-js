import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  externals: ['@localess/vue', '@localess/client', '@localess/model', '@localess/richtext', 'vue', 'nuxt', '#app', '#imports'],
});
