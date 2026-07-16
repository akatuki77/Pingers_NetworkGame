// 3D モデルアセットの台帳。docs/asset-refactoring-plan.md §2.1 の実測値を正とする。
//
// - path は public/ 直下からの絶対パス。実在は __tests__/models-integrity.test.js が検証する
// - usedBy はステージは stageId(DB 対応の数値)、それ以外の画面はルート name
// - nativeSize はモデル本来のバウンディングボックス [W, H, D](作り直し時の契約値。
//   許容誤差 ±5%。キャラクターは足元原点、背景は XZ 原点中心 ±12.8 も必須)
// - 全モデル GLB 統一済み(PR-AS4〜AS8。テクスチャは GLB に埋め込み)
export const models = [
  // === 背景(stage/) — 全て 25.6×25.6 フットプリント・原点中心 ===
  {
    id: 'background-village',
    path: '/models/stage/background_village.glb',
    format: 'glb',
    usedBy: [],
    nativeSize: [25.6, 5.2, 25.6],
    notes: '旧 1-1 地形。background-village-v2 に置き換え済み・未使用',
  },
  {
    id: 'background-village-v2',
    path: '/models/stage/background_village_v2.glb',
    format: 'glb',
    usedBy: [1],
    notes:
      'scripts/generate-village-stage.mjs で生成。スポーン→十字路→3つの村へ続く道網・' +
      '南西の池（水ボクセル焼き込み）・北西の高台・木々。村の位置は stages3d.js と同期。再生成可能',
  },
  {
    id: 'background-gate-1',
    path: '/models/stage/background_gate-1.glb',
    format: 'glb',
    usedBy: [2, 3],
    nativeSize: [25.6, 2.8, 25.6],
  },
  {
    id: 'background-hub',
    path: '/models/stage/background_hub.glb',
    format: 'glb',
    usedBy: ['hub'],
    nativeSize: [25.6, 2.56, 25.6],
    notes:
      'scripts/generate-hub-island.mjs で生成(1-1 の村テクスチャから抽出したパレットの草原+土の崖)。上面は y=0 の完全平面。再生成可能',
  },
  {
    id: 'background-gate-one-road',
    path: '/models/stage/background_gate_oneRoad.glb',
    format: 'glb',
    usedBy: [2, 3],
    nativeSize: [25.6, 3.4, 25.6],
    notes: 'min.y=6.1 の浮いた配置が正。接地させないこと',
  },
  {
    id: 'background-port-town',
    path: '/models/stage/background_portTown.glb',
    format: 'glb',
    usedBy: [4, 5, 6, 7],
    nativeSize: [25.6, 6.8, 25.6],
  },
  {
    id: 'background-onigashima',
    path: '/models/stage/background_onigashima.glb',
    format: 'glb',
    usedBy: [],
    nativeSize: [25.6, 9.5, 25.6],
    notes: '旧鬼ヶ島（109,664 頂点・4MB）。background-onigashima-v2 に置き換え済み・未使用',
  },
  {
    id: 'background-onigashima-v2',
    path: '/models/stage/background_onigashima_v2.glb',
    format: 'glb',
    usedBy: [6],
    nativeSize: [25.6, 11.3, 25.6],
    notes:
      'scripts/generate-onigashima.mjs で生成（ボクセル柱方式・固定シード・450KB）。' +
      '喫水線 = y=0、裾は y=-2 まで水中。南面（+Z）に洞窟の口・牙・怒り目・角・砦の門。再生成可能',
  },

  // === オブジェクト(object/) ===
  {
    id: 'village',
    path: '/models/object/village.glb',
    format: 'glb',
    usedBy: [],
    nativeSize: [6.9, 1.7, 5.4],
    notes: '旧共通村。村ごとの専用モデル（village_flower/smith/merchant）に置き換え済み・未使用',
  },
  {
    id: 'village-flower',
    path: '/models/object/village_flower.glb',
    format: 'glb',
    usedBy: [1],
    notes: 'scripts/generate-villages.mjs で生成。花壇と花のアーチ。原点=底面中心・正面=+Z。再生成可能',
  },
  {
    id: 'village-smith',
    path: '/models/object/village_smith.glb',
    format: 'glb',
    usedBy: [1],
    notes: 'scripts/generate-villages.mjs で生成。石屋根の鍛冶場・煙突・炉・金床・剣立て。再生成可能',
  },
  {
    id: 'village-merchant',
    path: '/models/object/village_merchant.glb',
    format: 'glb',
    usedBy: [1],
    notes: 'scripts/generate-villages.mjs で生成。紅白テントの屋台・木箱・樽。再生成可能',
  },
  {
    id: 'village-lake',
    path: '/models/object/village_lake.glb',
    format: 'glb',
    usedBy: [],
    nativeSize: [23.3, 1.1, 22.2],
    notes:
      'Blender 製・青単色・スペキュラあり。読み込み側で specular 0x808080 / shininess 250 を指定して旧 MTL(Ks 0.5, Ns 250)を再現する',
  },
  {
    id: 'sekisyo',
    path: '/models/object/sekisyo-0.glb',
    format: 'glb',
    usedBy: [2, 3],
    nativeSize: [12.8, 8.1, 6.2],
  },
  {
    id: 'port-town-object',
    path: '/models/object/background_portTown_object.glb',
    format: 'glb',
    usedBy: [4, 5, 6, 7],
    nativeSize: [23.8, 3.1, 19.4],
    notes: 'マルチマテリアル(portTown_box1/box2/boat の 3 テクスチャ)',
  },
  {
    id: 'onigashima-object',
    path: '/models/object/background_onigashima_object.glb',
    format: 'glb',
    usedBy: [4, 5, 6, 7],
    nativeSize: [25.7, 0.55, 36.6],
  },
  {
    id: 'flower',
    path: '/models/object/flower.glb',
    format: 'glb',
    usedBy: [1],
    notes: '広範囲に散る花畑メッシュ。StageOne では地面下に埋めて一部だけ見せている',
  },
  {
    id: 'hub-flower',
    path: '/models/object/hub_flower.glb',
    format: 'glb',
    usedBy: ['hub'],
    nativeSize: [0.7, 0.85, 0.7],
    notes:
      'scripts/generate-hub-island.mjs で生成(ボクセル調の一輪花)。花びらは hubFlowerPetals ノードに分離しており、clone ごとにマテリアルを差し替えて色違いを作る。原点=底面中心',
  },
  {
    id: 'hub-rock',
    path: '/models/object/hub_rock.glb',
    format: 'glb',
    usedBy: ['hub'],
    nativeSize: [2.2, 1.5, 1.6],
    notes:
      'scripts/generate-hub-island.mjs で生成(1-1 の岩の白灰をライティング逆算した 2 色のボクセル調)。原点=底面中心。scale/rotation を変えて複数 clone',
  },

  // === キャラクター(character/) — 全て足元原点 ===
  {
    id: 'momotaro',
    path: '/models/character/momotaro.glb',
    format: 'glb',
    usedBy: [1, 2, 3, 4, 5, 7, 'hub'],
    notes: 'アニメクリップ名 idle / walk 完全一致必須(useCharacter.js が参照)',
  },
  {
    id: 'momo-boat',
    path: '/models/character/momo_boat.glb',
    format: 'glb',
    usedBy: [],
    nativeSize: [2.4, 3.0, 2.7],
    notes:
      '桃太郎+船の一体モデル。方針変更（プレイヤー本人が港の小舟に乗り込む演出）により未使用',
  },
  {
    id: 'dog',
    path: '/models/character/dog.glb',
    format: 'glb',
    usedBy: [4, 5, 7, 'hub'],
    nativeSize: [0.5, 1.4, 1.3],
  },
  {
    id: 'monkey',
    path: '/models/character/monkey.glb',
    format: 'glb',
    usedBy: [4, 5, 7, 'hub'],
    nativeSize: [0.9, 1.2, 1.0],
  },
  {
    id: 'pheasant',
    path: '/models/character/pheasant.glb',
    format: 'glb',
    usedBy: [4, 5, 7, 'hub'],
    nativeSize: [0.8, 1.8, 1.7],
  },
  {
    id: 'fisherman',
    path: '/models/character/fisherman.glb',
    format: 'glb',
    usedBy: [5, 7],
    nativeSize: [1.9, 2.3, 2.2],
  },
  {
    id: 'gatekeeper',
    path: '/models/character/gatekeeper.glb',
    format: 'glb',
    usedBy: [2, 3],
    nativeSize: [2.2, 2.6, 2.0],
  },

  // === 画面 UI(title/) ===
  // 旧 select/(book, book-momo, opened_book)は U-6 のハブ統合で退役・削除済み
  {
    id: 'game-title',
    path: '/models/title/GameTitle-v2.glb',
    format: 'glb',
    usedBy: ['hub'],
    nativeSize: [17.1, 6.6, 0.8],
  },
];
