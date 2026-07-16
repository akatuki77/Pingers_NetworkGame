// クリア記録まわりの API 呼び出し。
import { api } from './apiClient.js'

/** クリア記録を保存する。成功時 201。 */
export function saveRecord(userId, stageId) {
  return api('/api/records', { method: 'POST', body: { user_id: userId, stage_id: stageId } })
}

/** ユーザーのクリア記録配列を取得する（各要素に stage_id を含む）。 */
export function getRecords(userId) {
  return api(`/api/records/${userId}`)
}
