<script setup>
// ステージ中のオーバーレイ。状態はすべて stage ストア経由（ワールドが書き、ここは読む）。
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getStageByRouteName } from '@/content/stages.js'
import { useStageStore } from '@/app/stores/stage.js'
import { useSettingsStore } from '@/app/stores/settings.js'
import GameButton from '@/ui/components/GameButton.vue'
import PromptToast from '@/ui/components/PromptToast.vue'
import DialogueBox from '@/ui/components/DialogueBox.vue'
import QuizPanelText from '@/ui/components/QuizPanelText.vue'
import QuizPanelChoice from '@/ui/components/QuizPanelChoice.vue'
import LearningPanel from '@/ui/components/LearningPanel.vue'
import ExplanationPanel from '@/ui/components/ExplanationPanel.vue'
import ClearCelebration from '@/ui/components/ClearCelebration.vue'

const route = useRoute()
const stage = computed(() => getStageByRouteName(route.name))
const store = useStageStore()
const settings = useSettingsStore()

const hudVisible = computed(() => !store.uiOpen)

function openQuiz() {
  store.wrongHint = null
  store.quizOpen = true
}
function onExplanationClose(target) {
  store.closeExplanation(target) // 内部で finishStage まで面倒を見る
}
</script>

<template>
  <div class="stage-overlay">
    <!-- 左上: ステージ名 -->
    <div class="stage-chip" v-if="stage">
      <span class="stage-no">{{ route.name.replace('Stage-', '') }}</span>
      <span class="stage-title">{{ stage.title }}</span>
    </div>

    <!-- 右上: もくてき（常設）+ 依頼書ボタン（その右下） -->
    <Transition name="hud">
      <div v-if="hudVisible" class="objective-dock">
        <div class="objective-card">
          <p class="objective-heading">もくてき</p>
          <p class="objective-body">{{ store.objective }}</p>
        </div>
        <div v-if="store.quiz?.type === 'textInput' && store.quizButton" class="objective-action">
          <GameButton label="配達依頼書" variant="primary" @press="openQuiz" />
        </div>
      </div>
    </Transition>

    <!-- 収集進捗（きびだんご等） -->
    <Transition name="hud">
      <div v-if="store.collect" class="collect-chip">
        {{ store.collect.label }}　{{ store.collect.got }} / {{ store.collect.total }}
      </div>
    </Transition>

    <!-- 下部: 操作ヒント（操作モードの表記に追従） -->
    <div class="corner-hint" v-if="hudVisible">
      {{ settings.moveKeys() }}: あるく ／ {{ settings.interactKey() }}: はなす・しらべる ／
      Shift: はしる ／ Space: ジャンプ ／ Esc: ハブへもどる
    </div>

    <PromptToast />
    <DialogueBox />
    <QuizPanelText />
    <QuizPanelChoice />
    <LearningPanel />
    <ClearCelebration />
    <ExplanationPanel @close="onExplanationClose" />
  </div>
</template>

<style scoped>
.stage-overlay {
  position: absolute;
  inset: 0;
}
.stage-chip {
  position: absolute;
  top: 18px;
  left: 20px;
  display: flex;
  align-items: baseline;
  gap: 10px;
  background: linear-gradient(180deg, var(--color-paper), var(--color-paper-soft));
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-panel);
  padding: 8px 18px;
}
.stage-no {
  color: var(--color-accent-strong);
  font-size: 22px;
}
.stage-title {
  color: var(--color-ink);
  font-size: 18px;
}
.objective-dock {
  position: absolute;
  top: 18px;
  right: 20px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  pointer-events: auto;
}
.objective-card {
  width: min(340px, 34vw);
  background: linear-gradient(180deg, rgba(248, 239, 221, 0.94), rgba(239, 226, 200, 0.94));
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-panel);
  padding: 10px 14px 12px;
}
.objective-heading {
  color: var(--color-accent-strong);
  font-size: 14px;
  margin-bottom: 4px;
}
.objective-body {
  color: var(--color-ink);
  font-size: 12.5px;
  line-height: 1.6;
  white-space: pre-line;
}
.collect-chip {
  position: absolute;
  top: 74px;
  left: 20px;
  background: linear-gradient(180deg, var(--color-paper), var(--color-paper-soft));
  border-radius: var(--radius-panel);
  box-shadow: var(--shadow-panel);
  padding: 8px 18px;
  color: var(--color-ink);
  font-size: 16px;
}
.corner-hint {
  position: absolute;
  left: 18px;
  bottom: 14px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 1px 4px rgba(20, 16, 28, 0.7);
}
.hud-enter-active,
.hud-leave-active {
  transition: opacity var(--dur-standard) var(--ease-out);
}
.hud-enter-from,
.hud-leave-to {
  opacity: 0;
}
</style>
