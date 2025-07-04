<template>
  <div>
    <div class="w-full h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <!-- 背面画像 -->
      <img src="@/assets/background/title_background.png" alt="Background" class="w-full h-full object-cover">
      <!-- 前面画像 -->
      <div class="absolute w-[115vw] h-[110vh]">
        <img src="@/assets/background/stage_select_Frame.png" alt="StageFrame" class="w-full h-full object-contain">
      </div>
      <div class="absolute inset-0 z-20 flex items-center justify-center">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup>
// このコンポーネントは背景画像とフレームを表示するためのものです
// 特にロジックは必要ありません
</script>
