<script setup>
// 画面右上に常駐する小さなユーザー表示。ログイン状態のガイドとログアウト導線を兼ねる。
import { useSessionStore } from '@/app/stores/session.js'

defineEmits(['requestLogin'])

const session = useSessionStore()
</script>

<template>
  <div class="user-chip">
    <template v-if="session.isLoggedIn">
      <span class="user-chip-name">{{ session.user.username }} さん</span>
      <button type="button" class="user-chip-logout" @click="$event.currentTarget.blur(); session.logout()">ログアウト</button>
    </template>
    <template v-else>
      <button type="button" class="user-chip-login" @click="$event.currentTarget.blur(); $emit('requestLogin')">ログイン</button>
    </template>
  </div>
</template>

<style scoped>
.user-chip {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--color-paper);
  border-radius: var(--radius-button);
  box-shadow: var(--shadow-panel);
  padding: 0.45em 0.8em;
  font-family: var(--font-game);
  font-size: 0.85rem;
  color: var(--color-ink);
}

.user-chip-name {
  white-space: nowrap;
}

.user-chip-logout,
.user-chip-login {
  font-family: var(--font-game);
  font-size: 0.8rem;
  border: none;
  border-radius: var(--radius-button);
  cursor: pointer;
  padding: 0.35em 0.7em;
  color: var(--color-paper);
  background: var(--color-ink-soft);
  transition:
    transform var(--dur-standard) var(--ease-out),
    filter var(--dur-standard) var(--ease-out);
}

.user-chip-login {
  background: var(--color-accent);
}

.user-chip-logout:hover,
.user-chip-login:hover {
  transform: translateY(-1px);
  filter: brightness(1.08);
}
</style>
