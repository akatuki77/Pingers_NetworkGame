// セレクトプレート — 地面に描かれた手描き風の白枠メニュー（Unrailed! 方式、計画書 §2.3）。
// CanvasTexture を貼った透過板ポリで、滞在ゲージ・クリアマーク・ロックを canvas 再描画で表現する。
import * as THREE from 'three'
import { gsap } from '@/runtime/tween.js'
import { HUB } from '@/content/tuning.js'

const PLATE_W = 3.6
const PLATE_H = 2.2
const CANVAS_W = 512
const CANVAS_H = 320
const INK_WHITE = 'rgba(255,255,255,0.95)'
const INK_GOLD = '#ffd75e'
const INK_GRAY = 'rgba(220,220,220,0.5)'

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 文字列から決定的なシードを作る（リロードで形が変わらない）。 */
function hashSeed(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** 手描き風の枠線ポリライン（頂点を固定シードでゆがめた矩形）を生成する。 */
function buildFramePath(seed, margin = 30) {
  const rng = mulberry32(seed)
  const w = CANVAS_W
  const h = CANVAS_H
  const corners = [
    [margin, margin],
    [w - margin, margin],
    [w - margin, h - margin],
    [margin, h - margin],
  ]
  const pts = []
  const SUB = 5 // 1 辺の分割数
  for (let e = 0; e < 4; e++) {
    const [x0, y0] = corners[e]
    const [x1, y1] = corners[(e + 1) % 4]
    for (let i = 0; i < SUB; i++) {
      const t = i / SUB
      const jx = (rng() - 0.5) * 2 * (w * 0.012)
      const jy = (rng() - 0.5) * 2 * (h * 0.02)
      pts.push([x0 + (x1 - x0) * t + jx, y0 + (y1 - y0) * t + jy])
    }
  }
  // 周長の累積を前計算（ゲージ描画で使う）
  const lens = [0]
  for (let i = 1; i <= pts.length; i++) {
    const [ax, ay] = pts[i - 1]
    const [bx, by] = pts[i % pts.length]
    lens.push(lens[i - 1] + Math.hypot(bx - ax, by - ay))
  }
  return { pts, lens, total: lens[lens.length - 1] }
}

function strokePath(ctx, pts, closed = true) {
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
  if (closed) ctx.closePath()
  ctx.stroke()
}

/** 周長 fraction ぶんだけ枠線をなぞる（滞在ゲージ）。 */
function strokePartial(ctx, frame, fraction) {
  const targetLen = frame.total * fraction
  ctx.beginPath()
  ctx.moveTo(frame.pts[0][0], frame.pts[0][1])
  for (let i = 1; i <= frame.pts.length; i++) {
    const seg = frame.lens[i] - frame.lens[i - 1]
    const [bx, by] = frame.pts[i % frame.pts.length]
    if (frame.lens[i] <= targetLen) {
      ctx.lineTo(bx, by)
    } else {
      const [ax, ay] = frame.pts[i - 1]
      const t = (targetLen - frame.lens[i - 1]) / seg
      ctx.lineTo(ax + (bx - ax) * t, ay + (by - ay) * t)
      break
    }
  }
  ctx.stroke()
}

/** 1 枚のセレクトプレート。 */
class Plate {
  constructor(item) {
    this.item = item
    this.progress = 0
    this.cleared = false
    this.highlighted = false
    this.frame = buildFramePath(hashSeed(item.id))

    this.canvas = document.createElement('canvas')
    this.canvas.width = CANVAS_W
    this.canvas.height = CANVAS_H
    this.ctx = this.canvas.getContext('2d')
    this.texture = new THREE.CanvasTexture(this.canvas)
    this.texture.anisotropy = 8
    this.texture.colorSpace = THREE.SRGBColorSpace

    const mat = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      toneMapped: false,
      depthWrite: false,
    })
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(PLATE_W, PLATE_H), mat)
    this.mesh.rotation.x = -Math.PI / 2
    this.mesh.position.set(item.position[0], 0.02, item.position[1])
    this.mesh.renderOrder = 2
    this.draw()
  }

  /** 桃太郎の XZ がプレート矩形内にあるか。 */
  contains(x, z) {
    const [px, pz] = this.item.position
    return Math.abs(x - px) < PLATE_W / 2 && Math.abs(z - pz) < PLATE_H / 2
  }

  draw() {
    const { ctx, item } = this
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    const locked = !!item.locked
    // 枠の下に濃い縁を敷いて、明るい地面の上でも枠が沈まないようにする
    ctx.strokeStyle = 'rgba(30, 24, 14, 0.55)'
    ctx.lineWidth = 12
    strokePath(ctx, this.frame.pts)
    const strokeStyle = locked ? INK_GRAY : this.highlighted ? INK_GOLD : INK_WHITE
    ctx.strokeStyle = strokeStyle
    ctx.lineWidth = 7
    strokePath(ctx, this.frame.pts)

    // 滞在ゲージ: 金色の太線が時計回りに満ちる
    if (this.progress > 0 && !locked) {
      ctx.strokeStyle = INK_GOLD
      ctx.lineWidth = 13
      strokePartial(ctx, this.frame, Math.min(this.progress, 1))
    }

    // ラベル（長文は縮小）
    const label = locked ? 'じゅんびちゅう' : item.label
    ctx.fillStyle = locked ? INK_GRAY : INK_WHITE
    let size = 64
    ctx.font = `700 ${size}px 'Zen Maru Gothic', azuki, sans-serif`
    while (ctx.measureText(label).width > CANVAS_W - 120 && size > 30) {
      size -= 4
      ctx.font = `700 ${size}px 'Zen Maru Gothic', azuki, sans-serif`
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    // 濃い縁取りで地面の上でも読めるようにする
    ctx.strokeStyle = 'rgba(30, 24, 14, 0.85)'
    ctx.lineWidth = 10
    ctx.strokeText(label, CANVAS_W / 2, CANVAS_H / 2 + 4)
    ctx.fillText(label, CANVAS_W / 2, CANVAS_H / 2 + 4)

    // クリア済みの朱色の〇（判子風）
    if (this.cleared) {
      ctx.strokeStyle = '#e0563a'
      ctx.lineWidth = 10
      ctx.beginPath()
      ctx.arc(CANVAS_W - 64, 64, 34, 0, Math.PI * 2)
      ctx.stroke()
    }

    this.texture.needsUpdate = true
  }

  setProgress(v) {
    if (Math.abs(v - this.progress) < 0.02 && v !== 0 && v < 1) return // 再描画を間引く
    this.progress = v
    this.draw()
  }
}

/**
 * プレート盤面。レベル（L1/L2）ごとのプレート群と地面描画（レベルタイトル・操作ヒント）を管理する。
 * events: onEnter(item), onLeave(), onFire(item)
 */
export class PlateBoard {
  /**
   * @param {THREE.Group} parent 島ルート（浮遊と一緒に動く）
   * @param {import('@/runtime/Game.js').Game} game
   */
  constructor(parent, game, events = {}) {
    this.game = game
    this.events = events
    this.group = new THREE.Group()
    parent.add(this.group)
    this.plates = []
    this.activePlate = null
    this.dwellBlocked = 0 // スワップ直後の判定遅延
    this.enabled = false
    this._firing = false

    // プレート上での Enter 即決定（アクセシビリティ）
    this._offConfirm = game.input.on('interact', () => {
      if (this.enabled && this.activePlate && !this._firing) this._fire(this.activePlate)
    })
  }

  /** レベルを表示する（迫り上がり演出）。 */
  async show(levelDef, progressStore = null) {
    if (this.group.children.length) await this.hide() // 二重表示の防止
    this.levelDef = levelDef
    this.plates = levelDef.items.map((item) => new Plate(item))
    for (const p of this.plates) {
      if (item_cleared(p.item, progressStore)) p.cleared = true
      if (progressStore && p.item.stageId && progressStore.lastClearedStageId === p.item.stageId) {
        p.highlighted = true
      }
      p.draw()
      this.group.add(p.mesh)
    }

    // 地面の見出しと操作ヒント
    this._banner = makeGroundText(`《 ${levelDef.title} 》`, 1024, 192, 92, 10.5, 2.0)
    this._banner.position.set(0, 0.02, -10)
    this.group.add(this._banner)
    this._hint = makeGroundText('～ あるいて えらぼう（WASD / やじるし） ～', 1024, 128, 52, 8.5, 1.06)
    this._hint.position.set(0, 0.02, 2.6)
    this.group.add(this._hint)

    // 迫り上がり
    const targets = [...this.plates.map((p) => p.mesh), this._banner, this._hint]
    const tl = gsap.timeline()
    for (const [i, m] of targets.entries()) {
      m.position.y = -0.6
      m.material.opacity = 0
      tl.to(m.position, { y: 0.02, duration: 0.32, ease: 'power2.out' }, i * 0.035)
      tl.to(m.material, { opacity: 1, duration: 0.32, ease: 'power2.out' }, i * 0.035)
    }
    this.dwellBlocked = HUB.plateSwapDelay
    await tl.then()
    this.enabled = true
  }

  /** 現レベルを沈めて消す。 */
  async hide() {
    this.enabled = false
    this._clearActive()
    const targets = this.group.children.slice()
    const tl = gsap.timeline()
    for (const [i, m] of targets.entries()) {
      tl.to(m.position, { y: -0.6, duration: 0.28, ease: 'power2.in' }, i * 0.02)
      tl.to(m.material, { opacity: 0, duration: 0.28, ease: 'power2.in' }, i * 0.02)
    }
    await tl.then()
    for (const m of targets) {
      this.group.remove(m)
      m.material.map?.dispose()
      m.material.dispose()
      m.geometry.dispose()
    }
    this.plates = []
  }

  _clearActive() {
    if (this.activePlate) {
      this.activePlate.setProgress(0)
      this.activePlate = null
      this.events.onLeave?.()
    }
  }

  /** 用語集などから戻ってきたとき、盤面を再度有効にする。 */
  resume(charX, charZ) {
    // 発火済みプレートの見た目（金枠・満ゲージ）を通常に戻す
    if (this._firedPlate) {
      this._firedPlate.progress = 0
      this._firedPlate.highlighted = this._firedPlate._wasHighlighted ?? false
      this._firedPlate.draw()
      this._firedPlate = null
    }
    // プレートに乗ったまま戻ってきた場合、一度離れるまで再発火させない
    this._ignorePlate = this.plates.find((p) => p.contains(charX, charZ)) ?? null
    this.dwellBlocked = HUB.plateSwapDelay
    this.enabled = true
  }

  _fire(plate) {
    this._firing = true
    this.enabled = false
    plate._wasHighlighted = plate.highlighted
    this._firedPlate = plate
    this.game.audio.sfx('fire')
    // 発光フラッシュ: 一瞬強くスケール & 点滅
    const m = plate.mesh
    gsap.timeline()
      .to(m.scale, { x: 1.08, y: 1.08, duration: 0.12, ease: 'power2.out' })
      .to(m.scale, { x: 1, y: 1, duration: 0.2, ease: 'power2.out' })
    plate.progress = 1
    plate.highlighted = true
    plate.draw()
    this.events.onFire?.(plate.item)
    this._firing = false
  }

  /** 毎フレーム: 滞在判定とゲージ進行。 */
  update(dt, charX, charZ) {
    if (!this.enabled) return
    if (this.dwellBlocked > 0) {
      this.dwellBlocked -= dt
      return
    }
    const hit = this.plates.find((p) => p.contains(charX, charZ)) ?? null
    // 復帰時に乗っていたプレートは、一度離れたら通常判定に戻す
    if (this._ignorePlate && hit !== this._ignorePlate) this._ignorePlate = null
    if (hit !== this.activePlate) {
      this._clearActive()
      this.activePlate = hit
      if (hit) {
        this.game.audio.sfx('hover')
        this.events.onEnter?.(hit.item)
      }
    }
    if (this.activePlate && !this.activePlate.item.locked && this.activePlate !== this._ignorePlate) {
      const before = this.activePlate.progress
      const after = before + dt / HUB.plateDwellTime
      this.activePlate.setProgress(after)
      // 25% 刻みのカチ音
      if (Math.floor(after * 4) > Math.floor(before * 4) && after < 1) this.game.audio.sfx('tick')
      if (after >= 1) this._fire(this.activePlate)
    }
  }

  dispose() {
    this._offConfirm?.()
  }
}

function item_cleared(item, progressStore) {
  return !!(progressStore && item.stageId && progressStore.isCleared(item.stageId))
}

/** 地面に直接描くテキスト板（見出し・ヒント帯）。 */
function makeGroundText(text, cw, ch, fontPx, worldW, worldH) {
  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')
  ctx.font = `700 ${fontPx}px 'Zen Maru Gothic', azuki, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = 'rgba(30, 24, 14, 0.85)'
  ctx.lineWidth = Math.max(8, fontPx * 0.14)
  ctx.strokeText(text, cw / 2, ch / 2)
  ctx.fillStyle = 'rgba(255,255,255,0.96)'
  ctx.fillText(text, cw / 2, ch / 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = 8
  texture.colorSpace = THREE.SRGBColorSpace
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(worldW, worldH),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      toneMapped: false,
      depthWrite: false,
    }),
  )
  mesh.rotation.x = -Math.PI / 2
  mesh.renderOrder = 2
  return mesh
}
