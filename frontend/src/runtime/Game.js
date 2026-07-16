// ゲームランタイムの心臓部。WebGLRenderer とメインループをアプリ起動時に 1 度だけ生成し、
// 以後絶対に破棄しない（単一ランタイム原則 — docs/rebuild-policy.md §4.1）。
// 画面(ワールド)の切替はこのクラスの setWorld() が担い、ルーターは URL 同期のみを行う。
import * as THREE from 'three'
import { InputManager } from './InputManager.js'
import { AudioManager } from './AudioManager.js'

/** @type {Game | null} */
let instance = null

export class Game {
  /**
   * @param {HTMLElement} host canvas を差し込むコンテナ（画面全面固定）
   */
  constructor(host) {
    this.host = host

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.12
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.domElement.classList.add('game-canvas')
    host.appendChild(this.renderer.domElement)

    this.input = new InputManager()
    this.audio = new AudioManager()

    /** 現在表示中のワールド（scene/camera/update を持つ）。 */
    this.world = null
    this.clock = new THREE.Clock()
    this.elapsed = 0

    this._onResize = () => this.resize()
    window.addEventListener('resize', this._onResize)
    this.resize()

    // 自動品質調整: 低スペック環境では解像度→影の順に段階的に軽くする
    this._quality = { level: 0, frames: 0, elapsed: 0 }

    this.renderer.setAnimationLoop(() => this._tick())
  }

  /** ワールドを切り替える。演出（フェード等）は呼び出し側が担う。 */
  setWorld(world) {
    if (this.world?.exit) this.world.exit()
    // ロックの取り残しで入力が死ぬのを防ぐ（必要なロックは新ワールドが掛け直す）
    this.input.clearLocks()
    this.world = world
    this.resize()
    if (world?.enter) world.enter()
  }

  resize() {
    const w = this.host.clientWidth || window.innerWidth
    const h = this.host.clientHeight || window.innerHeight
    this.renderer.setSize(w, h)
    if (this.world?.camera) {
      this.world.camera.aspect = w / h
      this.world.camera.updateProjectionMatrix()
    }
    this.world?.resize?.(w, h)
  }

  _tick() {
    const dt = Math.min(this.clock.getDelta(), 1 / 15) // タブ復帰時の巨大 dt を抑制
    this.elapsed += dt
    this._measureQuality(dt)
    if (!this.world) return
    this.world.update?.(dt, this.elapsed)
    this.renderer.render(this.world.scene, this.world.camera)
  }

  /** 5 秒間の平均 fps が低ければ描画品質を 1 段階下げる（上げ戻しはしない）。 */
  _measureQuality(dt) {
    const q = this._quality
    if (q.level >= 2) return
    q.frames++
    q.elapsed += dt
    if (q.elapsed < 5) return
    const fps = q.frames / q.elapsed
    q.frames = 0
    q.elapsed = 0
    if (fps >= 42) return
    q.level++
    if (q.level === 1) {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25))
    } else if (q.level === 2) {
      // 影マップを縮小（マテリアル再コンパイルが走らないので描画が止まらない）
      this.world?.scene?.traverse((o) => {
        if (o.isLight && o.castShadow) {
          o.shadow.mapSize.set(512, 512)
          o.shadow.map?.dispose()
          o.shadow.map = null
        }
      })
    }
  }
}

/** アプリ起動時に main.js から 1 度だけ呼ぶ。 */
export function createGame(host) {
  if (instance) return instance
  instance = new Game(host)
  return instance
}

/** どこからでも既存ランタイムを参照する。 */
export function useGame() {
  if (!instance) throw new Error('Game runtime is not created yet')
  return instance
}
