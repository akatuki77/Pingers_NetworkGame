// vue-router は URL 同期のみを担当する。画面の実体はゲームランタイムのワールドであり、
// ルート遷移でレンダラやシーンを生成・破棄しない。
import { createRouter, createWebHistory } from 'vue-router'
import { routeTable } from './routes.js'

// ルートごとのオーバーレイ UI（Vue はオーバーレイ専用）。
const overlays = {
  hub: () => import('@/ui/overlays/HubOverlay.vue'),
  glossary: () => import('@/ui/overlays/GlossaryOverlay.vue'),
}

const StageOverlay = () => import('@/ui/overlays/StageOverlay.vue')
const EmptyOverlay = { render: () => null }

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: routeTable.map((r) => {
    if (r.redirect) return r
    const component = overlays[r.name] ?? (r.meta?.stageId ? StageOverlay : EmptyOverlay)
    return { ...r, component }
  }),
})
