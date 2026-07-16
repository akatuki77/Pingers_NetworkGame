// キャラクターコントローラ（1 実装のみ — docs/rebuild-policy.md §4.1）。
// 加速度ベースの移動 + ダッシュ + ジャンプ。アニメ(idle/walk)のクロスフェードと
// 足音・ジャンプ・着地の SE、着地スカッシュの juice までここが責任を持つ。
import * as THREE from 'three'
import { gsap } from '@/runtime/tween.js'
import { CHARACTER } from '@/content/tuning.js'

export class Character {
  /**
   * @param {THREE.Object3D} model instantiate() 済みのモデル（足元原点）
   * @param {THREE.AnimationClip[]} clips idle / walk を含むクリップ群
   * @param {import('@/runtime/Game.js').Game} game
   * @param {{ bounds?: number, groundY?: (x:number,z:number)=>number|null }} [opts]
   *   groundY: 接地高さを返す関数。null を返すと「地面なし（進入不可）」
   */
  constructor(model, clips, game, opts = {}) {
    this.model = model
    this.game = game
    this.bounds = opts.bounds ?? Infinity
    this.groundY = opts.groundY ?? (() => 0)
    /** この高さより低い地面（=水面下）へは進入できない */
    this.waterLevel = opts.waterLevel ?? -Infinity

    this.velocity = new THREE.Vector3()
    this.grounded = true
    this.moving = false
    this.dashing = false
    this._footTimer = 0
    this._targetAngle = model.rotation.y
    this._angleQuick = gsap.quickTo(model.rotation, 'y', {
      duration: CHARACTER.turnSmooth,
      ease: 'power2.out',
    })

    this.mixer = new THREE.AnimationMixer(model)
    this.actions = {
      idle: this._clip(clips, 'idle'),
      walk: this._clip(clips, 'walk'),
    }
    this.actions.idle?.play()
    this._current = 'idle'
  }

  _clip(clips, name) {
    const clip = THREE.AnimationClip.findByName(clips, name)
    return clip ? this.mixer.clipAction(clip) : null
  }

  /** アニメーションのクロスフェード切替。 */
  _setAnim(name) {
    if (this._current === name) return
    const from = this.actions[this._current]
    const to = this.actions[name]
    if (to) {
      to.reset().fadeIn(0.18).play()
      from?.fadeOut(0.18)
    }
    this._current = name
  }

  /** カットシーン用: アニメーションを直接切り替える（物理更新なしで使う）。 */
  playAnim(name) {
    this._setAnim(name)
    if (name === 'walk' && this.actions.walk) this.actions.walk.timeScale = CHARACTER.walkAnimBase
  }

  /** その場にワープさせ、速度をリセットする（スポーン用）。 */
  teleport(x, z, angle = 0) {
    this.model.position.set(x, this.groundY(x, z) ?? 0, z)
    this.velocity.set(0, 0, 0)
    this.model.rotation.y = angle
    this._targetAngle = angle
    // 注意: killTweensOf で quickTo 内部トゥイーンを殺すと以後の向き替えが
    // 一切効かなくなる（全ステージで前しか向かないバグの原因）。作り直して差し替える。
    this._angleQuick = gsap.quickTo(this.model.rotation, 'y', {
      duration: CHARACTER.turnSmooth,
      ease: 'power2.out',
    })
  }

  /**
   * 毎フレーム更新。入力ロック中は input.axis() が {0,0} を返すので自然に停止する。
   * @param {number} dt
   */
  update(dt) {
    const input = this.game.input
    const audio = this.game.audio
    const pos = this.model.position

    // ── 水平移動（加速度ベース） ──
    const axis = input.axis()
    const wantDash = input.isDown('dash')
    const hasInput = axis.x !== 0 || axis.z !== 0
    const maxSpeed = wantDash ? CHARACTER.dashSpeed : CHARACTER.walkSpeed

    // ダッシュ開始の瞬間に SE
    const dashingNow = hasInput && wantDash
    if (dashingNow && !this.dashing) audio.sfx('dash')
    this.dashing = dashingNow

    const target = new THREE.Vector3(axis.x * maxSpeed, 0, axis.z * maxSpeed)
    const rate = hasInput ? CHARACTER.accel : CHARACTER.decel
    const delta = new THREE.Vector3(target.x - this.velocity.x, 0, target.z - this.velocity.z)
    const maxDelta = rate * dt
    if (delta.length() > maxDelta) delta.setLength(maxDelta)
    this.velocity.x += delta.x
    this.velocity.z += delta.z

    // ── ジャンプ / 重力 ──
    if (this.grounded && input.isDown('jump')) {
      this.velocity.y = CHARACTER.jumpSpeed
      this.grounded = false
      audio.sfx('jump')
      // 踏み切りのストレッチ
      gsap.fromTo(
        this.model.scale,
        { x: 1.12, y: 0.9, z: 1.12 },
        { x: 1, y: 1, z: 1, duration: 0.3, ease: 'power2.out' },
      )
    }
    if (!this.grounded) this.velocity.y -= CHARACTER.gravity * dt

    // ── 位置更新と境界 ──
    const nextX = pos.x + this.velocity.x * dt
    const nextZ = pos.z + this.velocity.z * dt
    // 進入判定: 崖（地面なし）・登れない高さの壁・水面下 は進めない
    const blocked = (gy) => {
      if (gy === null) return true
      if (gy < this.waterLevel) return true // 水の中へは入れない
      if (this.grounded && gy - pos.y > CHARACTER.stepUp) return true // 壁（木・屋根など）
      if (this.grounded && pos.y - gy > CHARACTER.dropMax) return true // 高すぎる崖
      return false
    }
    if (blocked(this.groundY(nextX, nextZ))) {
      // 軸ごとに滑らせる
      if (!blocked(this.groundY(nextX, pos.z))) {
        pos.x = nextX
        this.velocity.z = 0
      } else if (!blocked(this.groundY(pos.x, nextZ))) {
        pos.z = nextZ
        this.velocity.x = 0
      } else {
        this.velocity.x = 0
        this.velocity.z = 0
      }
    } else {
      pos.x = nextX
      pos.z = nextZ
    }
    pos.x = THREE.MathUtils.clamp(pos.x, -this.bounds, this.bounds)
    pos.z = THREE.MathUtils.clamp(pos.z, -this.bounds, this.bounds)

    pos.y += this.velocity.y * dt
    const gy = this.groundY(pos.x, pos.z)
    if (this.grounded && gy !== null) {
      const drop = pos.y - gy
      if (drop > 0.02) {
        if (drop <= CHARACTER.stepDown) {
          pos.y = gy // 下り段差・坂は地面に吸着（高度が保存されて宙を歩くのを防ぐ）
        } else {
          this.grounded = false // 大きな段差は落下に切り替え
        }
      } else if (drop < 0) {
        pos.y = gy // 小さな上り段差は乗り上げる
      }
    }
    const floor = gy ?? -Infinity
    if (!this.grounded && pos.y <= floor && this.velocity.y <= 0) {
      pos.y = floor
      this.velocity.y = 0
      this.grounded = true
      audio.sfx('land')
      // 着地スカッシュ
      gsap.fromTo(
        this.model.scale,
        { x: 1.15, y: 0.85, z: 1.15 },
        { x: 1, y: 1, z: 1, duration: 0.28, ease: 'back.out(2.5)' },
      )
    }

    // ── 向き ──
    const speed = Math.hypot(this.velocity.x, this.velocity.z)
    if (hasInput && speed > 0.4) {
      let angle = Math.atan2(this.velocity.x, this.velocity.z)
      // 最短回転になるよう現在角の ±π 内へ寄せる
      const cur = this.model.rotation.y
      while (angle - cur > Math.PI) angle -= Math.PI * 2
      while (angle - cur < -Math.PI) angle += Math.PI * 2
      this._angleQuick(angle)
    }

    // ── アニメと足音 ──
    this.moving = speed > 0.6
    this._setAnim(this.moving ? 'walk' : 'idle')
    if (this.actions.walk) {
      this.actions.walk.timeScale = CHARACTER.walkAnimBase * (speed / CHARACTER.walkSpeed)
    }
    if (this.moving && this.grounded) {
      this._footTimer -= dt * (speed / CHARACTER.walkSpeed)
      if (this._footTimer <= 0) {
        audio.sfx('footstep')
        this._footTimer = CHARACTER.footstepInterval
      }
    } else {
      this._footTimer = 0.05
    }

    this.mixer.update(dt)
  }
}
