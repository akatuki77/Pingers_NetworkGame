import { createRouter, createWebHistory } from 'vue-router'
// ページとして使うコンポーネントをインポート
import GameTitle from '../views/GameTitle.vue'
import StorySelect from '../views/StorySelect.vue'
import ChapterSelect from '../views/ChapterSelect.vue'
import ChapterDetail from '../views/ChapterDetail.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: GameTitle,
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
      // この部分が「/story-select」のようなURLに対応します
      path: '/story-select',
      name: 'StorySelect',
      component: StorySelect,
    },
    {
      // この部分が「/chapter-select」のようなURLに対応します
      path: '/story/:storyId/chapter-select',
      name: 'ChapterSelect',
      component: ChapterSelect,
      // このコンポーネントにプロパティを渡す設定
      props: true

    },
    {
    // この部分が「/chapter/1」や「/chapter/2」のようなURLに対応します
    path: '/story/:storyId/chapter/:chapterId',
    name: 'ChapterDetail',
    component: ChapterDetail,
    // URLの :id 部分をコンポーネントにプロパティとして渡す設定
    props: true
    },
  ],
})

export default router
