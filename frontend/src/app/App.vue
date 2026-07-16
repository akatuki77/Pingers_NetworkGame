<script setup>
// アプリの指揮者: ゲームランタイムを 1 度だけ生成し、ルート変更に応じてワールドを
// 切り替える（レンダラは破棄しない）。切替はベール（暗転）で覆い、白画面を見せない。
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createGame } from '@/runtime/Game.js'
import { HubWorld } from '@/world/HubWorld.js'
import { StageWorld } from '@/world/StageWorld.js'
import { useHubStore } from '@/app/stores/hub.js'
import { useSessionStore } from '@/app/stores/session.js'
import { useProgressStore } from '@/app/stores/progress.js'
import { useStageStore } from '@/app/stores/stage.js'
import { gsap } from '@/runtime/tween.js'

const gameHost = ref(null)
const veilEl = ref(null)
const veilTitle = ref('')
const veilTip = ref('')

// ローディング中に見せるひとくち豆知識
const TIPS = [
  'IPアドレスは 32ビットの数字。8ビットずつ 4つに区切って書くよ。',
  'ルーターは IPアドレスを、スイッチは MACアドレスを見て仕分けるよ。',
  'パケットは「ヘッダー（宛先）」と「ペイロード（中身）」でできているよ。',
  '「/24」は 先頭24ビットがネットワーク部、という意味だよ。',
  'MACアドレスは 機器にひとつずつ割り当てられた固有の番号だよ。',
  'スイッチの仲間帳は「MACアドレステーブル」と呼ばれるよ。',
  'ダッシュ（Shift）で 世界を かけまわろう！',
]
const hubStore = useHubStore()
const session = useSessionStore()
const progress = useProgressStore()
const stageStore = useStageStore()
const route = useRoute()
const router = useRouter()

let game = null
let hubWorld = null
let stageWorld = null

function veilIn(duration = 0.45) {
  hubStore.veil = true
  veilEl.value.style.display = 'flex'
  return gsap.to(veilEl.value, { opacity: 1, duration, ease: 'power2.out' }).then()
}

async function veilOut(duration = 0.6) {
  await gsap.to(veilEl.value, { opacity: 0, duration, ease: 'power2.out' }).then()
  veilEl.value.style.display = 'none'
  hubStore.veil = false
  veilTitle.value = ''
  veilTip.value = ''
}

import { getStageByRouteName } from '@/content/stages.js'
function routeTableTitle(routeName) {
  const s = getStageByRouteName(routeName)
  return s ? `${routeName.replace('Stage-', '')}　${s.title}` : ''
}

/** ハブのプレートやステージからの画面遷移依頼。 */
async function onNavigate(routeName) {
  if (routeName === 'glossary') {
    router.push('/glossary')
    return
  }
  await veilIn()
  sessionStorage.setItem('hub_state', 'played')
  router.push({ name: routeName })
}

async function showHub() {
  const returning = sessionStorage.getItem('hub_state') === 'played'
  if (!hubWorld) {
    hubWorld = new HubWorld(game, { hubStore, progressStore: progress, onNavigate })
    await hubWorld.ready
  }
  // 用語集オーバーレイからの復帰など、ワールドがハブのまま戻ってきた場合は状態を保ち、
  // プレート盤面を再有効化する（乗ったままのプレートは一度離れるまで再発火しない）
  if (game.world === hubWorld && hubStore.phase !== 'boot') {
    hubWorld.resume()
    return
  }
  if (stageWorld) {
    stageWorld.dispose()
    stageWorld = null
  }
  game.setWorld(hubWorld)
  hubWorld.suspend()
  if (returning) {
    const entering = hubWorld.enterSelectDirect()
    await veilOut()
    await entering
  } else {
    hubWorld.enterTitle()
    await veilOut(0.8)
  }
}

async function showStage(routeName) {
  // ベール上にステージ名と豆知識（ローディング演出）
  const stageInfo = routeTableTitle(routeName)
  veilTitle.value = stageInfo
  veilTip.value = TIPS[Math.floor(Math.random() * TIPS.length)]
  stageWorld?.dispose()
  stageWorld = new StageWorld(game, routeName, {
    stageStore,
    onExit: async () => {
      await veilIn()
      sessionStorage.setItem('hub_state', 'played')
      router.push('/')
    },
    onClear: async (returnPath) => {
      await veilIn()
      sessionStorage.setItem('hub_state', 'played')
      router.push(returnPath) // /content/1 → リダイレクトで / に着地（URL 契約の維持）
    },
  })
  await stageWorld.ready
  game.setWorld(stageWorld)
  game.input.unlock('hub-navigate') // ハブ出発時のロックを解除（ステージ操作を有効に）
  const intro = stageWorld.intro() // ベールが開くのと同時に導入カメラが動き出す
  await veilOut(0.7)
  await intro
}

async function syncWorld(name) {
  if (!game) return
  if (name === 'hub') await showHub()
  else if (route.meta.stageId) await showStage(name)
  // glossary はハブの上のオーバーレイなのでワールド切替なし
}

watch(
  () => route.name,
  (name) => {
    syncWorld(name)
  },
)

onMounted(async () => {
  game = createGame(gameHost.value)
  if (import.meta.env.DEV) window.__game = game // 開発時のデバッグ用

  // 地面プレート・看板は CanvasTexture に文字を焼き込むため、フォントを先に読み切る
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load("700 20px 'Zen Maru Gothic'"),
        document.fonts.load("500 20px 'Zen Maru Gothic'"),
      ]),
      new Promise((resolve) => setTimeout(resolve, 3000)), // 読めなくても起動は止めない
    ])
  } catch {
    /* noop */
  }

  // ログイン状態の復元とクリア記録の取得
  if (session.isLoggedIn) progress.fetchRecords(session.user.userId)

  await router.isReady()
  if (route.name === 'glossary') {
    // 用語集への直リンク: 背後にハブを敷く
    await showHub()
  } else {
    await syncWorld(route.name)
  }
})
</script>

<template>
  <div class="app-root">
    <div ref="gameHost" class="game-host"></div>
    <div class="ui-root">
      <RouterView />
    </div>
    <div class="vignette"></div>
    <div ref="veilEl" class="veil">
      <div v-if="veilTitle" class="veil-content">
        <p class="veil-title">{{ veilTitle }}</p>
        <p class="veil-tip">💡 {{ veilTip }}</p>
      </div>
    </div>
  </div>
</template>

<style>
.app-root {
  position: fixed;
  inset: 0;
  overflow: hidden;
}
.game-host {
  position: absolute;
  inset: 0;
}
.game-host canvas {
  display: block;
  width: 100%;
  height: 100%;
}
.ui-root {
  position: absolute;
  inset: 0;
  pointer-events: none; /* 個々の UI 部品側で pointer-events: auto を指定する */
}
.vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(ellipse 100% 100% at 50% 45%, transparent 62%, rgba(20, 16, 28, 0.26) 100%);
}
.veil {
  position: absolute;
  inset: 0;
  background: var(--color-veil, #1c2a38);
  opacity: 1;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}
.veil-content {
  text-align: center;
  color: #f8efdd;
}
.veil-title {
  font-size: 30px;
  letter-spacing: 0.1em;
  margin-bottom: 16px;
}
.veil-tip {
  font-size: 15px;
  color: rgba(248, 239, 221, 0.75);
}
</style>
