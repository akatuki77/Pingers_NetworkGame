<script setup>
// 近接プロンプト（例: 「E: かんばんをよむ」）。DialogueBox より上、画面下中央に表示する。
import { useStageStore } from '@/app/stores/stage.js'
import { useSettingsStore } from '@/app/stores/settings.js'

const store = useStageStore()
const settings = useSettingsStore()
</script>

<template>
  <Transition name="prompt-toast">
    <div v-if="store.prompt" class="prompt-toast">
      <span class="prompt-key" :class="{ wide: settings.inputMode === 'arrows' }">{{ settings.interactKey() }}</span>
      <span class="prompt-label">{{ store.prompt.label }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.prompt-toast {
  position: fixed;
  left: 50%;
  bottom: 120px;
  transform: translate(-50%, 0);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(180deg, var(--color-paper) 0%, var(--color-paper-soft) 100%);
  border: 2px solid var(--color-ink-soft);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-panel);
  padding: 8px 18px 8px 10px;
  pointer-events: none;
}

.prompt-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 26px;
  padding: 0 4px;
  border: 2px solid var(--color-ink);
  border-radius: 6px;
  background: var(--color-paper);
  color: var(--color-ink);
  font-family: var(--font-game);
  font-size: 14px;
  box-shadow: 0 2px 0 rgba(30, 20, 10, 0.3);
}

.prompt-label {
  font-family: var(--font-game);
  font-size: 15px;
  color: var(--color-ink);
}

/* 入退場 */
.prompt-toast-enter-active,
.prompt-toast-leave-active {
  transition:
    opacity var(--dur-standard) var(--ease-out),
    transform var(--dur-standard) var(--ease-out);
}
.prompt-toast-enter-from,
.prompt-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
</style>
