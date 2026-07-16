<script setup>
// 正解後の解説パネル。閉じる操作は親（画面遷移を担う側）に emit で委ねる。
import { onUnmounted, watch } from 'vue'
import { useStageStore } from '@/app/stores/stage.js'
import ScrollPanel from './ScrollPanel.vue'
import GameButton from './GameButton.vue'

const store = useStageStore()
const emit = defineEmits(['close'])

function goNext() {
  emit('close', 'next')
}
function goHub() {
  emit('close', 'hub')
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    goHub() // Esc はステージ選択へ
    return
  }
  if (e.key === 'Enter' || e.code === 'KeyE') {
    e.preventDefault()
    if (store.clearHasNext) goNext()
    else goHub()
  }
}

watch(
  () => store.explanation,
  (open) => {
    if (open) {
      window.addEventListener('keydown', onKeydown)
    } else {
      window.removeEventListener('keydown', onKeydown)
    }
  },
)

onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="explanation-panel">
    <div v-if="store.explanation" class="explanation-overlay">
      <ScrollPanel :title="store.explanation.title" width="min(620px, 90vw)">
        <div class="explanation-stamp">〇</div>
        <div class="explanation-body">
          <p class="explanation-text">{{ store.explanation.text }}</p>
        </div>
        <div class="explanation-actions">
          <GameButton
            v-if="store.clearHasNext"
            label="つぎのステージへ"
            variant="primary"
            size="lg"
            @press="goNext"
          />
          <GameButton
            label="ステージせんたくへ"
            :variant="store.clearHasNext ? 'ghost' : 'primary'"
            :size="store.clearHasNext ? 'md' : 'lg'"
            @press="goHub"
          />
        </div>
        <p class="key-hint" v-if="store.clearHasNext">Enter: つぎへ ／ Esc: ステージせんたく</p>
        <p class="key-hint" v-else>Enter: ステージせんたくへ</p>
      </ScrollPanel>
    </div>
  </Transition>
</template>

<style scoped>
.explanation-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20, 16, 28, 0.45);
  pointer-events: auto;
}

.explanation-stamp {
  width: 84px;
  height: 84px;
  margin: 0 auto 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 6px solid var(--color-gold);
  border-radius: 50%;
  color: var(--color-gold);
  font-family: var(--font-game);
  font-size: 40px;
  font-weight: bold;
  animation: stamp-in 0.5s var(--ease-out);
}

@keyframes stamp-in {
  0% {
    transform: scale(0) rotate(-35deg);
    opacity: 0;
  }
  70% {
    transform: scale(1.15) rotate(8deg);
    opacity: 1;
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

.explanation-body {
  max-height: 50vh;
  overflow-y: auto;
  padding-right: 6px;
}

.explanation-text {
  margin: 0;
  font-family: var(--font-game);
  font-size: 16px;
  line-height: 1.8;
  white-space: pre-line;
  color: var(--color-ink);
}

/* 和紙調のスクロールバー */
.explanation-body::-webkit-scrollbar {
  width: 10px;
}
.explanation-body::-webkit-scrollbar-track {
  background: var(--color-paper-soft);
  border-radius: 6px;
}
.explanation-body::-webkit-scrollbar-thumb {
  background: var(--color-accent);
  border-radius: 6px;
  border: 2px solid var(--color-paper-soft);
}

.explanation-actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
}
.key-hint {
  margin-top: 8px;
  text-align: center;
  font-size: 12px;
  color: var(--color-ink-soft);
}

/* 入退場 */
.explanation-panel-enter-active,
.explanation-panel-leave-active {
  transition: opacity var(--dur-standard) var(--ease-out);
}
.explanation-panel-enter-active :deep(.scroll-panel),
.explanation-panel-leave-active :deep(.scroll-panel) {
  transition:
    transform var(--dur-standard) var(--ease-out),
    opacity var(--dur-standard) var(--ease-out);
}
.explanation-panel-enter-from,
.explanation-panel-leave-to {
  opacity: 0;
}
.explanation-panel-enter-from :deep(.scroll-panel),
.explanation-panel-leave-to :deep(.scroll-panel) {
  transform: scale(0.96);
  opacity: 0;
}
</style>
