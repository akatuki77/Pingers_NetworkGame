<script setup>
// 背面背景のコンポーネントをインポート
  import background from '@/components/BackgroundImage.vue'

  // 章番号とサブタイトルを組にした配列
  const chapters = [
    { number: 1, title: '鍛冶の村編' },
    { number: 2, title: '港町編' },
    { number: 3, title: '仲間づくり編' },
    { number: 4, title: '鬼ヶ島編' }
  ]
</script>

<template>
  <background>
    <div class="relative w-full h-full flex justify-center items-center">
      <div class="absolute inset-0 flex pt-8">
        <!-- 左ページ -->
        <div class="flex-1 p-8 pt-24 pl-80">
          <h1 class="text-2xl font-bold mb-4">目次</h1>
          <div class="space-y-4">
            <RouterLink
              v-for="chapter in chapters"
              :key="chapter.number"
              :to="`/chapter/${chapter.number}`">
              <h2 class="text-lg border-b border-gray-400 mr-36 cursor-pointer hover:bg-gray-100 p-1">第{{ chapter.number }}章</h2>
              <p class="text-sm text-gray-600 ml-4">{{ chapter.title }}</p>
            </RouterLink>
          </div>
        </div>

        <!-- 右ページ -->
        <div class="flex-1 p-8 pt-24 pr-64">
          <h1 class="text-2xl font-bold mb-4">ももたろう</h1>
          <h2 class="text-lg border-b border-gray-400 mr-36 cursor-pointer hover:bg-gray-100 p-1">あらすじ</h2>
          <p class="text-sm text-gray-600 ml-4">おじいさんから巻物（地図）を<br>渡され、鬼退治の旅に出る。</p>

          <h2 class="text-lg border-b border-gray-400 mr-36 cursor-pointer hover:bg-gray-100 p-1">巻物の内容</h2>
          <p class="text-sm text-gray-600 ml-4">鬼ヶ島の住所</p>
          <p class="text-sm text-gray-600 ml-4">鍛冶の村までの行き方</p>
        </div>
      </div>
    </div>
  </background>
</template>
