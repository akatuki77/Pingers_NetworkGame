import { createRouter, createWebHistory } from 'vue-router';
import ThreeDemoPage from '../views/ThreeDemoPage.vue';

const routes = [
  {
    path: '/',
    name: 'ThreeDemo',
    component: ThreeDemoPage,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
