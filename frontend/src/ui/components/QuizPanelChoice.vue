<script setup>
// 選択式クイズ（C-12: 番号入力ではなくボタン選択）。store.choiceQuiz が非 null の間表示。
import { ref, watch, onUnmounted } from 'vue'
import { useStageStore } from '@/app/stores/stage.js'
import ScrollPanel from './ScrollPanel.vue'
import { useGame } from '@/runtime/Game.js'

const store = useStageStore()
const shaking = ref(-1) // シェイク中の選択肢 index

function choose(i, event) {
  event?.currentTarget?.blur?.() // フォーカス残留で Space/Enter が誤爆しないように
  try {
    useGame().audio.sfx('confirm')
  } catch {
    /* noop */
  }
  const ok = store.submitChoiceAnswer(i)
  if (!ok) {
    shaking.value = -1
    requestAnimationFrame(() => (shaking.value = i))
  }
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    // 選択式は途中でやめられる（クリア条件に影響しない）
    store.choiceQuiz = null
    store.wrongHint = null
    return
  }
  // 数字キーでも選択できる
  const n = Number(e.key)
  if (Number.isInteger(n) && n >= 1 && n <= (store.choiceQuiz?.options.length ?? 0)) {
    e.preventDefault()
    choose(n - 1)
  }
}

watch(
  () => store.choiceQuiz,
  (q) => {
    if (q) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
)
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="choice-quiz">
    <div v-if="store.choiceQuiz" class="choice-overlay">
      <ScrollPanel :title="store.choiceQuiz.title ?? 'もんだい'" width="min(680px, 92vw)">
        <p v-if="store.choiceQuiz.speaker" class="speaker">{{ store.choiceQuiz.speaker }}</p>
        <p class="question">{{ store.choiceQuiz.question }}</p>
        <div class="options">
          <button
            v-for="(opt, i) in store.choiceQuiz.options"
            :key="i"
            class="option"
            :class="{ shake: shaking === i }"
            @click="choose(i, $event)"
          >
            <span class="opt-badge">{{ i + 1 }}</span>
            <span class="opt-text">{{ opt.replace(/^\d+\./, '') }}</span>
          </button>
        </div>
        <Transition name="hint">
          <p v-if="store.wrongHint" class="wrong-hint">{{ store.wrongHint }}</p>
        </Transition>
        <p class="key-hint">1〜{{ store.choiceQuiz.options.length }} のすうじキーでも えらべる ／ Esc: やめる</p>
      </ScrollPanel>
    </div>
  </Transition>
</template>

<style scoped>
.choice-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20, 16, 28, 0.45);
  pointer-events: auto;
}
.speaker {
  color: var(--color-ink-soft);
  font-size: 14px;
  margin-bottom: 6px;
}
.question {
  color: var(--color-ink);
  font-size: 17px;
  line-height: 1.7;
  white-space: pre-line;
  margin-bottom: 16px;
}
.options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.option {
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  background: rgba(255, 255, 255, 0.6);
  border: 2px solid rgba(51, 38, 29, 0.22);
  border-radius: var(--radius-button);
  padding: 12px 16px;
  cursor: pointer;
  font-family: var(--font-game);
  font-size: 16px;
  color: var(--color-ink);
  line-height: 1.5;
  transition:
    background var(--dur-standard) var(--ease-out),
    transform var(--dur-standard) var(--ease-out),
    border-color var(--dur-standard) var(--ease-out);
}
.option:hover {
  background: #fff;
  border-color: var(--color-accent);
  transform: translateY(-2px);
}
.option:active {
  transform: translateY(0);
}
.opt-badge {
  flex: none;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent);
  color: #fff;
  border-radius: 50%;
  font-size: 15px;
}
.option.shake {
  animation: opt-shake 0.32s var(--ease-out);
  border-color: var(--color-danger);
}
@keyframes opt-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-7px); }
  50% { transform: translateX(6px); }
  75% { transform: translateX(-4px); }
}
.wrong-hint {
  margin-top: 14px;
  color: var(--color-danger);
  font-size: 15px;
  line-height: 1.6;
}
.key-hint {
  margin-top: 12px;
  text-align: center;
  font-size: 12px;
  color: var(--color-ink-soft);
}
.hint-enter-active {
  transition: opacity var(--dur-standard) var(--ease-out), transform var(--dur-standard) var(--ease-out);
}
.hint-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.choice-quiz-enter-active,
.choice-quiz-leave-active {
  transition: opacity var(--dur-standard) var(--ease-out);
}
.choice-quiz-enter-from,
.choice-quiz-leave-to {
  opacity: 0;
}
</style>
