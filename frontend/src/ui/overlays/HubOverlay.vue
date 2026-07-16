<script setup>
// ハブ（タイトル + セレクト）のオーバーレイ UI。3D 側の状態は hub ストアを介して読む。
import { ref, computed, watch, onUnmounted } from 'vue'
import { useHubStore } from '@/app/stores/hub.js'
import { useSessionStore } from '@/app/stores/session.js'
import { useProgressStore } from '@/app/stores/progress.js'
import { useSettingsStore } from '@/app/stores/settings.js'
import { useGame } from '@/runtime/Game.js'
import GameButton from '@/ui/components/GameButton.vue'
import AuthModal from '@/ui/components/AuthModal.vue'
import UserChip from '@/ui/components/UserChip.vue'
import AdventureBook from '@/ui/components/AdventureBook.vue'

const hub = useHubStore()
const session = useSessionStore()
const progress = useProgressStore()
const settings = useSettingsStore()
const authOpen = ref(false)
const bookOpen = ref(false)

const showTitleMenu = computed(() => hub.phase === 'title')
const showSelect = computed(() => hub.phase === 'select')

// 冒険の書・ログインを開いている間はキャラ操作を止める（プレート誤発火防止）
watch([bookOpen, authOpen], ([book, auth]) => {
  try {
    const input = useGame().input
    if (book || auth) input.lock('hub-modal')
    else input.unlock('hub-modal')
  } catch {
    /* noop */
  }
})

function start() {
  try {
    const game = useGame()
    game.world?.startGame?.()
  } catch {
    /* ランタイム未生成時は何もしない */
  }
}

// タイトルでは Enter / Space でも はじめる（タイトル中はゲーム入力がロックされているため独自に拾う）
function onTitleKeydown(e) {
  if (hub.phase !== 'title' || authOpen.value) return
  const t = e.target
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
  if (e.key === 'Enter' || e.code === 'Space') {
    e.preventDefault()
    start()
  }
}
watch(
  () => hub.phase,
  (phase) => {
    if (phase === 'title') window.addEventListener('keydown', onTitleKeydown)
    else window.removeEventListener('keydown', onTitleKeydown)
  },
  { immediate: true },
)
onUnmounted(() => window.removeEventListener('keydown', onTitleKeydown))

async function onLoggedIn() {
  authOpen.value = false
  if (session.isLoggedIn) progress.fetchRecords(session.user.userId)
}
</script>

<template>
  <div class="hub-overlay">
    <!-- タイトルメニュー -->
    <Transition name="title-menu">
      <div v-if="showTitleMenu" class="title-menu">
        <p class="subtitle">— ネットワークのしくみで あそぶ ももたろう —</p>
        <div class="menu-buttons">
          <GameButton label="はじめる" variant="primary" size="lg" @press="start" />
        </div>
        <p class="hint">Enter でも はじめられるよ ／ クリックすると 音がなるよ</p>
      </div>
    </Transition>

    <!-- 右上: ユーザー情報（タイトルとセレクト共通） -->
    <div v-if="showTitleMenu || showSelect" class="top-right">
      <UserChip @request-login="authOpen = true" />
    </div>

    <!-- セレクト中: プレート概要パネル -->
    <Transition name="panel">
      <div v-if="showSelect && hub.plateInfo" class="plate-panel">
        <h3>{{ hub.plateInfo.label }}</h3>
        <p>{{ hub.plateInfo.summary }}</p>
      </div>
    </Transition>

    <!-- セレクト中: 操作モード切替（表記のみ） -->
    <div v-if="showSelect" class="top-left">
      <GameButton
        :label="`そうさひょうじ: ${settings.inputMode === 'wasd' ? 'WASD' : 'やじるしキー'}`"
        variant="ghost"
        @press="settings.toggleInputMode()"
      />
    </div>

    <!-- セレクト中: 操作ヒント -->
    <div v-if="showSelect" class="corner-hint">
      {{ settings.moveKeys() }}: あるく ／ {{ settings.interactKey() }}: けってい ／ Esc: もどる
    </div>

    <!-- セレクト中: 冒険の書 -->
    <div v-if="showSelect" class="bottom-right">
      <GameButton label="ぼうけんのしょ" variant="ghost" @press="bookOpen = true" />
    </div>
    <AdventureBook :open="bookOpen" @close="bookOpen = false" />

    <AuthModal :open="authOpen" @close="onLoggedIn" />
  </div>
</template>

<style scoped>
.hub-overlay {
  position: absolute;
  inset: 0;
}

.title-menu {
  position: absolute;
  left: 50%;
  bottom: 12%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  pointer-events: auto;
}
.subtitle {
  font-size: 20px;
  color: #fff;
  text-shadow: 0 2px 8px rgba(20, 16, 28, 0.6);
  letter-spacing: 0.12em;
}
.menu-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}
.hint {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
  text-shadow: 0 1px 4px rgba(20, 16, 28, 0.6);
}

.top-right {
  position: absolute;
  top: 18px;
  right: 20px;
  pointer-events: auto;
}
.top-left {
  position: absolute;
  top: 18px;
  left: 20px;
  pointer-events: auto;
}
.bottom-right {
  position: absolute;
  bottom: 14px;
  right: 20px;
  pointer-events: auto;
}

.plate-panel {
  position: absolute;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%);
  width: min(680px, 86vw);
  background: linear-gradient(180deg, var(--color-paper), var(--color-paper-soft));
  border: 2px solid rgba(51, 38, 29, 0.25);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-panel);
  padding: 14px 22px 16px;
}
.plate-panel h3 {
  color: var(--color-accent-strong);
  font-size: 20px;
  margin-bottom: 4px;
}
.plate-panel p {
  color: var(--color-ink);
  font-size: 16px;
  line-height: 1.6;
  white-space: pre-line;
}

.corner-hint {
  position: absolute;
  left: 18px;
  bottom: 14px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 1px 4px rgba(20, 16, 28, 0.7);
}

/* 入退場モーション（standard/emphasized 規定） */
.title-menu-enter-active,
.title-menu-leave-active {
  transition: opacity var(--dur-emphasized) var(--ease-out), transform var(--dur-emphasized) var(--ease-out);
}
.title-menu-enter-from,
.title-menu-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(16px);
}
.panel-enter-active,
.panel-leave-active {
  transition: opacity var(--dur-standard) var(--ease-out), transform var(--dur-standard) var(--ease-out);
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(14px);
}
</style>
