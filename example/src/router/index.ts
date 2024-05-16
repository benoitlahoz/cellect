import { createWebHistory, createRouter } from 'vue-router';

const routes = [
  {
    path: '/example',
    component: () =>
      import('../components/spread-sheet/spread-sheet.component.vue'),
  },
  {
    path: '/example/users',
    component: () => import('../components/user-list/user-list.component.vue'),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
