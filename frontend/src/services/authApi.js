// 認証まわりの API 呼び出し。
import { api } from './apiClient.js'

/** 新規登録。成功時 201。 */
export function register(username, password) {
  return api('/api/users/register', { method: 'POST', body: { username, password } })
}

/** ログイン。成功時 { userId } を返す。 */
export function login(username, password) {
  return api('/api/users/login', { method: 'POST', body: { username, password } })
}
