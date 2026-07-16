<script setup>
// 用語集。ハブワールドの上に和紙の巻物風パネルで表示する（ワールドは切り替えない）。
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { terms } from '@/content/glossary.js'
import { useGame } from '@/runtime/Game.js'
import GameButton from '@/ui/components/GameButton.vue'

const router = useRouter()
const openId = ref(null)

// Esc でも閉じられるように（ゲーム側の Esc はロック中なのでここで担う）
function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

function toggle(id, event) {
  event?.currentTarget?.blur?.()
  openId.value = openId.value === id ? null : id
  try {
    useGame().audio.sfx('hover')
  } catch {
    /* noop */
  }
}
function close() {
  router.push('/')
}
</script>

<template>
  <div class="glossary">
    <div class="scroll-panel">
      <h2>ようごしゅう</h2>
      <p class="lead">旅で出会った ネットワークのことば</p>
      <ul class="term-list">
        <li v-for="t in terms" :key="t.id" :class="{ open: openId === t.id }">
          <button class="term-head" @click="toggle(t.id, $event)">
            <span class="term-name">{{ t.name }}</span>
            <span class="chev">{{ openId === t.id ? '▲' : '▼' }}</span>
          </button>
          <Transition name="desc">
            <p v-if="openId === t.id" class="term-desc">{{ t.description }}</p>
          </Transition>
        </li>
      </ul>
      <div class="footer">
        <GameButton label="もどる" variant="ghost" @press="close" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.glossary {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(28, 42, 56, 0.55);
  pointer-events: auto;
}
.scroll-panel {
  width: min(720px, 92vw);
  max-height: 84vh;
  overflow-y: auto;
  background: linear-gradient(180deg, var(--color-paper), var(--color-paper-soft));
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-panel);
  padding: 28px 34px;
}
h2 {
  color: var(--color-accent-strong);
  font-size: 30px;
  text-align: center;
}
.lead {
  text-align: center;
  color: var(--color-ink-soft);
  margin: 4px 0 18px;
}
.term-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.term-head {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.55);
  border: 2px solid rgba(51, 38, 29, 0.18);
  border-radius: var(--radius-button);
  padding: 10px 16px;
  cursor: pointer;
  transition: background var(--dur-standard) var(--ease-out), transform var(--dur-standard) var(--ease-out);
}
.term-head:hover {
  background: rgba(255, 255, 255, 0.85);
  transform: translateY(-1px);
}
.term-name {
  color: var(--color-ink);
  font-size: 18px;
}
.chev {
  color: var(--color-accent);
  font-size: 13px;
}
.term-desc {
  color: var(--color-ink);
  line-height: 1.7;
  padding: 10px 16px 4px;
}
.footer {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
.desc-enter-active,
.desc-leave-active {
  transition: opacity var(--dur-standard) var(--ease-out);
}
.desc-enter-from,
.desc-leave-to {
  opacity: 0;
}
</style>
