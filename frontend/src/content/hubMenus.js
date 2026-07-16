// ハブワールドのセレクトプレート定義（データ駆動 — 計画書 §2.3.2）。
// position は島ローカルの [x, z]。中央スポーン(0,0)から半径 4 はプレート禁止域。
import { stages } from './stages.js'
import { storyContent } from './stories.js'

// stageId → 小章 summary の索引
const subChapters = storyContent['1'].chapter.flatMap((c) => c.subChapters)
const summaryByStageId = Object.fromEntries(subChapters.map((s) => [s.stageId, s]))

// L2 の配置: 奥列 4 枚 (z=-6) + 手前列 3 枚 (z=+5)
const STAGE_POSITIONS = [
  [-9, -6],
  [-3, -6],
  [3, -6],
  [9, -6],
  [-6, 5],
  [0, 5],
  [6, 5],
]

export const hubLevels = {
  'story-select': {
    title: 'ものがたりをえらぶ',
    items: [
      {
        id: 'momotaro',
        label: 'ももたろう',
        summary:
          '桃から生まれた桃太郎は、おばあさんの届け物を運ぶ「パケット」。\nネットワークの世界を旅して、鬼ヶ島まで届け物を運びきろう！',
        to: { level: 'stage-select' },
        position: [-7, -6], // 最初の物語なので左端（読み順の起点）
      },
      { id: 'coming-1', label: 'じゅんびちゅう', locked: true, position: [0, -6] },
      { id: 'coming-2', label: 'じゅんびちゅう', locked: true, position: [7, -6] },
      {
        id: 'glossary',
        label: 'ようごしゅう',
        summary: '旅で出会ったネットワークのことばを調べられるよ。',
        to: { route: 'glossary' },
        position: [10, 9],
      },
    ],
  },
  'stage-select': {
    title: 'ステージをえらぶ',
    items: [
      ...stages.map((s, i) => {
        const sub = summaryByStageId[s.id]
        return {
          id: `stage-${sub.id}`,
          label: `${sub.id} ${s.title}`,
          summary: sub.summary,
          to: { route: s.routeName },
          stageId: s.id,
          position: STAGE_POSITIONS[i],
        }
      }),
      { id: 'back', label: 'もどる', to: { level: 'story-select' }, position: [-10, 9] },
    ],
  },
}
