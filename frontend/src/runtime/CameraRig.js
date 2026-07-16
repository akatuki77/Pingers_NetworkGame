// カメラは演出装置。定点ショット・遷移・追従をリグとして一元化し、
// すべての動きをトゥイーン経由にする（少しずつ動き続ける／突然切り替わるカメラの禁止）。
import * as THREE from 'three'
import { gsap } from './tween.js'

export class CameraRig {
  /** @param {THREE.PerspectiveCamera} camera */
  constructor(camera) {
    this.camera = camera
    this.lookTarget = new THREE.Vector3(0, 0, 0)
    this._follow = null // { object, offset, lookOffset }
    this._followQuick = null
    this._transitioning = false
  }

  /** ショット定義 { position:[x,y,z], look:[x,y,z], fov? } を即時適用する（初期配置用）。 */
  applyShot(shot) {
    this.camera.position.set(...shot.position)
    this.lookTarget.set(...shot.look)
    if (shot.fov) {
      this.camera.fov = shot.fov
      this.camera.updateProjectionMatrix()
    }
    this.camera.lookAt(this.lookTarget)
  }

  /**
   * ショットへイージング付きで遷移する。追従は解除される。
   * @returns {Promise<void>}
   */
  transitionTo(shot, { duration = 1.8, ease = 'power2.inOut' } = {}) {
    this.stopFollow()
    this._transitioning = true
    const cam = this.camera
    const tl = gsap.timeline()
    tl.to(cam.position, { x: shot.position[0], y: shot.position[1], z: shot.position[2], duration, ease }, 0)
    tl.to(this.lookTarget, { x: shot.look[0], y: shot.look[1], z: shot.look[2], duration, ease }, 0)
    if (shot.fov && shot.fov !== cam.fov) {
      tl.to(cam, { fov: shot.fov, duration, ease, onUpdate: () => cam.updateProjectionMatrix() }, 0)
    }
    return new Promise((resolve) => {
      tl.eventCallback('onComplete', () => {
        this._transitioning = false
        resolve()
      })
    })
  }

  /**
   * 対象の追従を開始する。スムージングは GSAP quickTo（イージング保証）。
   * @param {THREE.Object3D} object
   */
  startFollow(object, { offset = [0, 8, 11], lookOffset = [0, 1.2, 0], smooth = 0.55 } = {}) {
    this._follow = { object, offset, lookOffset }
    const cam = this.camera
    const cfg = { duration: smooth, ease: 'power2.out' }
    this._followQuick = {
      px: gsap.quickTo(cam.position, 'x', cfg),
      py: gsap.quickTo(cam.position, 'y', cfg),
      pz: gsap.quickTo(cam.position, 'z', cfg),
      lx: gsap.quickTo(this.lookTarget, 'x', cfg),
      ly: gsap.quickTo(this.lookTarget, 'y', cfg),
      lz: gsap.quickTo(this.lookTarget, 'z', cfg),
    }
  }

  stopFollow() {
    this._follow = null
    this._followQuick = null
    this._parallax = null
  }

  /**
   * 固定ショットを基準に、対象の移動へわずかに平行移動で追従する（セレクト画面用）。
   * @param {THREE.Object3D} object
   */
  startParallax(object, shot, factor = 0.14) {
    this.stopFollow()
    const cam = this.camera
    const cfg = { duration: 0.7, ease: 'power2.out' }
    this._parallax = { object, shot, factor }
    this._followQuick = {
      px: gsap.quickTo(cam.position, 'x', cfg),
      py: gsap.quickTo(cam.position, 'y', cfg),
      pz: gsap.quickTo(cam.position, 'z', cfg),
      lx: gsap.quickTo(this.lookTarget, 'x', cfg),
      ly: gsap.quickTo(this.lookTarget, 'y', cfg),
      lz: gsap.quickTo(this.lookTarget, 'z', cfg),
    }
  }

  /** 毎フレーム呼ぶ。追従目標の更新と lookAt の適用のみを行う。 */
  update() {
    if (this._parallax && !this._transitioning) {
      const { object, shot, factor } = this._parallax
      const p = object.position
      const q = this._followQuick
      q.px(shot.position[0] + p.x * factor)
      q.py(shot.position[1])
      q.pz(shot.position[2] + p.z * factor)
      q.lx(shot.look[0] + p.x * factor * 1.6)
      q.ly(shot.look[1])
      q.lz(shot.look[2] + p.z * factor * 1.6)
    } else if (this._follow && !this._transitioning) {
      const { object, offset, lookOffset } = this._follow
      const p = object.position
      const q = this._followQuick
      q.px(p.x + offset[0])
      q.py(p.y + offset[1])
      q.pz(p.z + offset[2])
      q.lx(p.x + lookOffset[0])
      q.ly(p.y + lookOffset[1])
      q.lz(p.z + lookOffset[2])
    }
    this.camera.lookAt(this.lookTarget)
  }
}
