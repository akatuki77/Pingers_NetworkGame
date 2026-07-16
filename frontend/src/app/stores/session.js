// ログインセッションの管理。未ログインでも遊べる仕様のため、失敗しても致命的にはしない
// （呼び出し元が catch してメッセージ表示する前提）。
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '@/services/authApi.js'

const STORAGE_KEY = 'user_data'

function restoreUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const useSessionStore = defineStore('session', () => {
  const user = ref(restoreUser())

  const isLoggedIn = computed(() => user.value !== null)

  function persist() {
    if (user.value) localStorage.setItem(STORAGE_KEY, JSON.stringify(user.value))
    else localStorage.removeItem(STORAGE_KEY)
  }

  async function login(username, password) {
    const { userId } = await authApi.login(username, password)
    user.value = { userId, username }
    persist()
  }

  async function register(username, password) {
    await authApi.register(username, password)
    await login(username, password)
  }

  function logout() {
    user.value = null
    persist()
  }

  return { user, isLoggedIn, login, register, logout }
})
