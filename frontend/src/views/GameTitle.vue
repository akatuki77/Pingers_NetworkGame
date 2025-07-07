<script setup>
// 背面背景のコンポーネントをインポート
  import background from '@/components/TitleBackgroundImage.vue'
</script>

<template>
  <background>
      <div class="flex flex-col items-center gap-8">
      <h1 class="text-6xl font-bold text-gray-800">
        昔々のパケットたち
      </h1>
      <RouterLink to="/story-select">
        <img src="@/assets/button/start_button.png" alt="Start Button" class="w-320 h-120">
      </RouterLink>
    </div>
  </background>
</template>
