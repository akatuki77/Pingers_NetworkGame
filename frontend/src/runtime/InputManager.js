// 入力の一元管理。アクション（move/dash/jump/interact/confirm/back）へのマッピングを
// ここだけが持ち、「演出中は入力ロック」を仕組みとして提供する（各画面が個別に if 文を書かない）。
const KEYMAP = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  dash: ['ShiftLeft', 'ShiftRight'],
  jump: ['Space'],
  interact: ['KeyE', 'Enter'],
  confirm: ['Enter', 'Space'],
  back: ['Escape'],
}

const CODE_TO_ACTIONS = {}
for (const [action, codes] of Object.entries(KEYMAP)) {
  for (const code of codes) (CODE_TO_ACTIONS[code] ??= []).push(action)
}

export class InputManager {
  constructor(target = window) {
    this.target = target
    this._down = new Set() // 押下中のアクション
    this._locks = new Set() // ロックトークン（空なら入力有効）
    this._listeners = new Map() // action -> Set<cb>（押した瞬間のエッジイベント）

    this._onKeyDown = (e) => {
      // テキスト入力中はゲーム入力を奪わない
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const actions = CODE_TO_ACTIONS[e.code]
      if (!actions) return
      if (e.code === 'Space') e.preventDefault() // ページスクロール防止
      for (const action of actions) {
        const first = !this._down.has(action)
        this._down.add(action)
        if (first && !this.locked) this._emit(action)
      }
    }
    this._onKeyUp = (e) => {
      const actions = CODE_TO_ACTIONS[e.code]
      if (!actions) return
      for (const action of actions) this._down.delete(action)
    }
    this._onBlur = () => this._down.clear()

    target.addEventListener('keydown', this._onKeyDown)
    target.addEventListener('keyup', this._onKeyUp)
    window.addEventListener('blur', this._onBlur)
  }

  get locked() {
    return this._locks.size > 0
  }

  /** 演出中などに入力を止める。トークン単位で重ねられる。 */
  lock(token) {
    this._locks.add(token)
  }

  unlock(token) {
    this._locks.delete(token)
  }

  /** すべてのロックを解除する（ワールド切替時の取り残し対策）。 */
  clearLocks() {
    this._locks.clear()
  }

  /** 押下中か（ロック中は常に false）。 */
  isDown(action) {
    return !this.locked && this._down.has(action)
  }

  /** 移動軸を正規化して返す（斜め移動が速くならない）。 */
  axis() {
    if (this.locked) return { x: 0, z: 0 }
    let x = (this._down.has('right') ? 1 : 0) - (this._down.has('left') ? 1 : 0)
    let z = (this._down.has('down') ? 1 : 0) - (this._down.has('up') ? 1 : 0)
    const len = Math.hypot(x, z)
    if (len > 1) {
      x /= len
      z /= len
    }
    return { x, z }
  }

  /** アクションの押した瞬間を購読する。解除関数を返す。 */
  on(action, cb) {
    if (!this._listeners.has(action)) this._listeners.set(action, new Set())
    this._listeners.get(action).add(cb)
    return () => this._listeners.get(action)?.delete(cb)
  }

  _emit(action) {
    this._listeners.get(action)?.forEach((cb) => cb())
  }

  dispose() {
    this.target.removeEventListener('keydown', this._onKeyDown)
    this.target.removeEventListener('keyup', this._onKeyUp)
    window.removeEventListener('blur', this._onBlur)
  }
}
