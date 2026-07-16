<script setup>
// 画面下部の会話ボックス。store.dialogue の現在ページをタイプライタ表示し、
// クリックまたは Enter/E キーで「全文即時表示 → 次ページへ進む」を行う。
import { ref, computed, watch, onUnmounted } from 'vue'
import { useStageStore } from '@/app/stores/stage.js'
import { useGame } from '@/runtime/Game.js'

const store = useStageStore()

const displayedText = ref('')
const isTyping = ref(false)
let typeTimer = null
let charIndex = 0
let sinceLastSfx = 0

const currentLine = computed(() => {
  const d = store.dialogue
  if (!d) return ''
  return d.lines[d.index] ?? ''
})

function playSfx(name) {
  try {
    useGame().audio.sfx(name)
  } catch {
    // ゲームランタイム未初期化時は無視
  }
}

function stopTyping() {
  if (typeTimer) {
    clearInterval(typeTimer)
    typeTimer = null
  }
}

function startTyping(text) {
  stopTyping()
  displayedText.value = ''
  charIndex = 0
  sinceLastSfx = 0
  if (!text) {
    isTyping.value = false
    return
  }
  isTyping.value = true
  typeTimer = setInterval(() => {
    charIndex += 1
    displayedText.value = text.slice(0, charIndex)
    sinceLastSfx += 1
    if (sinceLastSfx >= 3) {
      sinceLastSfx = 0
      playSfx('talk')
    }
    if (charIndex >= text.length) {
      stopTyping()
      isTyping.value = false
    }
  }, 25)
}

function finishTyping() {
  stopTyping()
  displayedText.value = currentLine.value
  isTyping.value = false
}

function advance() {
  if (isTyping.value) {
    finishTyping()
    return
  }
  playSfx('confirm')
  store.advanceDialogue()
}

function onKeydown(e) {
  if (e.key === 'Enter' || e.code === 'KeyE') {
    e.preventDefault()
    advance()
  }
}

watch(
  () => store.dialogue,
  (dialogue, prev) => {
    if (!dialogue) {
      stopTyping()
      window.removeEventListener('keydown', onKeydown)
      return
    }
    if (!prev) {
      window.addEventListener('keydown', onKeydown)
    }
    startTyping(dialogue.lines[dialogue.index] ?? '')
  },
  { immediate: true },
)

onUnmounted(() => {
  stopTyping()
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Transition name="dialogue-box">
    <div v-if="store.dialogue" class="dialogue-box" @click="advance">
      <div class="dialogue-speaker">{{ store.dialogue.speaker }}</div>
      <p class="dialogue-text">{{ displayedText }}</p>
      <div v-if="!isTyping" class="dialogue-next">▼</div>
    </div>
  </Transition>
</template>

<style scoped>
.dialogue-box {
  position: fixed;
  left: 50%;
  bottom: 28px;
  transform: translate(-50%, 0);
  width: min(760px, 92vw);
  box-sizing: border-box;
  background: linear-gradient(180deg, var(--color-paper) 0%, var(--color-paper-soft) 100%);
  border: 2px solid var(--color-ink-soft);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-panel);
  padding: 28px 32px 22px;
  cursor: pointer;
  pointer-events: auto;
}

.dialogue-speaker {
  position: absolute;
  top: -18px;
  left: 24px;
  background: var(--color-accent-strong);
  color: var(--color-paper);
  font-family: var(--font-game);
  font-size: 14px;
  padding: 4px 14px;
  border-radius: 6px;
  box-shadow: var(--shadow-button);
}

.dialogue-text {
  margin: 6px 0 0;
  font-family: var(--font-game);
  font-size: 18px;
  line-height: 1.7;
  color: var(--color-ink);
  white-space: pre-line;
}

.dialogue-next {
  position: absolute;
  right: 20px;
  bottom: 12px;
  color: var(--color-accent-strong);
  font-size: 16px;
  animation: dialogue-blink 1s var(--ease-in-out) infinite;
}

@keyframes dialogue-blink {
  0%,
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }
  50% {
    opacity: 1;
    transform: translateY(3px);
  }
}

/* 入退場 */
.dialogue-box-enter-active,
.dialogue-box-leave-active {
  transition:
    opacity var(--dur-standard) var(--ease-out),
    transform var(--dur-standard) var(--ease-out);
}
.dialogue-box-enter-from,
.dialogue-box-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}
</style>
