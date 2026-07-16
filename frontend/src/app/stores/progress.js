// ステージのクリア進捗管理。ローカル状態を正としつつ、可能ならサーバーへも保存する。
import { ref } from 'vue'
import { defineStore } from 'pinia'
import * as recordsApi from '@/services/recordsApi.js'

const STORAGE_KEY = 'last_stage_id'
const CLEARED_KEY = 'cleared_stage_ids' // 未ログイン時もセッション内では〇表示を保つ（DB 保存はしない）

function restoreLastStageId() {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  const n = Number(raw)
  return raw !== null && !Number.isNaN(n) ? n : null
}

function restoreClearedIds() {
  try {
    const arr = JSON.parse(sessionStorage.getItem(CLEARED_KEY) ?? '[]')
    return Array.isArray(arr) ? arr.filter((n) => Number.isInteger(n)) : []
  } catch {
    return []
  }
}

export const useProgressStore = defineStore('progress', () => {
  const clearedStageIds = ref(restoreClearedIds())
  const lastClearedStageId = ref(restoreLastStageId())

  function isCleared(stageId) {
    return clearedStageIds.value.includes(stageId)
  }

  /** サーバーのクリア記録を取得してローカルへ反映する。失敗しても静かに諦める。 */
  async function fetchRecords(userId) {
    try {
      const records = await recordsApi.getRecords(userId)
      const server = (records ?? []).map((r) => r.stage_id)
      // セッション内のローカルクリアとマージ（サーバー未保存分を消さない）
      clearedStageIds.value = [...new Set([...server, ...clearedStageIds.value])]
      sessionStorage.setItem(CLEARED_KEY, JSON.stringify(clearedStageIds.value))
    } catch (err) {
      console.warn('クリア記録の取得に失敗しました', err)
    }
  }

  /** クリアを記録する。ローカル反映は必ず行い、ログイン中はサーバー保存も試みる。 */
  async function recordClear(stageId, userId = null) {
    if (!isCleared(stageId)) clearedStageIds.value.push(stageId)
    lastClearedStageId.value = stageId
    sessionStorage.setItem(STORAGE_KEY, String(stageId))
    sessionStorage.setItem(CLEARED_KEY, JSON.stringify(clearedStageIds.value))

    if (userId) {
      try {
        await recordsApi.saveRecord(userId, stageId)
      } catch (err) {
        console.warn('クリア記録の保存に失敗しました', err)
      }
    }
  }

  function reset() {
    clearedStageIds.value = []
    lastClearedStageId.value = null
    sessionStorage.removeItem(STORAGE_KEY)
    sessionStorage.removeItem(CLEARED_KEY)
  }

  return { clearedStageIds, lastClearedStageId, isCleared, fetchRecords, recordClear, reset }
})
