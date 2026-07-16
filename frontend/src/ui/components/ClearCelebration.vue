<script setup>
// クリア演出。全画面だが暗幕なし・入力を奪わない（pointer-events: none）。
// 2.2 秒後に自動で解説パネルへ引き継ぐ（celebrating → explanation）。
import { onMounted, onUnmounted, watch } from 'vue'
import { useStageStore } from '@/app/stores/stage.js'

const store = useStageStore()
let timer = null

function clearTimer() {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

function startTimer() {
  clearTimer()
  timer = setTimeout(() => {
    store.showExplanation()
  }, 2200)
}

onMounted(() => {
  if (store.celebrating) startTimer()
})

watch(
  () => store.celebrating,
  (celebrating) => {
    if (celebrating) startTimer()
    else clearTimer()
  },
)

onUnmounted(clearTimer)
</script>

<template>
  <Transition name="clear-celebration">
    <div v-if="store.celebrating" class="clear-celebration">
      <div class="confetti-field">
        <span v-for="n in 24" :key="n" class="confetti-piece" />
      </div>
      <div class="clear-content">
        <h2 class="clear-title">クリア！</h2>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.clear-celebration {
  position: fixed;
  inset: 0;
  z-index: 60;
  overflow: hidden;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.clear-title {
  margin: 0;
  font-family: var(--font-game);
  font-size: 64px;
  color: var(--color-gold);
  text-shadow:
    0 0 12px rgba(217, 165, 44, 0.6),
    0 4px 0 rgba(30, 20, 10, 0.35);
  animation: clear-bounce 0.6s var(--ease-out);
}

@keyframes clear-bounce {
  0% {
    transform: scale(0.3);
    opacity: 0;
  }
  55% {
    transform: scale(1.15);
    opacity: 1;
  }
  80% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
  }
}



/* 紙吹雪: CSS keyframes のみで落下・回転させる。位置/速度/色は nth-child で分散 */
.confetti-field {
  position: absolute;
  inset: 0;
}

.confetti-piece {
  position: absolute;
  top: -20px;
  width: 10px;
  height: 16px;
  background: var(--color-accent);
  opacity: 0.9;
  animation-name: confetti-fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@keyframes confetti-fall {
  0% {
    transform: translateY(-10vh) rotate(0deg);
    opacity: 0.9;
  }
  100% {
    transform: translateY(110vh) rotate(var(--rot-end, 40deg));
    opacity: 0.6;
  }
}

.confetti-piece:nth-child(4n) {
  background: var(--color-gold);
}
.confetti-piece:nth-child(4n + 1) {
  background: var(--color-leaf);
}
.confetti-piece:nth-child(4n + 2) {
  background: var(--color-paper);
}

.confetti-piece:nth-child(1) {
  left: 2%;
  animation-duration: 1.6s;
  animation-delay: 0.7s;
  --rot-end: 52deg;
}
.confetti-piece:nth-child(2) {
  left: 6.2%;
  animation-duration: 1.8s;
  animation-delay: 1.4s;
  --rot-end: 49deg;
}
.confetti-piece:nth-child(3) {
  left: 10.3%;
  animation-duration: 2s;
  animation-delay: 0.1s;
  --rot-end: 46deg;
}
.confetti-piece:nth-child(4) {
  left: 14.5%;
  animation-duration: 2.2s;
  animation-delay: 0.8s;
  --rot-end: 43deg;
}
.confetti-piece:nth-child(5) {
  left: 18.7%;
  animation-duration: 2.4s;
  animation-delay: 1.5s;
  --rot-end: 40deg;
}
.confetti-piece:nth-child(6) {
  left: 22.9%;
  animation-duration: 2.6s;
  animation-delay: 0.2s;
  --rot-end: 37deg;
}
.confetti-piece:nth-child(7) {
  left: 27%;
  animation-duration: 1.6s;
  animation-delay: 0.9s;
  --rot-end: 34deg;
}
.confetti-piece:nth-child(8) {
  left: 31.2%;
  animation-duration: 1.8s;
  animation-delay: 1.6s;
  --rot-end: 31deg;
}
.confetti-piece:nth-child(9) {
  left: 35.4%;
  animation-duration: 2s;
  animation-delay: 0.3s;
  --rot-end: 28deg;
}
.confetti-piece:nth-child(10) {
  left: 39.6%;
  animation-duration: 2.2s;
  animation-delay: 1s;
  --rot-end: 25deg;
}
.confetti-piece:nth-child(11) {
  left: 43.7%;
  animation-duration: 2.4s;
  animation-delay: 1.7s;
  --rot-end: 22deg;
}
.confetti-piece:nth-child(12) {
  left: 47.9%;
  animation-duration: 2.6s;
  animation-delay: 0.4s;
  --rot-end: 19deg;
}
.confetti-piece:nth-child(13) {
  left: 52.1%;
  animation-duration: 1.6s;
  animation-delay: 1.1s;
  --rot-end: 16deg;
}
.confetti-piece:nth-child(14) {
  left: 56.3%;
  animation-duration: 1.8s;
  animation-delay: 1.8s;
  --rot-end: 53deg;
}
.confetti-piece:nth-child(15) {
  left: 60.4%;
  animation-duration: 2s;
  animation-delay: 0.5s;
  --rot-end: 50deg;
}
.confetti-piece:nth-child(16) {
  left: 64.6%;
  animation-duration: 2.2s;
  animation-delay: 1.2s;
  --rot-end: 47deg;
}
.confetti-piece:nth-child(17) {
  left: 68.8%;
  animation-duration: 2.4s;
  animation-delay: 1.9s;
  --rot-end: 44deg;
}
.confetti-piece:nth-child(18) {
  left: 73%;
  animation-duration: 2.6s;
  animation-delay: 0.6s;
  --rot-end: 41deg;
}
.confetti-piece:nth-child(19) {
  left: 77.1%;
  animation-duration: 1.6s;
  animation-delay: 1.3s;
  --rot-end: 38deg;
}
.confetti-piece:nth-child(20) {
  left: 81.3%;
  animation-duration: 1.8s;
  animation-delay: 0s;
  --rot-end: 35deg;
}
.confetti-piece:nth-child(21) {
  left: 85.5%;
  animation-duration: 2s;
  animation-delay: 0.7s;
  --rot-end: 32deg;
}
.confetti-piece:nth-child(22) {
  left: 89.7%;
  animation-duration: 2.2s;
  animation-delay: 1.4s;
  --rot-end: 29deg;
}
.confetti-piece:nth-child(23) {
  left: 93.8%;
  animation-duration: 2.4s;
  animation-delay: 0.1s;
  --rot-end: 26deg;
}
.confetti-piece:nth-child(24) {
  left: 98%;
  animation-duration: 2.6s;
  animation-delay: 0.8s;
  --rot-end: 23deg;
}

/* 入退場（暗幕なしなのでフェードのみ） */
.clear-celebration-enter-active,
.clear-celebration-leave-active {
  transition: opacity var(--dur-standard) var(--ease-out);
}
.clear-celebration-enter-from,
.clear-celebration-leave-to {
  opacity: 0;
}
</style>
