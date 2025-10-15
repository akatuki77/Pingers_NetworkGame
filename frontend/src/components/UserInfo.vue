<template>
  <div class="user-info-container">
    <span class="username">ようこそ、{{ userStore.user.username }} さん</span>
    <button @click="handleLogout" class="logout-button">ログアウト</button>
  </div>
</template>

<script setup>
import { useUserStore } from '@/stores/userStore';
import { useRouter } from 'vue-router'; // ★ useRouterをインポート

const userStore = useUserStore();
const router = useRouter(); // ★ routerをインスタンス化

const handleLogout = () => {
  userStore.logout();
  // ★ ページを再読み込みしない、よりスムーズな画面遷移に変更
  router.push('/');
};
</script>

<style scoped>
/* ★ コンテナを画面右上に固定 */
.user-info-container {
  position: fixed; /* 画面に固定 */
  top: 20px;
  right: 20px;
  z-index: 100; /* 他の要素より手前に表示 */

  display: flex;
  align-items: center; /* 縦方向の中央揃え */
  gap: 1.5rem; /* 要素間の余白 */

  color: white;
  background-color: rgba(0, 0, 0, 0.3);
  padding: 0.8rem 1.5rem;
  border-radius: 50px;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.username {
  font-size: 1em;
  font-weight: 500;
}

/* ★ ボタンのデザインをシンプルに変更 */
.logout-button {
  padding: 0;
  font-size: 0.9em;
  font-weight: 500;
  color: #d1d1d1;
  background-color: transparent;
  border: none;
  cursor: pointer;
  transition: color 0.3s ease;
  text-decoration: underline;
}
.logout-button:hover {
  color: white;
}
</style>
