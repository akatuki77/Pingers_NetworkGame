<script setup>
  import { ref } from 'vue'
  // 背面背景のコンポーネントをインポート
  import background from '@/components/TitleBackgroundImage.vue'
  // 各ステージの情報を配列で管理
  const stages = ref([
    { id: 1, alt: 'Stage 1', path: { name: 'ChapterSelect', params: { storyId: 1 } } }, // 1番目だけリンク先を指定
    { id: 2, alt: 'Stage 2', path: null }, // path: null はリンク無効
    { id: 3, alt: 'Stage 3', path: null },
    { id: 4, alt: 'Stage 4', path: null },
    { id: 5, alt: 'Stage 5', path: null },
    { id: 6, alt: 'Stage 6', path: null },
    { id: 7, alt: 'Stage 7', path: null },
    { id: 8, alt: 'Stage 8', path: null },
    // 将来ステージを追加する場合は、この配列にオブジェクトを追加するだけ
    // { id: 9, alt: 'Stage 9', path: '/new-stage' },
  ])
</script>

<template>
  <background>
    <div class="p-4 grid grid-cols-4 gap-8">
      <div v-for="stage in stages" :key="stage.id">
        <RouterLink v-if="stage.path" :to="stage.path">
          <img
            src="@/assets/button/stage_button.png"
            :alt="stage.alt"
            class="cursor-pointer transition hover:opacity-80"
          >
        </RouterLink>
        <div v-else>
          <img
            src="@/assets/button/stage_button.png"
            :alt="stage.alt"
            class="cursor-not-allowed opacity-50"
          >
        </div>
      </div>
    </div>
  </background>
</template>
