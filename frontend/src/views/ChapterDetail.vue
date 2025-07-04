<script setup>
  import background from '@/components/BackgroundImage.vue'
  import { ref, computed } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  // ルーター機能を使用
const router = useRouter()
const route = useRoute()

// URLから章のIDを取得 (例: /chapter/1 なら '1' が入る)
const chapterId = computed(() => route.params.id)

// 本来はAPIや外部ファイルからデータを取得しますが、ここではサンプルデータを用意します
const allChaptersData = {
  '1': {
    title: '第一章',
    subtitle: '鍛冶の村編',
    destination: '鍛冶の村',
    objective: '宛先である最初の村まで行き、鬼を退治するための刀を携える。\n行くには、2つの関所（ルータ）を通過する必要がある。',
    roles: [
      { name: '桃太郎', role: 'バケット' },
      { name: '関所', role: 'ルータ' }
    ],
    stages: ['1-1', '1-2']
  },
  '2': {
    title: '第二章',
    subtitle: '港町編',
    destination: '港町',
    objective: '次の目的地へ向かうための船を探す。',
    roles: [
      { name: '桃太郎', role: '主人公' }
    ],
    stages: ['2-1', '2-2', '2-3']
  }
  // ...他の章のデータ
}

// URLのIDに対応する現在の章のデータを取得
const currentChapter = computed(() => {
  return allChaptersData[chapterId.value]
})

// ステージ選択時にページを遷移させる関数
const goToStage = (stageId) => {
  // ここではまだ実装しないが、将来的には router.push(`/stage/${stageId}`) のように使う
  alert(`${stageId} へ移動します`)
}
</script>
<template>
  <background>
    <!-- 左ページ -->
    <div class="flex-1 p-8 pt-24 pl-80">
      <h1 class="text-2xl font-bold mb-4">{{ currentChapter.title }}</h1>
      <h2 class="text-2xl font-bold mb-4">{{ currentChapter.subtitle }}</h2>

      <div class="border-b border-gray-400 mr-36 cursor-pointer hover:bg-gray-100 p-1">
        <h3 class="font-bold border-b border-gray-400 inline-block mb-2">宛先</h3>
        <p>{{ currentChapter.destination }}</p>
      </div>

      <div class="border-b border-gray-400 mr-36 cursor-pointer hover:bg-gray-100 p-1">
        <h3 class="font-bold border-b border-gray-400 inline-block mb-2">目的</h3>
        <p class="whitespace-pre-line">{{ currentChapter.objective }}</p>
      </div>

      <div class="border-b border-gray-400 mr-36 cursor-pointer hover:bg-gray-100 p-1">
        <h3 class="font-bold border-b border-gray-400 inline-block mb-2">役割</h3>
        <ul>
          <li v-for="item in currentChapter.roles" :key="item.name">
            {{ item.name }}：{{ item.role }}
          </li>
        </ul>
      </div>
    </div>
  </background>
</template>
