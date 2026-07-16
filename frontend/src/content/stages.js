// stageId は DB の clear_records.stage_id と対応。絶対に変更禁止。
// routeName は router/index.js の name と一致させること。
export const stages = [
  {
    id: 1,
    routeName: 'Stage-1-1',
    path: '/Stage-1-1',
    title: '鍛冶の村へ',
    nextRoute: '/content/1',
    chapterId: '1',
  },
  {
    id: 2,
    routeName: 'Stage-2-1',
    path: '/Stage-2-1',
    title: '国境の門番',
    nextRoute: '/Stage-2-2',
    chapterId: '2',
  },
  {
    id: 3,
    routeName: 'Stage-2-2',
    path: '/Stage-2-2',
    title: '国境を越えて',
    nextRoute: '/content/1',
    chapterId: '2',
  },
  {
    id: 4,
    routeName: 'Stage-3-1',
    path: '/Stage-3-1',
    title: 'きびだんごを配ろう',
    nextRoute: '/Stage-3-2',
    chapterId: '3',
  },
  {
    id: 5,
    routeName: 'Stage-3-2',
    path: '/Stage-3-2',
    title: '仲間を誘おう',
    nextRoute: '/content/1',
    chapterId: '3',
  },
  {
    id: 6,
    routeName: 'Stage-4-1',
    path: '/Stage-4-1',
    title: '決戦！鬼ヶ島',
    nextRoute: '/Stage-4-2',
    chapterId: '4',
  },
  {
    id: 7,
    routeName: 'Stage-4-2',
    path: '/Stage-4-2',
    title: '冒険の終わり',
    nextRoute: null,
    chapterId: '4',
  },
];

export function getStageById(id) {
  return stages.find(s => s.id === id) ?? null;
}

export function getStageByRouteName(routeName) {
  return stages.find(s => s.routeName === routeName) ?? null;
}
