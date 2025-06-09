<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const testData = ref([]);
const errorMessage = ref('');
const isLoading = ref(true);

onMounted(async () => {
  try {
    const response = await axios.get('http://localhost:3000/api/test');
    testData.value = response.data;
  } catch (error) {
    console.error('データの取得に失敗しました:', error);
    errorMessage.value = 'データの取得に失敗しました。バックエンドサーバーが起動しているか、APIのパスやテーブル名が正しいか確認してください。';
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <main class="p-4 md:p-8 bg-gray-50 min-h-screen">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-800 mb-6 border-b pb-2">
        Vue + Node.js + MySQL + Tailwind CSS
      </h1>

      <div v-if="errorMessage" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong class="font-bold">エラー: </strong>
        <span class="block sm:inline">{{ errorMessage }}</span>
      </div>

      <div v-if="isLoading" class="text-center py-10">
        <p class="text-gray-500">データを読み込み中...</p>
      </div>

      <div v-else-if="testData.length > 0" class="bg-white p-6 rounded-lg shadow-md">
        <h2 class="text-xl font-semibold text-gray-700 mb-4">データベースから取得したデータ:</h2>
        <ul class="list-disc list-inside space-y-2">
          <li v-for="item in testData" :key="item.id" class="text-gray-600">
            {{ item.name }} (ID: {{ item.id }})
          </li>
        </ul>
      </div>

    </div>
  </main>
</template>
