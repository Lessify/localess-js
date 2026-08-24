import { createRouter, createWebHistory } from 'vue-router';
import ContentView from './views/content-view.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/:slug*', component: ContentView }],
});
