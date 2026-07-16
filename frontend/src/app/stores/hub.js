// ハブ（タイトル/セレクト）と画面全体の演出状態。ゲームランタイム側が書き、UI が読む。
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useHubStore = defineStore('hub', () => {
  /** 'boot' | 'title' | 'transition' | 'select' */
  const phase = ref('boot')
  /** 'story-select' | 'stage-select' */
  const level = ref('story-select')
  /** プレート滞在中の概要パネル { label, summary } | null */
  const plateInfo = ref(null)
  /** 全画面ベール（ワールド切替の暗転）。 */
  const veil = ref(true)
  /** ローディング中フラグ（ベール上のヒント表示用） */
  const loading = ref(false)

  return { phase, level, plateInfo, veil, loading }
})
