<template>
  <div class="bg-cover bg-center bg-[url('@/assets/background/title_background.png')] h-screen w-screen">
    <!-- 背景画像を設定 -->
    <!-- slot内にコンテンツを配置 -->
    <slot />
  </div>
</template>

<script setup>
// このコンポーネントはバックグラウンドの見た目を定義するだけなので、scriptは空でOK
</script>
