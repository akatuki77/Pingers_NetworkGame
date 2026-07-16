<script setup>
// 冒険の書 — 章構成・小章の概要の閲覧と、全ステージへの直接遷移（非回帰仕様）。
import { watch, onUnmounted } from 'vue'
import { storyContent } from '@/content/stories.js'
import { getStageByRouteName } from '@/content/stages.js'
import { useProgressStore } from '@/app/stores/progress.js'
import { useGame } from '@/runtime/Game.js'
import ScrollPanel from './ScrollPanel.vue'
import GameButton from './GameButton.vue'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['close'])
const progress = useProgressStore()
const story = storyContent['1']

function isCleared(sub) {
  const stage = getStageByRouteName(sub.routeName)
  return stage && progress.isCleared(stage.id)
}

function goTo(sub) {
  emit('close')
  try {
    useGame().world?.navigateTo?.(sub.routeName)
  } catch {
    /* noop */
  }
}

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.preventDefault()
    e.stopPropagation() // ハブの Esc（レベル戻り）を発火させない
    emit('close')
  }
}
watch(
  () => props.open,
  (open) => {
    if (open) window.addEventListener('keydown', onKeydown, true)
    else window.removeEventListener('keydown', onKeydown, true)
  },
)
onUnmounted(() => window.removeEventListener('keydown', onKeydown, true))
</script>

<template>
  <Transition name="book">
    <div v-if="open" class="book-overlay" @click.self="emit('close')">
      <ScrollPanel :title="story.title" width="min(760px, 94vw)">
        <p class="lead">{{ story.summary }}</p>
        <div class="chapters">
          <section v-for="ch in story.chapter" :key="ch.number" class="chapter">
            <h3>
              <span class="ch-number">{{ ch.number }}</span>
              <span class="ch-name">{{ ch.name }}</span>
            </h3>
            <div v-for="sub in ch.subChapters" :key="sub.id" class="sub">
              <div class="sub-head">
                <span class="sub-id">{{ sub.id }}</span>
                <span class="sub-title">{{ sub.title }}</span>
                <span v-if="isCleared(sub)" class="cleared-mark">〇</span>
                <span class="spacer"></span>
                <GameButton label="あそぶ" variant="ghost" @press="goTo(sub)" />
              </div>
              <p class="sub-summary">{{ sub.summary }}</p>
            </div>
          </section>
        </div>
        <div class="footer">
          <GameButton label="とじる" variant="primary" @press="emit('close')" />
        </div>
      </ScrollPanel>
    </div>
  </Transition>
</template>

<style scoped>
.book-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20, 16, 28, 0.5);
  pointer-events: auto;
}
.lead {
  color: var(--color-ink-soft);
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-line;
  margin-bottom: 14px;
}
.chapters {
  max-height: 52vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-right: 8px;
}
.chapters::-webkit-scrollbar {
  width: 10px;
}
.chapters::-webkit-scrollbar-track {
  background: var(--color-paper-soft);
  border-radius: 6px;
}
.chapters::-webkit-scrollbar-thumb {
  background: var(--color-accent);
  border-radius: 6px;
}
.chapter h3 {
  display: flex;
  align-items: baseline;
  gap: 10px;
  border-bottom: 2px solid rgba(51, 38, 29, 0.2);
  padding-bottom: 4px;
  margin-bottom: 8px;
}
.ch-number {
  color: var(--color-accent-strong);
  font-size: 18px;
}
.ch-name {
  color: var(--color-ink);
  font-size: 16px;
}
.sub {
  padding: 8px 6px 10px;
}
.sub-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.sub-id {
  color: var(--color-accent-strong);
  font-size: 17px;
}
.sub-title {
  color: var(--color-ink);
  font-size: 16px;
}
.cleared-mark {
  color: #e0563a;
  font-size: 20px;
  font-weight: bold;
}
.spacer {
  flex: 1;
}
.sub-summary {
  color: var(--color-ink-soft);
  font-size: 13.5px;
  line-height: 1.65;
  white-space: pre-line;
  margin-top: 4px;
}
.footer {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
.book-enter-active,
.book-leave-active {
  transition: opacity var(--dur-standard) var(--ease-out);
}
.book-enter-from,
.book-leave-to {
  opacity: 0;
}
</style>
