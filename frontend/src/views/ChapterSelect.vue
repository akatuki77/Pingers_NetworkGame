<script setup>
  // 背面背景のコンポーネントをインポート
  import background from '@/components/BackgroundImage.vue'
  import { computed } from 'vue'
  import { useRoute } from 'vue-router'

  // 1. すべての物語のデータを一元管理するオブジェクト
  const allStories = {
    '1': { // 物語ID '1' (桃太郎)
      title: 'ももたろう',
      synopsis: 'おじいさんから巻物（地図）を渡され、鬼退治の旅に出る。',
      items: [
        { heading: '巻物の内容', details: ['鬼ヶ島の住所', '鍛冶の村までの行き方'] }
      ],
      chapters: [
        { number: 1, title: '鍛冶の村編' },
        { number: 2, title: '港町編' },
        { number: 3, title: '仲間づくり編' },
        { number: 4, title: '鬼ヶ島編' }
      ]
    },
    '2': { // 物語ID '2' (金太郎)
      title: 'きんたろう',
      synopsis: '足柄山で動物たちと相撲を取りながら育った、力持ちの男の子の物語。',
      items: [
        { heading: '特技', details: ['相撲', '木をなぎ倒すこと'] }
      ],
      chapters: [
        { number: 1, title: '誕生編' },
        { number: 2, title: '動物たちとの出会い編' },
        { number: 3, title: '都への旅立ち編' }
      ]
    }
    // 将来、浦島太郎を追加する場合はここに '3': { ... } を追加するだけ
  }

  const route = useRoute() // ★ ルーター機能を使用

  // ✅ 以下を追加: storyIdをテンプレートから使えるようにする
  const storyId = computed(() => route.params.storyId)

  // URLのIDに応じて、表示すべき物語のデータを動的に選択する
  const storyData = computed(() => {
    // allStoriesの中から、URLのIDに一致する物語のデータを返す
    // 上でstoryIdを定義したので、ここでは .value を使ってアクセスする
    return allStories[storyId.value] || {}
  })
</script>

<template>
  <background>
    <div v-if="storyData.title" class="relative w-full h-full flex justify-center items-center">
      <div class="absolute inset-0 flex pt-8">
        <div class="flex-1 p-8 pt-24 pl-80">
          <h1 class="text-2xl font-bold mb-4">目次</h1>
          <div class="space-y-4">
            <RouterLink
              v-for="chapter in storyData.chapters"
              :key="chapter.number"
              :to="`/story/${storyId}/chapter/${chapter.number}`">
              <h2 class="text-lg border-b border-gray-400 mr-36 cursor-pointer hover:bg-gray-100 p-1">第{{ chapter.number }}章</h2>
              <p class="text-sm text-gray-600 ml-4">{{ chapter.title }}</p>
            </RouterLink>
          </div>
        </div>

        <div class="flex-1 p-8 pt-24 pr-64">
          <h1 class="text-2xl font-bold mb-4">{{ storyData.title }}</h1>

          <h2 class="text-lg border-b border-gray-400 mr-36">あらすじ</h2>
          <p class="text-sm text-gray-600 ml-4">{{ storyData.synopsis }}</p>

          <div v-for="item in storyData.items" :key="item.heading" class="mt-4">
             <h2 class="text-lg border-b border-gray-400 mr-36">{{ item.heading }}</h2>
             <p v-for="detail in item.details" :key="detail" class="text-sm text-gray-600 ml-4">{{ detail }}</p>
          </div>
        </div>
      </div>
    </div>
  </background>
</template>
