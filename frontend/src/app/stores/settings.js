// プレイヤー設定。操作モードは「表記だけ」の切り替えで、実際のキー割り当ては
// 両モードとも常に有効（InputManager が WASD/矢印・E/Enter を両方受け付ける）。
//
// 表記の根拠（一般的な PC ゲームの慣習）:
// - WASD モード: 右手マウス前提の FPS/アクション系（Minecraft・原神など）。
//   しらべる/はなす = E、ジャンプ = Space、ダッシュ = Shift、もどる = Esc
// - 矢印キーモード: 右手が矢印に乗る JRPG/2D 系（RPG ツクール・ポケモンなど）。
//   けってい/はなす = Enter、ジャンプ = Space、ダッシュ = Shift、もどる = Esc
import { defineStore } from 'pinia'
import { ref } from 'vue'

const STORAGE_KEY = 'input_mode'

export const useSettingsStore = defineStore('settings', () => {
  /** 'wasd' | 'arrows' — 画面表記のみに影響する */
  const inputMode = ref(localStorage.getItem(STORAGE_KEY) === 'arrows' ? 'arrows' : 'wasd')

  function toggleInputMode() {
    inputMode.value = inputMode.value === 'wasd' ? 'arrows' : 'wasd'
    localStorage.setItem(STORAGE_KEY, inputMode.value)
  }

  /** しらべる・はなす・けってい に表示するキー名 */
  function interactKey() {
    return inputMode.value === 'wasd' ? 'E' : 'Enter'
  }

  /** 移動キーの表記 */
  function moveKeys() {
    return inputMode.value === 'wasd' ? 'WASD' : '矢印キー'
  }

  return { inputMode, toggleInputMode, interactKey, moveKeys }
})
