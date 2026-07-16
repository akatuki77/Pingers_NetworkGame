// タイトル + ハブ（物語/ステージ選択）を 1 つのシーンで担うワールド。
// 状態遷移: TITLE → TRANSITION → SELECT(L1 ⇄ L2) → ステージへ（すべてワンカット）。
import * as THREE from 'three'
import { loadGlb, instantiate } from '@/runtime/AssetLoader.js'
import { gsap } from '@/runtime/tween.js'
import { CameraRig } from '@/runtime/CameraRig.js'
import { Character } from '@/actors/Character.js'
import { PlateBoard } from './HubPlates.js'
import { hubLevels } from '@/content/hubMenus.js'
import { HUB, CHARACTER } from '@/content/tuning.js'
import { createSky, createLighting } from '@/runtime/environment.js'

const SHOTS = {
  // タイトル構図: 島を少し見上げる引きの画。ロゴの背景になる
  title: { position: [10, 5.5, 26], look: [0, 2.2, 0], fov: 42 },
  // セレクト構図: 島全体とプレート群が見渡せる俯瞰（約 50°）
  select: { position: [0, 21.5, 18.5], look: [0, -0.9, 0], fov: 46 },
}

// MagicaVoxel 調のボクセル雲
function createVoxelCloud(seed = 0) {
  const rng = mulberry32(seed)
  const group = new THREE.Group()
  const mat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    emissive: 0xe8eef4,
    emissiveIntensity: 0.45,
  })
  const blocks = 5 + Math.floor(rng() * 4)
  let x = 0
  for (let i = 0; i < blocks; i++) {
    const w = 1.6 + rng() * 2.4
    const h = 0.8 + rng() * 0.9
    const d = 1.2 + rng() * 1.6
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
    box.position.set(x, (rng() - 0.3) * 0.7, (rng() - 0.5) * 1.4)
    group.add(box)
    x += w * (0.45 + rng() * 0.3)
  }
  const bbox = new THREE.Box3().setFromObject(group)
  const center = bbox.getCenter(new THREE.Vector3())
  group.children.forEach((c) => c.position.sub(center))
  return group
}

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const FLOWER_COLORS = [0xe66a88, 0xf0c04a, 0xf3f0e4, 0x9a7ac2, 0xe0662f]

export class HubWorld {
  /**
   * @param {import('@/runtime/Game.js').Game} game
   * @param {{ hubStore: object, progressStore: object, onNavigate: (routeName: string) => void }} ctx
   */
  constructor(game, ctx) {
    this.game = game
    this.hubStore = ctx.hubStore
    this.progressStore = ctx.progressStore
    this.onNavigate = ctx.onNavigate

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    this.rig = new CameraRig(this.camera)
    this.rig.applyShot(SHOTS.title)
    createSky(this.scene)
    createLighting(this.scene)

    this.islandRoot = new THREE.Group()
    this.scene.add(this.islandRoot)

    this.mixers = []
    this.character = null
    this._offBack = null
    this._busy = false // 状態遷移の多重起動防止

    this.plates = new PlateBoard(this.islandRoot, game, {
      onEnter: (item) => {
        if (!item.locked) this.hubStore.plateInfo = { label: item.label, summary: item.summary }
        else this.hubStore.plateInfo = { label: 'じゅんびちゅう', summary: 'この物語はまだ準備中だよ。' }
      },
      onLeave: () => {
        this.hubStore.plateInfo = null
      },
      onFire: (item) => this._onPlateFire(item),
    })

    this.ready = this._load()
  }

  async _load() {
    const [island, rock, flower, momotaro, title] = await Promise.all([
      loadGlb('/models/stage/background_hub.glb'),
      loadGlb('/models/object/hub_rock.glb'),
      loadGlb('/models/object/hub_flower.glb'),
      loadGlb('/models/character/momotaro.glb'),
      loadGlb('/models/title/GameTitle-v2.glb'),
    ])

    this.islandRoot.add(instantiate(island))

    const rng = mulberry32(20260711)
    // プレート矩形・見出し帯（z=-10）・ヒント帯（z=+2.6）と重ならない位置に置くこと
    const rockSpots = [
      [-10.8, -11.6, 0.75], [11.7, -9.6, 0.9], [-11.6, 3.6, 0.65],
      [11.6, 5.2, 0.8], [-3.5, -11.9, 0.55], [6.5, -11.6, 0.85],
    ]
    for (const [x, z, s] of rockSpots) {
      const r = instantiate(rock)
      r.position.set(x, 0, z)
      r.scale.setScalar(s * (0.85 + rng() * 0.3))
      r.rotation.y = rng() * Math.PI * 2
      this.islandRoot.add(r)
    }

    // 花畑はプレート帯・見出し帯 (z=-10)・ヒント帯 (z=+2.6) を避けて縁に散らす
    let placed = 0
    while (placed < 24) {
      const ang = rng() * Math.PI * 2
      const rad = 7.5 + rng() * 4
      const x = Math.cos(ang) * rad
      const z = Math.sin(ang) * rad
      if (Math.abs(z + 6) < 1.8 || Math.abs(z - 5) < 1.8 || Math.abs(z - 9) < 1.6) continue
      if (Math.abs(z + 10) < 1.5 && Math.abs(x) < 6.2) continue // レベルタイトル帯
      if (Math.abs(z - 2.6) < 1.2 && Math.abs(x) < 5.2) continue // 操作ヒント帯
      const f = instantiate(flower, { castShadow: false })
      f.position.set(x, 0, z)
      f.rotation.y = rng() * Math.PI * 2
      f.scale.setScalar(0.8 + rng() * 0.5)
      const color = FLOWER_COLORS[Math.floor(rng() * FLOWER_COLORS.length)]
      f.traverse((o) => {
        if (o.isMesh && o.name.includes('hubFlowerPetals')) {
          o.material = o.material.clone()
          o.material.color.setHex(color)
        }
      })
      this.islandRoot.add(f)
      placed++
    }

    // ── 桃太郎（プレイアブル。見た目はラッパー内で縮小） ──
    const momoInner = instantiate(momotaro)
    momoInner.scale.setScalar(CHARACTER.scale)
    const momo = new THREE.Group()
    momo.add(momoInner)
    momo.position.set(0, 0, 2.5)
    momo.rotation.y = Math.PI * 0.15
    this.islandRoot.add(momo)
    this.character = new Character(momo, momotaro.animations, this.game, {
      bounds: HUB.bounds,
      groundY: () => 0,
    })

    // ── 縁でくつろぐ仲間たち（にぎやかし — 計画書 §2.1.1-5） ──
    const friendDefs = [
      ['/models/character/dog.glb', 10.2, -0.8, -1.9],
      ['/models/character/monkey.glb', 11.1, 0.9, -2.2],
      ['/models/character/pheasant.glb', 9.6, 1.8, -1.7],
    ]
    for (const [path, fx, fz, fa] of friendDefs) {
      const gltf = await loadGlb(path)
      const friend = instantiate(gltf)
      friend.scale.setScalar(CHARACTER.scale)
      friend.position.set(fx, 0, fz)
      friend.rotation.y = fa
      this.islandRoot.add(friend)
      // 呼吸のゆらぎ
      gsap.to(friend.scale, {
        y: CHARACTER.scale * 1.04,
        duration: 1.4 + Math.random() * 0.6,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      })
    }

    // ── 3D タイトルロゴ（TITLE 状態のみ） ──
    const logo = instantiate(title, { castShadow: false, receiveShadow: false })
    logo.position.set(2, 6.4, 6)
    logo.rotation.y = 0.28 // タイトルカメラへ正対気味に
    logo.scale.setScalar(0.72)
    this.scene.add(logo)
    this.titleLogo = logo
    this._logoFloat = gsap.to(logo.position, {
      y: 7.0,
      duration: 3.0,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    })

    // ── 雲 ──
    for (let i = 0; i < 10; i++) {
      const cloud = createVoxelCloud(100 + i)
      const ang = (i / 10) * Math.PI * 2
      const rad = 34 + (i % 3) * 14
      cloud.position.set(Math.cos(ang) * rad, -6 + (i % 4) * 5.5 - (i % 2) * 9, Math.sin(ang) * rad)
      cloud.scale.setScalar(1.6 + (i % 3) * 0.8)
      this.scene.add(cloud)
      gsap.to(cloud.position, {
        x: cloud.position.x + 6 + (i % 3) * 3,
        duration: 26 + i * 3,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      })
      gsap.to(cloud.position, {
        y: cloud.position.y + 0.8,
        duration: 7 + (i % 5),
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      })
    }

    // 島の浮遊
    gsap.to(this.islandRoot.position, {
      y: 0.3,
      duration: 3.6,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    })

    // Esc の一元処理
    this._offBack = this.game.input.on('back', () => this._onBack())
  }

  // ── 状態遷移 ─────────────────────────────────────────────

  /** タイトル状態に入る（初回入場）。 */
  enterTitle() {
    this.hubStore.phase = 'title'
    this.game.input.lock('hub-title')
    this.game.audio.playBgm('hub')
    this.rig.stopFollow()
    this.rig.applyShot(SHOTS.title)
    this._startTitleDrift()
  }

  _startTitleDrift() {
    this._titleDrift?.kill()
    this._titleDrift = gsap.to(this.camera.position, {
      x: SHOTS.title.position[0] - 3.5,
      y: SHOTS.title.position[1] + 1.2,
      duration: 14,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1,
    })
  }

  /** 「はじめる」→ カメラがシームレスに島へ寄り、L1 で操作可能に。 */
  async startGame() {
    if (this._busy || this.hubStore.phase !== 'title') return
    this._busy = true
    this.hubStore.phase = 'transition'
    this._titleDrift?.kill()

    // ロゴは空へ帰す（浮遊トゥイーンを殺してから。残すと飛ばした後に引き戻されて
    // 「ロゴが残ったまま遷移する」見え方になる）
    if (this.titleLogo) {
      const logo = this.titleLogo
      this._logoFloat?.kill()
      gsap.killTweensOf(logo.position)
      gsap.to(logo.position, { y: 18, duration: 0.9, ease: 'power2.in' })
      gsap.to(logo.scale, { x: 0.3, y: 0.3, z: 0.3, duration: 0.9, ease: 'power2.in' })
      setTimeout(() => (logo.visible = false), 950)
    }

    // セレクトの立ち位置は中央（プレートは中央を囲んで配置されている）
    this.character.teleport(0, 0.5, Math.PI)
    const [camMove] = await Promise.allSettled([
      this.rig.transitionTo(SHOTS.select, { duration: HUB.transitionDuration }),
      this.plates.show(hubLevels['story-select'], this.progressStore),
    ])
    void camMove
    if (this.titleLogo) this.titleLogo.visible = false // 保険（本命は打ち上げ後の非表示）

    this.hubStore.phase = 'select'
    this.hubStore.level = 'story-select'
    this.rig.startParallax(this.character.model, SHOTS.select)
    this.game.input.unlock('hub-title')
    this._busy = false
  }

  /** ステージクリア帰還などで、TITLE を飛ばして L2 に直接入る。 */
  async enterSelectDirect() {
    this.hubStore.phase = 'select'
    this.hubStore.level = 'stage-select'
    this.game.audio.playBgm('hub')
    if (this.titleLogo) this.titleLogo.visible = false
    this.character.teleport(0, 0.5, Math.PI) // 中央にスポーン
    this.rig.applyShot(SHOTS.select)
    this.rig.startParallax(this.character.model, SHOTS.select)
    await this.plates.show(hubLevels['stage-select'], this.progressStore)
  }

  /** L1 ⇄ L2 のレベルスワップ（シーンは作り直さない）。 */
  async swapLevel(levelName) {
    if (this._busy) return
    this._busy = true
    this.game.input.lock('hub-swap')
    this.hubStore.plateInfo = null

    // カメラが軽く弧を描く（切り替わった感を出す最小の動き）
    const arc = gsap.timeline()
    arc.to(this.camera.position, {
      x: levelName === 'stage-select' ? 3.5 : -3.5,
      duration: 0.55,
      ease: 'power2.inOut',
    })
    arc.to(this.camera.position, { x: 0, duration: 0.55, ease: 'power2.inOut' })

    await this.plates.hide()
    await this.plates.show(hubLevels[levelName], this.progressStore)
    this.hubStore.level = levelName
    this.game.input.unlock('hub-swap')
    this._busy = false
  }

  /** L1 から TITLE へ戻る。 */
  async backToTitle() {
    if (this._busy) return
    this._busy = true
    this.game.input.lock('hub-title')
    this.hubStore.phase = 'transition'
    this.hubStore.plateInfo = null
    this.rig.stopFollow()
    if (this.titleLogo) {
      const logo = this.titleLogo
      logo.visible = true
      logo.scale.setScalar(0.72)
      gsap.killTweensOf(logo.position)
      gsap.fromTo(logo.position, { y: 14 }, {
        y: 6.4,
        duration: 1.4,
        ease: 'power2.out',
        onComplete: () => {
          // 浮遊を再開
          this._logoFloat = gsap.to(logo.position, {
            y: 7.0,
            duration: 3.0,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
          })
        },
      })
    }
    await Promise.allSettled([
      this.rig.transitionTo(SHOTS.title, { duration: 1.6 }),
      this.plates.hide(),
    ])
    this.hubStore.phase = 'title'
    this._startTitleDrift()
    this._busy = false
  }

  _onBack() {
    if (this.game.world !== this) return // 非アクティブ時（ステージ滞在中）は無視
    if (this.hubStore.phase !== 'select' || this._busy) return
    if (this.hubStore.level === 'stage-select') this.swapLevel('story-select')
    else this.backToTitle()
  }

  _onPlateFire(item) {
    if (item.to?.level) {
      this.swapLevel(item.to.level)
    } else if (item.to?.route) {
      this.navigateTo(item.to.route)
    }
  }

  /** ルート遷移（プレート発火・冒険の書から共用）。 */
  navigateTo(routeName) {
    this.game.input.lock('hub-navigate')
    this.onNavigate(routeName)
    // ロックはワールド切替（HubWorld 破棄はしない）後に App 側で解除される
  }

  /** ステージへ出発した後、ハブへ戻ってきた時のための後始末。 */
  suspend() {
    this.hubStore.plateInfo = null
    this.game.input.unlock('hub-navigate')
  }

  /** 用語集などワールドを切り替えない遷移から戻ってきたときの復帰処理。 */
  resume() {
    this.suspend()
    if (this.hubStore.phase === 'select' && this.character) {
      const p = this.character.model.position
      this.plates.resume(p.x, p.z)
    }
  }

  update(dt) {
    for (const m of this.mixers) m.update(dt)
    if (this.character && this.hubStore.phase === 'select') {
      this.character.update(dt)
      this.plates.update(dt, this.character.model.position.x, this.character.model.position.z)
    }
    this.rig.update()
  }
}

export { SHOTS as HUB_SHOTS }
