// stores/userStore.js

import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  // 1. ページ読み込み時に、ローカルストレージから保存されたデータを読み込む
  state: () => {
    const savedUser = localStorage.getItem('user_data');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      return { user: parsedUser, isLoggedIn: true };
    }
    return {
      user: null,
      isLoggedIn: false,
    };
  },

  actions: {
    setUser(userData) {
      this.user = userData;
      this.isLoggedIn = !!userData;
      // 2. ログイン時に、ユーザー情報をローカルストレージに保存
      localStorage.setItem('user_data', JSON.stringify(userData));
    },
    logout() {
      this.user = null;
      this.isLoggedIn = false;
      // 3. ログアウト時に、ローカルストレージからデータを削除
      localStorage.removeItem('user_data');
    },
  },
});
