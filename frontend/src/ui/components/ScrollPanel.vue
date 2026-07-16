<script setup>
// 巻物/和紙風の汎用パネル。中身は slot に任せ、自身はアニメーションを持たない
// （呼び出し側の <Transition> の中で使われる前提）。
defineProps({
  title: { type: String, default: '' },
  width: { type: String, default: 'min(640px, 88vw)' },
})
</script>

<template>
  <div class="scroll-panel" :style="{ width }">
    <div class="scroll-panel-band scroll-panel-band-top" />
    <h2 v-if="title" class="scroll-panel-title">{{ title }}</h2>
    <div class="scroll-panel-body">
      <slot />
    </div>
    <div class="scroll-panel-band scroll-panel-band-bottom" />
  </div>
</template>

<style scoped>
.scroll-panel {
  position: relative;
  box-sizing: border-box;
  pointer-events: auto;
  background: linear-gradient(180deg, var(--color-paper) 0%, var(--color-paper-soft) 100%);
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-panel);
  border: 2px solid var(--color-accent-strong);
  padding: 30px 32px 26px;
  color: var(--color-ink);
}

/* 上下の飾り縁（巻物の房を思わせる帯） */
.scroll-panel-band {
  position: absolute;
  left: 14px;
  right: 14px;
  height: 6px;
  background: repeating-linear-gradient(
    90deg,
    var(--color-accent-strong) 0 10px,
    transparent 10px 20px
  );
  opacity: 0.5;
  pointer-events: none;
}
.scroll-panel-band-top {
  top: 8px;
}
.scroll-panel-band-bottom {
  bottom: 8px;
}

.scroll-panel-title {
  margin: 4px 0 14px;
  text-align: center;
  font-family: var(--font-game);
  font-size: 1.3rem;
  letter-spacing: 0.08em;
  color: var(--color-accent-strong);
}

.scroll-panel-body {
  font-family: var(--font-game);
  color: var(--color-ink);
}
</style>
