<script setup>
// 学習パネル（経路表など構造化コンテンツ）。blocks: paragraph / table の 2 種から始める
// （docs/content-and-ux-redesign-plan.md C-2 のブロック形式。v-html は使わない）。
import { watch, onUnmounted } from 'vue'
import { useStageStore } from '@/app/stores/stage.js'
import ScrollPanel from './ScrollPanel.vue'
import GameButton from './GameButton.vue'

const store = useStageStore()

function close() {
  const panel = store.learningPanel
  store.learningPanel = null
  panel?.onClose?.()
}

function onKeydown(e) {
  if (e.key === 'Escape' || e.key === 'Enter' || e.code === 'KeyE') {
    e.preventDefault()
    close()
  }
}
watch(
  () => store.learningPanel,
  (p) => {
    if (p) window.addEventListener('keydown', onKeydown)
    else window.removeEventListener('keydown', onKeydown)
  },
)
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="learning">
    <div v-if="store.learningPanel" class="learning-overlay">
      <ScrollPanel :title="store.learningPanel.title" width="min(640px, 92vw)">
        <div class="blocks">
          <template v-for="(block, i) in store.learningPanel.blocks" :key="i">
            <p v-if="block.type === 'paragraph'" class="para">{{ block.text }}</p>
            <div v-else-if="block.type === 'table'" class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th v-for="(h, j) in block.headers" :key="j">{{ h }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, j) in block.rows" :key="j">
                    <td v-for="(cell, k) in row" :key="k">{{ cell }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>
        <div class="actions">
          <GameButton label="わかった！" variant="primary" @press="close" />
        </div>
        <p class="key-hint">Enter: わかった！</p>
      </ScrollPanel>
    </div>
  </Transition>
</template>

<style scoped>
.learning-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(20, 16, 28, 0.45);
  pointer-events: auto;
}
.blocks {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 56vh;
  overflow-y: auto;
}
.para {
  color: var(--color-ink);
  font-size: 16px;
  line-height: 1.75;
  white-space: pre-line;
}
.table-wrap {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  background: rgba(255, 255, 255, 0.65);
  border-radius: 8px;
  overflow: hidden;
}
th,
td {
  border: 2px solid rgba(51, 38, 29, 0.25);
  padding: 10px 12px;
  font-size: 15px;
  color: var(--color-ink);
  text-align: left;
}
th {
  background: var(--color-accent);
  color: #fff;
  font-weight: normal;
}
.actions {
  display: flex;
  justify-content: center;
  margin-top: 18px;
}
.key-hint {
  margin-top: 8px;
  text-align: center;
  font-size: 12px;
  color: var(--color-ink-soft);
}
.learning-enter-active,
.learning-leave-active {
  transition: opacity var(--dur-standard) var(--ease-out);
}
.learning-enter-from,
.learning-leave-to {
  opacity: 0;
}
</style>
