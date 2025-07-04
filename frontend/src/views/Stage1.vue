<template>
  <div class="relative w-full h-full flex justify-center items-center">
    <div class="w-full h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <!-- 背面画像 -->
      <img src="@/assets/background/title_background.png" alt="Background" class="w-full h-full object-cover">
      <!-- 前面画像 -->
      <div class="absolute w-[115vw] h-[110vh]">
        <img src="@/assets/background/stage_select_Frame.png" alt="StageFrame" class="w-full h-full object-contain">
      </div>
    </div>

    <div class="absolute inset-0 flex pt-8">
      <!-- 左ページ -->
      <div class="flex-1 p-8 pt-24 pl-80">
      <h2 class="text-2xl font-bold mb-4">目次</h2>

      <div class="space-y-4">
        <div v-for="stage in stages"
              :key="stage.number"
              class="border-b border-gray-400 mr-36 cursor-pointer hover:bg-gray-100 p-1"
              @click="goToStage(stage.number)"> <!--forで4回繰り返して1～4章まで表示 ステージによって変化させる-->
          <p class="text-lg">第{{ stage.number }}章</p>
          <p class="text-sm text-gray-600 ml-4">{{ stage.subtitle }}</p>
        </div>
      </div>
    </div>

    <!-- 右ページ -->
      <div class="flex-1 p-8 pt-24 pr-64">
        <h2 class="text-8xl font-bold mb-4 ml-32">{{ title }}</h2>
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

defineProps({
  title: {
    type: String,
    required: true
  }
})

const router = useRouter()

const goToStage = (chapterNumber) => {
  // 動的にパスを生成して、指定されたステージに移動
  router.push(`/stage/${chapterNumber}`)
}

// 章番号とサブタイトルを組にした配列
const stages = [
  { number: 1, subtitle: '鍛冶の村編' },
  { number: 2, subtitle: '港町編' },
  { number: 3, subtitle: '仲間づくり編' },
  { number: 4, subtitle: '鬼ヶ島編' }
]
</script>
