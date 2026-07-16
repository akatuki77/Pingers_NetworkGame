// API 共通クライアント。fetch を薄くラップし、JSON の送受信とエラーハンドリングを一元化する。
const BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000'

/**
 * @param {string} path 先頭 '/' 付きのパス（例: '/api/users/login'）
 * @param {{ method?: string, body?: object }} [options]
 * @returns {Promise<any>} レスポンス JSON（204/空レスポンス時は null）
 */
export async function api(path, { method = 'GET', body } = {}) {
  /** @type {RequestInit} */
  const init = { method }
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' }
    init.body = JSON.stringify(body)
  }
  const res = await fetch(`${BASE}${path}`, init)

  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    const error = new Error(data?.message ?? res.statusText)
    error.status = res.status
    throw error
  }

  return data
}
