<script setup>
  // 背面背景のコンポーネントをインポート
  import background from '@/components/BackgroundImage.vue'
  import { computed } from 'vue'
  import { useRoute } from 'vue-router'

  // ルーター機能を使用
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
    objective: '行くには、2つの関所（ルータ）を通過する必要がある。',
    roles: [
      { name: '桃太郎', role: 'バケット' },
      { name: '関所', role: 'ルータ' }
    ],
    stages: ['2-1', '2-2', '2-3']
  },
  '3': {
    title: '第三章',
    subtitle: '仲間づくり編',
    destination: '港町',
    objective: '動物たちの名前を覚えるには、一度、きびだんごを与えて覚えないといけない',
    roles: [
      { name: '桃太郎', role: 'スイッチ' }
    ],
    stages: ['3-1', '3-2']
  },
  '4': {
    title: '第四章',
    subtitle: '鬼ヶ島編',
    destination: '鬼ヶ島',
    objective: '討伐隊の準備が整ったので、鬼ヶ島へ向かい、鬼の討伐',
    roles: [
      { name: '桃太郎', role: 'パケット' }
    ],
    stages: ['4-1', '4-2']
  }
}

// URLのIDに対応する現在の章のデータを取得
const currentChapter = computed(() => {
  return allChaptersData[chapterId.value]
})

// ステージ選択時にページを遷移させる関数
const goToStage = (stageId) => {
  alert(`${stageId} へ移動します`)
}
</script>

<template>
  <background>
    <div class="relative w-full h-full flex justify-center items-center">
      <div class="absolute inset-0 flex pt-8">
        <!-- 左ページ -->
        <div class="flex-1 p-8 pt-24 pl-80">
          <h1 class="text-2xl font-bold mb-4">{{ currentChapter.title }}</h1>
          <h2 class="text-2xl font-bold mb-4 border-b border-gray-400 mr-36 cursor-pointer hover:bg-gray-100 p-1">{{ currentChapter.subtitle }}</h2>

            <h3 class="border-b border-gray-400 mr-36 cursor-pointer hover:bg-gray-100 p-1 inline-block">宛先</h3>
            <p>{{ currentChapter.destination }}</p>

            <h3 class="border-b border-gray-400 mr-36 cursor-pointer hover:bg-gray-100 p-1 inline-block">目的</h3>
            <p class="whitespace-pre-line">{{ currentChapter.objective }}</p>

            <h3 class="border-b border-gray-400 mr-36 cursor-pointer hover:bg-gray-100 p-1 inline-block">役割</h3>
            <ul>
              <li v-for="item in currentChapter.roles" :key="item.name">
                {{ item.name }}：{{ item.role }}
              </li>
            </ul>
        </div>

        <!-- 右ページ -->
        <div class="flex-1 p-8 pt-24 pr-64">
            <h2 class="text-lg border-b border-gray-400 mr-36 cursor-pointer hover:bg-gray-100 p-1 inline-block">ステージ選択</h2>
            <div class="text-sm text-gray-600 ml-4">
              <div v-for="stage in currentChapter.stages"
                :key="stage"
                class="border-b border-gray-400 mr-36 cursor-pointer hover:bg-gray-100 p-1"
                @click="goToStage(stages)">
                <p class="text-lg">{{ stage }}</p>
              </div>
            </div>
        </div>
      </div>
    </div>
  </background>
</template>
