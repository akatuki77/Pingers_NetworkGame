<script setup>
  // 背面背景のコンポーネントをインポート
  import background from '@/components/BackgroundImage.vue'
  import { computed } from 'vue'
  import { useRoute } from 'vue-router'

  //データ構造を物語IDごとに入れ子にする
  const allStoriesData = {
    '1': { // 物語ID: 1 (桃太郎)
      chapters: {
        '1': {
          title: '第一章',
          subtitle: '鍛冶の村編',
          destination: '鍛冶の村',
          objective: '宛先である最初の村まで行き、鬼を退治するための刀を携える。\n行くには、2つの関所（ルータ）を通過する必要がある。',
          roles: [{ name: '桃太郎', role: 'バケット' }, { name: '関所', role: 'ルータ' }],
          stages: ['1-1', '1-2']
        },
        '2': { title: '第二章', subtitle: '港町編', stages: ['2-1', '2-2', '2-3'] /* ... */ },
        '3': { title: '第三章', subtitle: '仲間づくり編', stages: ['3-1', '3-2'] /* ... */ },
        '4': { title: '第四章', subtitle: '鬼ヶ島編', stages: ['4-1', '4-2'] /* ... */ }
      }
    },
    '2': { // 物語ID: 2 (金太郎)
      chapters: {
        '1': {
          title: '第一章',
          subtitle: '誕生編',
          destination: '足柄山',
          objective: '山で動物たちと仲良く暮らす。',
          roles: [{ name: '金太郎', role: 'ベアメタル' }],
          stages: ['A-1', 'A-2'] // 金太郎用のステージID
        },
        '2': { title: '第二章', subtitle: '相撲大会編', stages: ['B-1', 'B-2'] /* ... */ }
      }
    }
  }

  const route = useRoute()

  // 2. URLから物語IDと章IDの両方を取得する
  const storyId = computed(() => route.params.storyId)
  const chapterId = computed(() => route.params.chapterId)

  // 3. 2つのIDを使って、対応する章のデータを正確に取得する
  const currentChapterData = computed(() => {
    // 例: storyIdが'1', chapterIdが'1'なら、桃太郎の第一章のデータを返す
    return allStoriesData[storyId.value]?.chapters[chapterId.value] || {}
  })

  const goToStage = (stageId) => {
    alert(`${stageId} へ移動します`)
    // router.push(...)などで実際の画面遷移を実装
  }
</script>

<template>
  <background>
    <div class="relative w-full h-full flex justify-center items-center">
      <div class="absolute inset-0 flex pt-8">
        <!-- 左ページ -->
        <div class="flex-1 p-8 pt-24 pl-80">
          <h1 class="text-2xl font-bold mb-4">{{ currentChapterData.title }}</h1>
          <h2 class="text-2xl font-bold mb-4 border-b border-gray-400 mr-36 cursor-pointer hover:bg-gray-100 p-1">{{ currentChapterData.subtitle }}</h2>

            <h3 class="border-b border-gray-400 mr-36 cursor-pointer hover:bg-gray-100 p-1 inline-block">宛先</h3>
            <p>{{ currentChapterData.destination }}</p>

            <h3 class="border-b border-gray-400 mr-36 cursor-pointer hover:bg-gray-100 p-1 inline-block">目的</h3>
            <p class="whitespace-pre-line">{{ currentChapterData.objective }}</p>

            <h3 class="border-b border-gray-400 mr-36 cursor-pointer hover:bg-gray-100 p-1 inline-block">役割</h3>
            <ul>
              <li v-for="item in currentChapterData.roles" :key="item.name">
                {{ item.name }}：{{ item.role }}
              </li>
            </ul>
        </div>

        <!-- 右ページ -->
        <div class="flex-1 p-8 pt-24 pr-64">
            <h2 class="text-lg border-b border-gray-400 mr-36 cursor-pointer hover:bg-gray-100 p-1 inline-block">ステージ選択</h2>
            <div class="text-sm text-gray-600 ml-4">
              <div v-for="stage in currentChapterData.stages"
                :key="stage"
                class="border-b border-gray-400 mr-36 cursor-pointer hover:bg-gray-100 p-1"
                @click="goToStage(stage)">
                <p class="text-lg">{{ stage }}</p>
              </div>
            </div>
        </div>
      </div>
    </div>
  </background>
</template>
