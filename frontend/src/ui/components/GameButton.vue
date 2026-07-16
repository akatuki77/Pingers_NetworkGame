<script setup>
// 汎用ボタン。ブラウザ標準の素の button に見せず、和紙パレットのゲーム内 UI として統一する。
import { useGame } from '@/runtime/Game.js'

const props = defineProps({
  label: { type: String, required: true },
  variant: { type: String, default: 'primary' }, // 'primary' | 'ghost' | 'danger'
  size: { type: String, default: 'md' }, // 'md' | 'lg'
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['press'])

function onClick(event) {
  if (props.disabled) return
  // クリック後にフォーカスを残さない。残すと Space/Enter（ジャンプ/決定）が
  // このボタンを再発火して「キー入力が効かない」状態に見える
  event?.currentTarget?.blur?.()
  try {
    useGame().audio.sfx('confirm')
  } catch {
    // ゲームランタイム未生成（初期化前など）は無視
  }
  emit('press')
}
</script>

<template>
  <button
    type="button"
    class="game-button"
    :class="[`variant-${variant}`, `size-${size}`, { 'is-disabled': disabled }]"
    :disabled="disabled"
    @click="onClick"
  >
    {{ label }}
  </button>
</template>

<style scoped>
.game-button {
  pointer-events: auto;
  font-family: var(--font-game);
  border: none;
  border-radius: var(--radius-button);
  cursor: pointer;
  color: var(--color-paper);
  background: var(--color-accent);
  box-shadow: var(--shadow-button);
  transition:
    transform var(--dur-standard) var(--ease-out),
    box-shadow var(--dur-standard) var(--ease-out),
    filter var(--dur-standard) var(--ease-out);
}

.game-button.size-md {
  padding: 0.55em 1.4em;
  font-size: 1rem;
}

.game-button.size-lg {
  padding: 0.75em 2em;
  font-size: 1.2rem;
}

.game-button.variant-primary {
  background: var(--color-accent);
  color: var(--color-paper);
}

.game-button.variant-ghost {
  background: var(--color-paper-soft);
  color: var(--color-ink);
}

.game-button.variant-danger {
  background: var(--color-danger);
  color: var(--color-paper);
}

.game-button:hover:not(.is-disabled) {
  transform: translateY(-2px);
  filter: brightness(1.05);
}

.game-button:active:not(.is-disabled) {
  transform: translateY(1px);
  box-shadow: 0 1px 0 rgba(30, 20, 10, 0.3);
}

.game-button.is-disabled {
  cursor: not-allowed;
  opacity: 0.55;
  box-shadow: none;
}
</style>
