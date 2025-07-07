import { createRouter, createWebHistory } from 'vue-router'
// ページとして使うコンポーネントをインポート
import Stage from '../views/ChapterSelect.vue'
import ChapterDetail from '../views/ChapterDetail.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Stage,
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
    {
    // この部分が「/chapter/1」や「/chapter/2」のようなURLに対応します
    path: '/chapter/:id',
    name: 'ChapterDetail',
    component: ChapterDetail,
    // URLの :id 部分をコンポーネントにプロパティとして渡す設定
    props: true
    },
  ],
})

export default router
