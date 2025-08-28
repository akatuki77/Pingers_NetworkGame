import { createRouter, createWebHistory } from 'vue-router'
import TitleView from '@/views/TitleView.vue'//タイトル画面
import SelectStory from '@/views/SelectStory.vue'//ストーリ選択画面
import Content from '@/views/TableContent.vue'//目次の画面
import StageOne from '@/views/StageOne.vue'//ステージ1の画面
import StageTwoPartOne from '@/views/StageTwoPartOne.vue'//ステージ2パート1の画面
import StageTwoPartTwo from '@/views/StageTwoPartTwo.vue'
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
      path: '/stageOne',
      name: 'stageOne',
      component: StageOne,
    },
    {
      path: '/stageTwoPartOne',
      name: 'stageTwoPartOne',
      component: StageTwoPartOne,
    },
    {
      path: '/stageTwoPartTwo',
      name: 'stageTwoPartTwo',
      component: StageTwoPartTwo,
    }
  ],
})

export default router
