<template>
  <div class="glossary-page">
    <h1 class="page-title">用語解説</h1>

    <div class="search-container">
      <input type="text" v-model="searchTerm" placeholder="用語を検索..." class="search-input">
    </div>

    <div class="glossary-list">
      <div v-for="term in filteredTerms" :key="term.id" class="term-item">
        <button @click="toggleTerm(term.id)" class="term-title" :aria-expanded="isActive(term.id)">
          {{ term.name }}
          <span class="icon" :class="{ 'is-active': isActive(term.id) }"></span>
        </button>
        <div v-show="isActive(term.id)" class="term-description">
          <p>{{ term.description }}</p>
        </div>
      </div>
    </div>

    <BackButton to="/" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import BackButton from '@/components/BackButton.vue';

// --- 用語データ ---
// 今後、この部分を別ファイルにしたり、APIから取得するように変更できる。
const terms = ref([
  {
    id: 'router',
    name: 'ルーター (Router)',
    description: 'ネットワークにおいて、データを異なるネットワーク間で中継・転送するための機器やソフトウェアのこと。'
  },
  {
    id: 'packet',
    name: 'パケット (Packet)',
    description: 'ネットワークを通じて転送されるデータの小さな単位。ヘッダー（宛先情報など）とペイロード（実際のデータ）で構成される。'
  },
  {
    id: 'switch',
    name: 'スイッチ (Switch)',
    description: 'ネットワーク内で、特定の宛先MACアドレスを持つデバイスにのみデータを転送する機器。ハブとは異なり、無駄なトラフィックを減らすことができる。'
  },
  {
    id: 'default-gateway',
    name: 'デフォルトゲートウェイ (Default Gateway)',
    description: '内部ネットワークと外部ネットワーク（インターネットなど）を接続するための出入り口となるルーターのこと。宛先が不明なパケットは、まずデフォルトゲートウェイに送られる。'
  },
  {
    id: 'ip-address',
    name: 'IPアドレス (IP Address)',
    description: 'ネットワーク上の機器を識別するためのインターネットプロトコル上の住所。通常、「192.168.1.1」のようにピリオドで区切られた4つの数字で表される。'
  },
  {
    id: 'mac-address',
    name: 'MACアドレス (MAC Address)',
    description: 'ネットワーク機器（NICなど）に割り当てられた物理的な固有の識別番号。「00:1A:2B:3C:4D:5E」のように16進数で表される。'
  }

]);

// --- 機能 ---

// 検索キーワード
const searchTerm = ref('');

// 検索キーワードでフィルタリングされた用語リスト
const filteredTerms = computed(() => {
  if (!searchTerm.value) {
    return terms.value;
  }
  return terms.value.filter(term =>
    term.name.toLowerCase().includes(searchTerm.value.toLowerCase()) ||
    term.description.toLowerCase().includes(searchTerm.value.toLowerCase())
  );
});

// 現在開いている用語のIDを管理
const activeTermId = ref(null);

// 用語の表示/非表示を切り替える
const toggleTerm = (id) => {
  activeTermId.value = activeTermId.value === id ? null : id;
};

// 指定されたIDの用語が開いているかどうかを判定
const isActive = (id) => {
  return activeTermId.value === id;
};
</script>

<style scoped>
.glossary-page {
  width: 100%;
  min-height: 100vh;
  padding: 4rem 2rem;
  background-color: #f4f1e9; /* 和紙のような背景色 */
  color: #333;
  box-sizing: border-box;
}

.page-title {
  font-size: 3rem;
  font-weight: bold;
  text-align: center;
  margin-bottom: 2rem;
  font-family: 'Shippori Mincho', serif; /* 日本語フォントの指定例 */
}

.search-container {
  margin-bottom: 2rem;
  display: flex;
  justify-content: center;
}

.search-input {
  width: 100%;
  max-width: 500px;
  padding: 0.8rem 1.2rem;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 25px;
  outline: none;
  transition: border-color 0.3s, box-shadow 0.3s;
}
.search-input:focus {
  border-color: #8a6d3b;
  box-shadow: 0 0 5px rgba(138, 109, 59, 0.5);
}

.glossary-list {
  max-width: 800px;
  margin: 0 auto;
}

.term-item {
  border-bottom: 1px solid #ddd;
}

.term-title {
  width: 100%;
  padding: 1.5rem 1rem;
  font-size: 1.5rem;
  font-weight: bold;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.3s;
}
.term-title:hover {
  background-color: rgba(0, 0, 0, 0.03);
}

.term-description {
  padding: 0 1.5rem 1.5rem 1.5rem;
  font-size: 1.1rem;
  line-height: 1.8;
  color: #555;
}

/* 開閉アイコンのスタイル */
.icon {
  width: 1em;
  height: 1em;
  border-right: 3px solid #333;
  border-bottom: 3px solid #333;
  transform: rotate(45deg);
  transition: transform 0.3s ease;
}
.icon.is-active {
  transform: rotate(-135deg);
}

/* BackButton用のスタイル（必要に応じて調整） */
:deep(.back-button) {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
}
</style>
