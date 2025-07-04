<template>
  <div class="relative w-full h-screen flex items-center justify-center">
    <img
      src="@/assets/background/title_background.png"
      alt="Background"
      class="absolute inset-0 w-full h-full object-cover"
    />
    <div class="relative z-10 w-[115vw] h-[110vh]">
      <StageFrame :title="currentChapter?.title" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import StageFrame from '@/components/StageFrame.vue'

const route = useRoute()
const chapterId = parseInt(route.params.chapterId)

const chapters = [
  { id: 1, title: 'ももたろう' },
  { id: 2, title: 'きんたろう' },
  { id: 3, title: 'うらしまたろう' },
  { id: 4, title: 'さるかにがっせん' },
  { id: 5, title: 'いっすんぼうし' },
  { id: 6, title: 'かちかちやま' },
  { id: 7, title: 'つるのおんがえし' },
  { id: 8, title: 'かぐやひめ' }
]

const currentChapter = computed(() =>
  chapters.find(chapter => chapter.id === chapterId)
)
</script>
