<script setup>
// ログイン/新規登録モーダル。未ログインでも遊べる仕様のため、あくまで任意操作として提供する。
import { ref, watch, onUnmounted } from 'vue'
import { useSessionStore } from '@/app/stores/session.js'
import GameButton from './GameButton.vue'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['close'])

const session = useSessionStore()

const tab = ref('login') // 'login' | 'register'
const username = ref('')
const password = ref('')
const isSubmitting = ref(false)
const errorMessage = ref('')

function resetForm() {
  username.value = ''
  password.value = ''
  errorMessage.value = ''
  isSubmitting.value = false
}

function switchTab(next) {
  tab.value = next
  errorMessage.value = ''
}

function messageFor(err) {
  if (err?.status === 401 || err?.status === 400 || err?.status === 404) {
    return 'なまえかパスワードがちがうよ'
  }
  if (err?.status === 409) {
    return 'そのなまえはもう使われているよ'
  }
  if (!err?.status) {
    return 'サーバーにつながらないよ'
  }
  return 'なにかがうまくいかなかったよ'
}

async function submit() {
  if (isSubmitting.value) return
  if (!username.value.trim() || !password.value.trim()) {
    errorMessage.value = 'なまえとパスワードを入力してね'
    return
  }
  isSubmitting.value = true
  errorMessage.value = ''
  try {
    if (tab.value === 'login') {
      await session.login(username.value.trim(), password.value)
    } else {
      await session.register(username.value.trim(), password.value)
    }
    resetForm()
    emit('close')
  } catch (err) {
    errorMessage.value = messageFor(err)
  } finally {
    isSubmitting.value = false
  }
}

function close() {
  resetForm()
  emit('close')
}

function onKeydown(e) {
  if (e.key === 'Escape') close()
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      window.addEventListener('keydown', onKeydown)
    } else {
      window.removeEventListener('keydown', onKeydown)
    }
  },
)

onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="auth-modal">
    <div v-if="open" class="auth-overlay" @click.self="close">
      <div class="auth-panel">
        <div class="auth-tabs">
          <button
            type="button"
            class="auth-tab"
            :class="{ 'is-active': tab === 'login' }"
            @click="switchTab('login')"
          >
            ログイン
          </button>
          <button
            type="button"
            class="auth-tab"
            :class="{ 'is-active': tab === 'register' }"
            @click="switchTab('register')"
          >
            新規登録
          </button>
        </div>

        <form class="auth-form" @submit.prevent="submit">
          <label class="auth-field">
            <span class="auth-field-label">なまえ</span>
            <input
              v-model="username"
              type="text"
              class="auth-input"
              autocomplete="username"
              :disabled="isSubmitting"
            />
          </label>
          <label class="auth-field">
            <span class="auth-field-label">パスワード</span>
            <input
              v-model="password"
              type="password"
              class="auth-input"
              autocomplete="current-password"
              :disabled="isSubmitting"
            />
          </label>

          <p v-if="errorMessage" class="auth-error">{{ errorMessage }}</p>

          <div class="auth-actions">
            <GameButton
              :label="tab === 'login' ? 'ログイン' : '登録する'"
              variant="primary"
              :disabled="isSubmitting"
              @press="submit"
            />
            <GameButton label="とじる" variant="ghost" :disabled="isSubmitting" @press="close" />
          </div>
        </form>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.auth-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20, 14, 8, 0.55);
  pointer-events: auto;
}

.auth-panel {
  width: min(360px, 90vw);
  background: var(--color-paper);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-panel);
  padding: 1.5rem;
  color: var(--color-ink);
}

.auth-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.auth-tab {
  flex: 1;
  font-family: var(--font-game);
  font-size: 0.95rem;
  padding: 0.5em 0;
  border: none;
  border-radius: var(--radius-button);
  background: transparent;
  color: var(--color-ink-soft);
  cursor: pointer;
  transition:
    background var(--dur-standard) var(--ease-out),
    color var(--dur-standard) var(--ease-out);
}

.auth-tab.is-active {
  background: var(--color-paper-soft);
  color: var(--color-accent-strong);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.auth-field-label {
  font-size: 0.85rem;
  color: var(--color-ink-soft);
}

.auth-input {
  font-family: var(--font-game);
  font-size: 1rem;
  color: var(--color-ink);
  background: transparent;
  border: none;
  border-bottom: 2px solid var(--color-paper-soft);
  padding: 0.4em 0.2em;
  outline: none;
  transition: border-color var(--dur-standard) var(--ease-out);
}

.auth-input:focus {
  border-color: var(--color-accent);
}

.auth-error {
  font-size: 0.85rem;
  color: var(--color-danger);
}

.auth-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

/* 入退場アニメ */
.auth-modal-enter-active,
.auth-modal-leave-active {
  transition: opacity 0.25s var(--ease-out);
}
.auth-modal-enter-active .auth-panel,
.auth-modal-leave-active .auth-panel {
  transition: transform 0.25s var(--ease-out);
}
.auth-modal-enter-from,
.auth-modal-leave-to {
  opacity: 0;
}
.auth-modal-enter-from .auth-panel,
.auth-modal-leave-to .auth-panel {
  transform: scale(0.96);
}
</style>
