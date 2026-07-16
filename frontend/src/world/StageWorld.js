// 共通ステージランタイム。stages3d.js の定義からステージを組み立てる（データ駆動）。
// 地形・キャラ・村・看板・NPC・収集・選択クイズ・カットシーン・クリア帰還までを担う。
import * as THREE from 'three'
import { loadGlb, instantiate } from '@/runtime/AssetLoader.js'
import { CameraRig } from '@/runtime/CameraRig.js'
import { Character } from '@/actors/Character.js'
import { createSky, createLighting } from '@/runtime/environment.js'
import { gsap } from '@/runtime/tween.js'
import { createFloatingLabel } from './props.js'
import { stageWorlds } from '@/content/stages3d.js'
import { CHARACTER } from '@/content/tuning.js'
import { quizzes } from '@/content/quizzes.js'

const DOWN = new THREE.Vector3(0, -1, 0)

export class StageWorld {
  /**
   * @param {import('@/runtime/Game.js').Game} game
   * @param {string} routeName 'Stage-1-1' など
   * @param {{ onExit: () => void, onClear: (returnPath: string) => void, stageStore: object }} ctx
   */
  constructor(game, routeName, ctx) {
    this.game = game
    this.def = stageWorlds[routeName]
    this.routeName = routeName
    this.onExit = ctx.onExit
    this.onClear = ctx.onClear
    this.stageStore = ctx.stageStore
    this.stageStore.reset(routeName, this.def.objective ?? '', {
      quizButton: this.def.quizButton !== false,
      clearHasNext: !!this.def.clearReturn?.startsWith('/Stage'),
    })

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
    this.rig = new CameraRig(this.camera)
    createSky(this.scene)
    createLighting(this.scene)

    this.terrainGroup = new THREE.Group()
    this.scene.add(this.terrainGroup)
    this._raycaster = new THREE.Raycaster()
    this._raycaster.far = 60

    /** 近接インタラクション対象 { x, z, radius, prompt, onInteract } */
    this.interactables = []
    this._activeInteractable = null
    this._uiLocked = false
    /** NPC id → メッシュ */
    this.npcMeshes = {}
    /** 収集/正解済みの NPC id */
    this._done = new Set()
    /** 進行フラグ（乗船許可など） */
    this._flags = new Set()
    this.mixers = []

    this.character = null
    this._offBack = null
    this._offInteract = null
    this.ready = this._load()
  }

  async _load() {
    const def = this.def
    const [terrain, momotaro] = await Promise.all([
      loadGlb(def.terrain),
      loadGlb('/models/character/momotaro.glb'),
    ])
    const terrainMesh = instantiate(terrain)
    this.terrainGroup.add(terrainMesh)
    this._terrainOnly = [terrainMesh] // 配置用（小物の屋根に乗らないように地形だけを見る）

    // ── 配置オブジェクト（関所・港の小物など） ──
    // 既定で衝突あり（terrainGroup に入れて壁・段差として扱う）。collide:false で装飾のみ
    for (const o of def.objects ?? []) {
      const gltf = await loadGlb(o.model)
      const obj = instantiate(gltf)
      if (o.scale) obj.scale.setScalar(o.scale)
      const y =
        o.groundSnap === false
          ? (o.y ?? 0)
          : (this.groundYTerrain(o.position[0], o.position[1]) ?? 0)
      obj.position.set(o.position[0], y, o.position[1])
      if (o.rotationY) obj.rotation.y = o.rotationY
      if (o.collide === false) this.scene.add(obj)
      else this.terrainGroup.add(obj)
    }

    // ── 村と看板（探索型ステージ） ──
    for (const v of def.villages ?? []) {
      if (v.model) {
        // v.model は GLB パス（村ごとの専用モデル）
        const villageGltf = await loadGlb(v.model)
        const house = instantiate(villageGltf)
        if (v.modelScale) house.scale.setScalar(v.modelScale)
        const gy = this.groundYTerrain(v.position[0], v.position[1]) ?? 0
        house.position.set(v.position[0], gy, v.position[1])
        house.lookAt(v.signPosition[0], gy, v.signPosition[1])
        this.terrainGroup.add(house) // 家はすり抜けない
      }
      // 名前はオブジェクトの頭上に浮かぶラベルで示す（看板メッシュは使わない）
      const label = createFloatingLabel(v.signLines, { size: v.labelSize ?? 1 })
      const lp = v.labelPosition ?? v.position
      const ly = (this.groundYTerrain(lp[0], lp[1]) ?? 0) + (v.labelY ?? 3.2)
      label.position.set(lp[0], ly, lp[1])
      this.scene.add(label)
      gsap.to(label.position, {
        y: ly + 0.18,
        duration: 2.2,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      })
      this.interactables.push({
        x: v.signPosition[0],
        z: v.signPosition[1],
        radius: 2.4,
        prompt: v.prompt ?? 'はなしを きく',
        onInteract: () => this.stageStore.startDialogue(v.name, v.dialogue),
      })
    }

    // ── NPC ──
    for (const npc of def.npcs ?? []) {
      const gltf = await loadGlb(npc.model)
      const mesh = instantiate(gltf)
      const npcScale = CHARACTER.scale * (npc.scale ?? 1)
      mesh.scale.setScalar(npcScale)
      const gy =
        npc.groundSnap === false
          ? (npc.y ?? 0)
          : (this.groundYTerrain(npc.position[0], npc.position[1]) ?? 0)
      mesh.position.set(npc.position[0], gy, npc.position[1])
      mesh.rotation.y = npc.angle ?? 0
      this.scene.add(mesh)
      this.npcMeshes[npc.id] = mesh
      // idle クリップがあれば再生。なければ小さな呼吸アニメ（GSAP）
      const idle = THREE.AnimationClip.findByName(gltf.animations ?? [], 'idle')
      if (idle) {
        const mixer = new THREE.AnimationMixer(mesh)
        mixer.clipAction(idle).play()
        this.mixers.push(mixer)
      } else if (npc.id !== 'boat') {
        gsap.to(mesh.scale, {
          y: npcScale * 1.03,
          duration: 1.6,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
        })
      }
      this.interactables.push({
        x: npc.position[0],
        z: npc.position[1],
        radius: 2.6,
        prompt: npc.prompt ?? 'はなす',
        onInteract: () => this._interactNpc(npc),
      })
    }

    // ── 海（港町ステージ共通） ──
    if (def.sea || def.cutscene === 'onigashima') {
      const sea = new THREE.Mesh(
        new THREE.PlaneGeometry(300, 300),
        new THREE.MeshLambertMaterial({ color: 0x3a7abf }),
      )
      sea.rotation.x = -Math.PI / 2
      sea.position.y = -0.14 // 港町の水際 (y=0.1) のすぐ下
      sea.receiveShadow = true
      this.scene.add(sea)
      gsap.to(sea.position, { y: -0.08, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 })
      this._sea = sea
    }

    // ── カットシーン用の鬼ヶ島（4-1） ──
    // scripts/generate-onigashima.mjs で生成した新モデル。喫水線 = モデルの y=0、
    // 水中の裾 (y=-2) を持つため、海面 (-0.14) に対して少し沈めるだけで接水する。
    if (def.cutscene === 'onigashima') {
      const oniTerrain = await loadGlb('/models/stage/background_onigashima_v2.glb')
      const island = new THREE.Group()
      island.add(instantiate(oniTerrain))
      island.position.set(22, -0.1, -38) // 桟橋の先の海上
      this.scene.add(island)
      this._oniIsland = island

      // 港のオブジェクトに含まれる既存の小舟（材質 palette.012）を桟橋脇の海上へ移す。
      // 元の置き場所は桟橋の上（水がない）ため、元メッシュは隠して浮かべ直す。
      let boatSrc = null
      this.scene.traverse((o) => {
        if (!boatSrc && o.isMesh && o.material?.name === 'palette.012') boatSrc = o
      })
      if (boatSrc) {
        boatSrc.visible = false
        const mesh = boatSrc.clone()
        mesh.visible = true
        // 元ノードの配置（桟橋の上）を捨て、ジオメトリのローカル境界で原点 = 底面中心にする
        mesh.rotation.set(0, 0, 0)
        mesh.geometry.computeBoundingBox()
        const gb = mesh.geometry.boundingBox
        const gc = gb.getCenter(new THREE.Vector3())
        mesh.position.set(-gc.x, -gb.min.y, -gc.z)
        const group = new THREE.Group()
        group.add(mesh)
        group.position.set(2.5, -0.25, -14.2) // 桟橋の先の海上（船体が少し浸かる）
        group.rotation.y = 0.35
        this.scene.add(group)
        this.boat = group
        this._boatDeckY = 0.3 // 甲板（乗り込んだ桃太郎の足元）の高さ
        this._startBoatBob()
      }
    }

    // ── ゾーン（モデルを持たないインタラクション地点） ──
    for (const zone of def.zones ?? []) {
      this.interactables.push({
        x: zone.position[0],
        z: zone.position[1],
        radius: zone.radius ?? 2.2,
        prompt: zone.prompt ?? 'しらべる',
        onInteract: () => this._interactNpc(zone),
      })
    }

    // ── キャラクター（見た目はラッパー内で縮小。物理・スカッシュはラッパー基準） ──
    const momoInner = instantiate(momotaro)
    momoInner.scale.setScalar(CHARACTER.scale)
    const momo = new THREE.Group()
    momo.add(momoInner)
    this.character = new Character(momo, momotaro.animations, this.game, {
      bounds: def.bounds,
      groundY: (x, z) => this.groundY(x, z),
      waterLevel: def.waterLevel ?? -Infinity,
    })
    const { x, z, angle } = def.spawn
    this.scene.add(momo)
    this.character.teleport(x, z, angle)

    // ── 収集カウンタ ──
    if (def.collect) {
      this.stageStore.collect = { label: def.collect.label, got: 0, total: def.collect.total }
    }

    this._offBack = this.game.input.on('back', () => this._exit())
    this._offInteract = this.game.input.on('interact', () => this._interact())
  }

  /** 配置用: 地形メッシュだけへのレイキャスト（関所や家の屋根を無視する）。 */
  groundYTerrain(x, z) {
    this._raycaster.set(new THREE.Vector3(x, 30, z), DOWN)
    const hits = this._raycaster.intersectObjects(this._terrainOnly ?? [], true)
    return hits.length ? hits[0].point.y : null
  }

  /** 地形への上からのレイキャストで接地高さを得る。地面がなければ null。
   *  同じ位置での連続呼び出しはキャッシュを返す（毎フレームのコスト削減）。 */
  groundY(x, z) {
    const c = this._groundCache
    if (c && Math.abs(c.x - x) < 0.03 && Math.abs(c.z - z) < 0.03) return c.y
    this._raycaster.set(new THREE.Vector3(x, 30, z), DOWN)
    const hits = this._raycaster.intersectObjects(this.terrainGroup.children, true)
    const y = hits.length ? hits[0].point.y : null
    this._groundCache = { x, z, y }
    return y
  }

  /** 入場演出: 俯瞰からキャラへ寄っていき、着いたら目的を提示して操作可能に。 */
  async intro() {
    this.game.input.lock('stage-intro')
    this.game.audio.playBgm(this.def.bgm)
    this.rig.applyShot(this.def.intro)
    const p = this.character.model.position
    await this.rig.transitionTo(
      { position: [p.x, p.y + 8.2, p.z + 11.6], look: [p.x, p.y + 0.6, p.z] },
      { duration: 1.8 },
    )
    this.rig.startFollow(this.character.model, { offset: [0, 8.2, 11.6], lookOffset: [0, 0.6, 0] })
    this.game.input.unlock('stage-intro')
  }

  // ── インタラクション ─────────────────────────────────────

  _interact() {
    if (this._activeInteractable && !this.stageStore.uiOpen && !this._cutscenePlaying) {
      this.game.audio.sfx('confirm')
      this._activeInteractable.onInteract()
    }
  }

  /** NPC への話しかけ。interaction.type ごとの進行を実装する。 */
  _interactNpc(npc) {
    const store = this.stageStore
    const t = npc.interaction
    switch (t.type) {
      case 'dialogue': {
        store.startDialogue(npc.name, t.lines, () => {
          if (t.flag) this._flags.add(t.flag) // 進行フラグ（乗船許可など）
          if (t.panel) {
            store.learningPanel = { ...t.panel, onClose: () => t.clears && this._eventClear() }
          } else if (t.clears) {
            this._eventClear()
          }
        })
        break
      }
      case 'collect': {
        if (this._done.has(npc.id)) {
          store.startDialogue(npc.name, [t.repeatLine])
          return
        }
        store.startDialogue(npc.name, t.lines, () => {
          this._done.add(npc.id)
          this.game.audio.sfx('tick')
          store.collect = { ...store.collect, got: this._done.size }
          // もらった動物はぴょんと喜ぶ
          const mesh = this.npcMeshes[npc.id]
          if (mesh) {
            gsap.fromTo(
              mesh.position,
              { y: mesh.position.y },
              { y: mesh.position.y + 0.35, duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 1 },
            )
          }
          if (this._done.size >= (this.def.collect?.total ?? Infinity)) this._eventClear()
        })
        break
      }
      case 'choiceQuiz': {
        const q = quizzes[this.def.quizKey]
        store.startDialogue(npc.name, t.intro, () => {
          store.choiceQuiz = {
            title: t.quizTitle ?? 'もんだい',
            speaker: npc.name,
            question: q.question,
            options: q.options,
            correctAnswerIndex: q.correctAnswerIndex,
            wrongHints: q.wrongHints,
            onCorrect: () => store.beginClear({ explanationText: q.explanation }),
          }
        })
        break
      }
      case 'reviewQuiz': {
        const rq = quizzes[this.def.quizKey].reviewQuizzes[t.index]
        if (this._done.has(npc.id)) {
          store.startDialogue(npc.name, ['この問題には もう正解したよ！\nほかの仲間の問題に 挑戦しよう！'])
          return
        }
        store.choiceQuiz = {
          title: `${npc.name} の もんだい`,
          question: rq.question,
          options: rq.options,
          correctAnswerIndex: rq.correctAnswerIndex,
          wrongHints: rq.wrongHints,
          onCorrect: () => {
            this._done.add(npc.id)
            store.collect = { ...store.collect, got: this._done.size }
            store.startDialogue(npc.name, [rq.explanation], () => {
              if (this._done.size >= (this.def.collect?.total ?? 3)) this._eventClear()
            })
          },
        }
        break
      }
      case 'cutscene': {
        if (t.requires && !this._flags.has(t.requires)) {
          store.startDialogue('桃太郎', t.lockedLines ?? ['まだ 準備ができていないようだ。'])
          return
        }
        this._runOnigashimaCutscene()
        break
      }
    }
  }

  /** イベント型ステージのクリア（収集完了・会話完了など）。 */
  _eventClear() {
    const q = this.def.quizKey ? quizzes[this.def.quizKey] : null
    this.stageStore.beginClear({
      explanationText: this.def.clearExplanation ?? q?.explanation,
      explanationTitle: this.def.clearTitle,
    })
  }

  /** 停泊中の船の波揺れ。 */
  _startBoatBob() {
    if (!this.boat) return
    this._boatBob = [
      gsap.to(this.boat.position, { y: '-=0.06', duration: 1.9, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
      gsap.to(this.boat.rotation, { z: 0.03, duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
    ]
  }

  _stopBoatBob() {
    for (const t of this._boatBob ?? []) t.kill()
    this._boatBob = null
    if (this.boat) this.boat.rotation.z = 0
  }

  /** カットシーン用: キャラを歩かせる（向き替え + walk アニメ + 移動）。 */
  async _scriptWalk(x, z, { y = null, speed = 3.4 } = {}) {
    const model = this.character.model
    const dx = x - model.position.x
    const dz = z - model.position.z
    const dist = Math.hypot(dx, dz)
    if (dist < 0.05) return
    let angle = Math.atan2(dx, dz)
    while (angle - model.rotation.y > Math.PI) angle -= Math.PI * 2
    while (angle - model.rotation.y < -Math.PI) angle += Math.PI * 2
    gsap.to(model.rotation, { y: angle, duration: 0.22, ease: 'power2.out' })
    this.character.playAnim('walk')
    await gsap
      .to(model.position, {
        x,
        z,
        ...(y !== null ? { y } : {}),
        duration: dist / speed,
        ease: 'power1.inOut',
      })
      .then()
    this.character.playAnim('idle')
  }

  /** カットシーン用: ぴょんと跳んで乗り移る（乗船・下船）。 */
  async _scriptHop(x, z, y, { height = 0.8, duration = 0.55 } = {}) {
    const model = this.character.model
    const audio = this.game.audio
    let angle = Math.atan2(x - model.position.x, z - model.position.z)
    while (angle - model.rotation.y > Math.PI) angle -= Math.PI * 2
    while (angle - model.rotation.y < -Math.PI) angle += Math.PI * 2
    gsap.to(model.rotation, { y: angle, duration: 0.18, ease: 'power2.out' })
    audio.sfx('jump')
    const startY = model.position.y
    const apex = Math.max(startY, y) + height
    const tl = gsap.timeline()
    tl.to(model.position, { x, z, duration, ease: 'power1.inOut' }, 0)
    tl.to(model.position, { y: apex, duration: duration * 0.5, ease: 'power2.out' }, 0)
    tl.to(model.position, { y, duration: duration * 0.5, ease: 'power2.in' }, duration * 0.5)
    await tl.then()
    audio.sfx('land')
    gsap.fromTo(
      model.scale,
      { x: 1.15, y: 0.85, z: 1.15 },
      { x: 1, y: 1, z: 1, duration: 0.28, ease: 'back.out(2.5)' },
    )
  }

  /** 4-1: 桟橋から船に乗り、鬼ヶ島に上陸して鬼退治し、港へ戻るカットシーン。 */
  async _runOnigashimaCutscene() {
    if (this._cutscenePlaying || this._cutsceneDone || !this.boat) return
    this._cutscenePlaying = true
    const input = this.game.input
    const audio = this.game.audio
    input.lock('cutscene')
    this.stageStore.prompt = null

    const boat = this.boat
    const char = this.character.model
    const pier = { x: boat.position.x, z: boat.position.z } // 船の停泊位置（海上）
    const landing = { x: 19.5, z: -27.4 } // 鬼ヶ島・砦の門の前の水際
    const ISLAND = { x: 22, z: -38 }

    // 1) 桟橋の見送りショット → 桃太郎が浜まで歩いて船へ飛び乗る
    this.rig.stopFollow()
    await this.rig.transitionTo(
      { position: [pier.x - 7, 4, pier.z + 9], look: [pier.x, 0.4, pier.z + 1] },
      { duration: 1.2 },
    )
    await this._scriptWalk(2.5, -12.3, {}) // 水際まで歩く
    this._stopBoatBob()
    const deckY = boat.position.y + this._boatDeckY
    await this._scriptHop(boat.position.x, boat.position.z, deckY)
    boat.attach(char) // 以後は船と一緒に動く
    this.character.playAnim('idle')

    // 2) 出航 → 航海（波に揺られる）
    audio.sfx('confirm')
    this.rig.startFollow(boat, { offset: [-6.5, 5.5, 10], lookOffset: [0, 0.8, 0], smooth: 1.1 })
    let heading = Math.atan2(landing.x - pier.x, landing.z - pier.z)
    const sail = gsap.timeline()
    sail.to(boat.rotation, { y: heading, duration: 1.2, ease: 'power2.inOut' })
    sail.to(boat.rotation, { z: 0.05, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: 5 }, '<')
    sail.to(boat.position, { x: landing.x - 3, z: landing.z + 4.5, duration: 5.5, ease: 'power1.inOut' }, '>-6.2')
    await sail.then()

    // 3) 鬼ヶ島の全景ショットに切り替え、見得を切ってから接岸
    this.rig.stopFollow()
    const wide = this.rig.transitionTo(
      { position: [ISLAND.x - 3, 8.5, ISLAND.z + 31], look: [ISLAND.x, 4.2, ISLAND.z] },
      { duration: 1.6 },
    )
    await new Promise((resolve) => {
      this.stageStore.startDialogue(
        'キジ',
        ['桃太郎様、見えました！　あれが【鬼ヶ島】です！\nみなさま、上陸の準備を！'],
        resolve,
      )
    })
    await wide
    await gsap
      .to(boat.position, { x: landing.x, z: landing.z, duration: 1.6, ease: 'power2.out' })
      .then()
    boat.rotation.z = 0

    // 4) 上陸 → 砦の門をくぐって中へ（全景ショットのまま）
    this.scene.attach(char)
    const shoreY = 0.35 // 磯の高さ（島の喫水線ぶんを含む）
    await this._scriptHop(landing.x + 1.3, landing.z - 1.2, shoreY)
    await this._scriptWalk(ISLAND.x, ISLAND.z + 9.6, { y: shoreY }) // 門の前へ
    await this._scriptWalk(ISLAND.x, ISLAND.z + 6.4, { y: shoreY, speed: 2.6 }) // 洞窟の口へ
    char.visible = false // 闇の中へ……

    // 5) 戦闘描写（島全体が見えるアングルのまま、音と揺れで見せる）
    await new Promise((r) => setTimeout(r, 500))
    const shake = gsap.timeline()
    for (let i = 0; i < 6; i++) {
      shake.to(this.camera.position, {
        x: `+=${i % 2 ? 0.35 : -0.35}`,
        y: `+=${i % 2 ? -0.2 : 0.2}`,
        duration: 0.07,
        ease: 'power1.inOut',
      })
    }
    shake.to(this.camera.position, { x: '+=0', y: '+=0', duration: 0.1 })
    audio.sfx('land')
    setTimeout(() => audio.sfx('land'), 250)
    setTimeout(() => audio.sfx('land'), 520)
    await shake.then()

    await new Promise((resolve) => {
      this.stageStore.startDialogue(
        '桃太郎',
        [
          'トアーッ！！　……ドカッ！　バキッ！',
          'よし……鬼を退治したぞ！\nおばあさんの届け物も、たしかに届けた！',
          'さあ、仲間の待つ港町へ帰ろう！',
        ],
        resolve,
      )
    })

    // 6) 洞窟から出てきて船へ戻る
    char.visible = true
    char.position.set(ISLAND.x, shoreY, ISLAND.z + 6.4)
    await this._scriptWalk(ISLAND.x, ISLAND.z + 9.6, { y: shoreY })
    await this._scriptWalk(landing.x + 1.3, landing.z - 1.2, { y: shoreY })
    await this._scriptHop(boat.position.x, boat.position.z, boat.position.y + this._boatDeckY)
    boat.attach(char)

    // 7) 帰航 → 桟橋で下船
    this.rig.startFollow(boat, { offset: [6.5, 5.5, 10], lookOffset: [0, 0.8, 0], smooth: 1.1 })
    heading = Math.atan2(pier.x - boat.position.x, pier.z - boat.position.z)
    const back = gsap.timeline()
    back.to(boat.rotation, { y: heading, duration: 1.2, ease: 'power2.inOut' })
    back.to(boat.rotation, { z: -0.04, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: 3 }, '<')
    back.to(boat.position, { x: pier.x, z: pier.z, duration: 5.5, ease: 'power1.inOut' }, '>-5.5')
    await back.then()
    boat.rotation.z = 0

    this.rig.stopFollow()
    this.scene.attach(char)
    await this._scriptHop(2.5, -12.2, this.groundY(2.5, -12.2) ?? 0.1)
    this.character.teleport(char.position.x, char.position.z, 0.2)
    this._startBoatBob()
    const p = char.position
    await this.rig.transitionTo(
      { position: [p.x, p.y + 8.2, p.z + 11.6], look: [p.x, p.y + 0.6, p.z] },
      { duration: 1.0 },
    )
    this.rig.startFollow(char, { offset: [0, 8.2, 11.6], lookOffset: [0, 0.6, 0] })

    input.unlock('cutscene')
    this._cutscenePlaying = false
    this._cutsceneDone = true
    this._eventClear()
  }

  _exit() {
    if (this.game.world !== this) return // 非アクティブ時は無視
    if (this.stageStore.uiOpen || this._cutscenePlaying) return
    if (this._exiting) return
    this._exiting = true
    this.game.audio.sfx('cancel')
    this.onExit()
  }

  /** クリア後（解説クローズ後）にストアから呼ばれる。
   *  @param {'next'|'hub'} target 次のステージへ進むか、ステージ選択へ戻るか */
  finishStage(target = 'next') {
    if (this._exiting) return
    this._exiting = true
    const next = this.def.clearReturn ?? '/content/1'
    this.onClear(target === 'hub' ? '/content/1' : next)
  }

  update(dt) {
    if (!this.character) return
    // UI が開いている間は入力を仕組みでロック（各画面の if 文に頼らない）
    const uiOpen = this.stageStore.uiOpen
    if (uiOpen !== this._uiLocked) {
      this._uiLocked = uiOpen
      if (uiOpen) this.game.input.lock('stage-ui')
      else this.game.input.unlock('stage-ui')
    }

    for (const m of this.mixers) m.update(dt)
    if (this._cutscenePlaying) {
      // カットシーン中は位置を GSAP が握るため、物理は止めてアニメだけ回す
      this.character.mixer.update(dt)
    } else {
      this.character.update(dt)
    }

    // 近接プロンプト
    const p = this.character.model.position
    let nearest = null
    let nearestD = Infinity
    for (const it of this.interactables) {
      const d = Math.hypot(p.x - it.x, p.z - it.z)
      if (d < it.radius && d < nearestD) {
        nearest = it
        nearestD = d
      }
    }
    if (this._cutscenePlaying) nearest = null
    if (nearest !== this._activeInteractable) {
      this._activeInteractable = nearest
      this.stageStore.prompt = nearest && !uiOpen ? { label: nearest.prompt } : null
    } else if (uiOpen && this.stageStore.prompt) {
      this.stageStore.prompt = null
    }

    this.rig.update()
  }

  dispose() {
    this._offBack?.()
    this._offInteract?.()
    if (this._uiLocked) this.game.input.unlock('stage-ui')
    this.game.input.unlock('stage-intro')
    this.game.input.unlock('cutscene')
  }
}
