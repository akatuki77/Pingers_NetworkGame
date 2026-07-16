<script setup>
// ステージの目的を表示するモーダル。store.objectiveOpen を単一の正とする。
import { onUnmounted, watch } from 'vue'
import { useStageStore } from '@/app/stores/stage.js'
import ScrollPanel from './ScrollPanel.vue'
import GameButton from './GameButton.vue'

const store = useStageStore()

function close() {
  store.objectiveOpen = false
}

function onKeydown(e) {
  // 決定 = Enter/E、とじる = Esc（どちらでも閉じられる）
  if (e.key === 'Escape' || e.key === 'Enter' || e.code === 'KeyE') {
    e.preventDefault()
    close()
  }
}

watch(
  () => store.objectiveOpen,
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
  <Transition name="objective-panel">
    <div v-if="store.objectiveOpen" class="objective-overlay" @click.self="close">
      <ScrollPanel title="もくてき" width="min(560px, 88vw)">
        <p class="objective-text">{{ store.objective }}</p>
        <div class="objective-actions">
          <GameButton label="とじる" variant="ghost" @press="close" />
        </div>
        <p class="key-hint">Enter / Esc: とじる</p>
      </ScrollPanel>
    </div>
  </Transition>
</template>

<style scoped>
.objective-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20, 16, 28, 0.45);
  pointer-events: auto;
}

.objective-text {
  margin: 0 0 20px;
  font-family: var(--font-game);
  font-size: 16px;
  line-height: 1.8;
  white-space: pre-line;
  color: var(--color-ink);
}

.objective-actions {
  display: flex;
  justify-content: center;
}
.key-hint {
  margin-top: 10px;
  text-align: center;
  font-size: 12px;
  color: var(--color-ink-soft);
}

/* 入退場: 暗幕はフェード、パネルはスケール */
.objective-panel-enter-active,
.objective-panel-leave-active {
  transition: opacity var(--dur-standard) var(--ease-out);
}
.objective-panel-enter-active :deep(.scroll-panel),
.objective-panel-leave-active :deep(.scroll-panel) {
  transition:
    transform var(--dur-standard) var(--ease-out),
    opacity var(--dur-standard) var(--ease-out);
}
.objective-panel-enter-from,
.objective-panel-leave-to {
  opacity: 0;
}
.objective-panel-enter-from :deep(.scroll-panel),
.objective-panel-leave-to :deep(.scroll-panel) {
  transform: scale(0.96);
  opacity: 0;
}
</style>
