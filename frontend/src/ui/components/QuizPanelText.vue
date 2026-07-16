<script setup>
// 文字入力式クイズ（配達依頼書＝パケットのヘッダーに宛先IPを書き込む）。
// 判定はストアの submitTextAnswer に委譲し、ここでは誤答時の演出のみ行う。
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { useStageStore } from '@/app/stores/stage.js'
import ScrollPanel from './ScrollPanel.vue'
import GameButton from './GameButton.vue'

const store = useStageStore()

const answer = ref('')
const shake = ref(false)
const inputEl = ref(null)
let shakeTimer = null

const isVisible = computed(() => store.quizOpen && store.quiz?.type === 'textInput')

function submit() {
  const ok = store.submitTextAnswer(answer.value)
  if (!ok) triggerShake()
}

function triggerShake() {
  // 同じアニメーションを連続再生できるよう、一度クラスを外してから付け直す
  shake.value = false
  requestAnimationFrame(() => {
    shake.value = true
    clearTimeout(shakeTimer)
    shakeTimer = setTimeout(() => {
      shake.value = false
    }, 300)
  })
}

function cancel() {
  store.quizOpen = false
  store.wrongHint = null
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    cancel()
  }
}

watch(isVisible, (visible) => {
  if (visible) {
    answer.value = ''
    window.addEventListener('keydown', onKeydown)
    nextTick(() => inputEl.value?.focus())
  } else {
    window.removeEventListener('keydown', onKeydown)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  clearTimeout(shakeTimer)
})
</script>

<template>
  <Transition name="quiz-panel">
    <div v-if="isVisible" class="quiz-overlay">
      <ScrollPanel title="配達依頼書" width="min(560px, 90vw)">
        <p class="quiz-question">{{ store.quiz.question }}</p>

        <div class="quiz-field">
          <span class="quiz-field-label">あてさき（IPアドレス）</span>
          <input
            ref="inputEl"
            v-model="answer"
            type="text"
            class="quiz-input"
            :class="{ 'is-shaking': shake }"
            placeholder="例: 192.168.1.xx"
            autocomplete="off"
            @keydown.enter="submit"
          />
        </div>

        <Transition name="quiz-hint">
          <p v-if="store.wrongHint" class="quiz-wrong-hint">{{ store.wrongHint }}</p>
        </Transition>

        <div class="quiz-actions">
          <GameButton label="やめる" variant="ghost" @press="cancel" />
          <GameButton label="とどける" variant="primary" @press="submit" />
        </div>
      </ScrollPanel>
    </div>
  </Transition>
</template>

<style scoped>
.quiz-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20, 16, 28, 0.45);
  pointer-events: auto;
}

.quiz-question {
  margin: 0 0 22px;
  font-family: var(--font-game);
  font-size: 16px;
  line-height: 1.8;
  white-space: pre-line;
  color: var(--color-ink);
}

.quiz-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.quiz-field-label {
  font-family: var(--font-game);
  font-size: 13px;
  color: var(--color-ink-soft);
}

.quiz-input {
  width: 100%;
  box-sizing: border-box;
  font-family: 'Courier New', var(--font-game), monospace;
  font-size: 22px;
  letter-spacing: 0.12em;
  color: var(--color-ink);
  background: transparent;
  border: none;
  border-bottom: 3px solid var(--color-ink-soft);
  padding: 6px 4px;
  outline: none;
  transition: border-color var(--dur-standard) var(--ease-out);
}
.quiz-input:focus {
  border-color: var(--color-accent);
}
.quiz-input.is-shaking {
  animation: quiz-shake 0.3s var(--ease-in-out);
}

@keyframes quiz-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-8px);
  }
  40% {
    transform: translateX(8px);
  }
  60% {
    transform: translateX(-6px);
  }
  80% {
    transform: translateX(6px);
  }
}

.quiz-wrong-hint {
  margin: 12px 0 0;
  font-family: var(--font-game);
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-danger);
}

.quiz-hint-enter-active {
  transition:
    opacity var(--dur-standard) var(--ease-out),
    transform var(--dur-standard) var(--ease-out);
}
.quiz-hint-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
.quiz-hint-leave-active {
  transition: opacity var(--dur-standard) var(--ease-out);
}
.quiz-hint-leave-to {
  opacity: 0;
}

.quiz-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

/* 入退場 */
.quiz-panel-enter-active,
.quiz-panel-leave-active {
  transition: opacity var(--dur-standard) var(--ease-out);
}
.quiz-panel-enter-active :deep(.scroll-panel),
.quiz-panel-leave-active :deep(.scroll-panel) {
  transition:
    transform var(--dur-standard) var(--ease-out),
    opacity var(--dur-standard) var(--ease-out);
}
.quiz-panel-enter-from,
.quiz-panel-leave-to {
  opacity: 0;
}
.quiz-panel-enter-from :deep(.scroll-panel),
.quiz-panel-leave-to :deep(.scroll-panel) {
  transform: scale(0.96);
  opacity: 0;
}
</style>
