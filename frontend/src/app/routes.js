// ルート台帳（URL 契約 — docs/non-regression-spec.md）。
// コンポーネントを含まない純データにして、整合性テストから直接検証できるようにする。
// ルーターは URL 同期のみを担い、WebGLRenderer の生成・破棄を伴わない（単一ランタイム原則）。
import { stages } from '@/content/stages.js'

export const routeTable = [
  { path: '/', name: 'hub' },
  { path: '/glossary', name: 'glossary' },
  // 旧 URL はリダイレクトで恒久維持（ブックマーク互換）
  { path: '/select-story', redirect: '/' },
  { path: '/content/:id', redirect: '/' },
  ...stages.map((s) => ({
    path: s.path,
    name: s.routeName,
    meta: { stageId: s.id },
  })),
]
