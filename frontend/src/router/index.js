import { createRouter, createWebHistory } from 'vue-router'
import TitleView from '@/views/TitleView.vue'//タイトル画面
import SelectStory from '@/views/SelectStory.vue'//ストーリ選択画面
import Content from '@/views/TableContent.vue'//目次の画面
import Glossary from '@/views/Glossary.vue'//用語集の画面


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'title',
      component: TitleView,
    },
    {
      path: '/glossary',
      name: 'glossary',
      component: Glossary,
    },
    {
      path: '/select-story',
      name: 'select-story',
      component: SelectStory,
    },
    {
      path: '/content/:id',
      name: 'content',
      component: Content,
    },
    {
      path: '/Stage-1-1',
      name: 'Stage-1-1',
      component: () => import('@/views/StageOne.vue')
    }
  ],
})

export default router
