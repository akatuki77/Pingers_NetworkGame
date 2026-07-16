// ステージの 3D 定義（データ駆動 — ステージ追加で Vue ファイルを複製しない）。
// キーは stages.js の routeName。terrain は地形 GLB、spawn はキャラ初期位置。
// M2 時点では 1-1 の最小定義のみ。M3 以降で NPC・クイズ・演出を拡張する。
export const stageWorlds = {
  'Stage-1-1': {
    terrain: '/models/stage/background_village_v2.glb',
    bounds: 11.8,
    spawn: { x: 0.5, z: 9.5, angle: Math.PI },
    // 入場時のカメラ紹介ショット（俯瞰 → キャラ追従へ）
    intro: { position: [0, 30, 26], look: [0, 0, 0] },
    bgm: 'stage',
    objective:
      'おばあさんから「届け物は 鍛冶の村 へ」と頼まれた。\n' +
      'でも配達依頼書（パケットのヘッダー）の宛先は まだ空欄のままだ。\n\n' +
      '3つの村をたずねて かんばんをしらべ、\n' +
      '「鍛冶の村」の IPアドレス を聞き出して宛先に書きこもう！',
    waterLevel: -0.2, // 池の水面（地形に焼き込み済み）より下へは進入不可

    // 探索対象（村と看板）。position は地形ローカル。
    villages: [
      {
        id: 'flower-village',
        name: '花の村',
        model: '/models/object/village_flower.glb',
        position: [-7.8, 0.8],
        signPosition: [-5.0, 1.0],
        signLines: ['花の村'],
        dialogue: [
          'ここは「花の村」。\nIPアドレスは 192.168.1.11 じゃ。',
          'きれいな花ばたけが じまんの村なんじゃが……\nかじやは おらんのう。',
        ],
      },
      {
        id: 'smith-village',
        name: '鍛冶の村',
        model: '/models/object/village_smith.glb',
        position: [7.2, -7.4],
        signPosition: [4.6, -5.4],
        signLines: ['鍛冶の村'],
        dialogue: [
          'ここは「鍛冶の村」。\nIPアドレスは 192.168.1.20 じゃ。',
          'カンカン カンカン……　刀をうつ音がきこえる。\nここが とどけさきだ！',
          '配達依頼書（ヘッダー）の あてさき に\nこの村の IPアドレス を書きこもう！',
        ],
      },
      {
        id: 'merchant-village',
        name: '商人の村',
        model: '/models/object/village_merchant.glb',
        position: [7.2, 5.4],
        signPosition: [4.6, 4.6],
        signLines: ['商人の村'],
        dialogue: [
          'ここは「商人の村」。\nIPアドレスは 192.168.1.30 じゃ。',
          'ほしいものは なんでもそろう にぎやかな村じゃ。\nかたな？ それは かじの村に きくとよい。',
        ],
      },
    ],
    quizKey: 'stage-1-1',
    clearReturn: '/content/1', // 非回帰仕様: 解説クローズで /content/1（→ / へリダイレクト）
  },
  'Stage-2-1': {
    terrain: '/models/stage/background_gate-1.glb',
    bounds: 11.8,
    spawn: { x: 0, z: 9.5, angle: Math.PI },
    intro: { position: [0, 30, 26], look: [0, 0, 0] },
    bgm: 'stage',
    objective:
      '港町へ行くには、目の前の関所——国境の門（ルーター）を\n越えなければならない。\n\n' +
      '門番に話しかけて、次に進むべき道を教えてもらおう！',
    objects: [
      { model: '/models/object/sekisyo-0.glb', position: [0, -6], scale: 0.9 },
    ],
    npcs: [
      {
        id: 'gatekeeper',
        name: '門番',
        model: '/models/character/gatekeeper.glb',
        position: [1.6, -2.2],
        angle: -0.1, // 南（プレイヤー側 +z）を向く
        prompt: 'はなす',
        interaction: {
          type: 'dialogue',
          lines: [
            'とまれい！　ここは国境の門A。\nわしは この門を守る 門番じゃ。',
            'ほう、港町へ行きたいのか。\nこの門、つまり「ルーター」は、\n自分の【経路表（ルーティングテーブル）】を持っておる。',
            'どの国（ネットワーク）へは どの門へ進めばよいか、\nぜんぶ この表に書いてあるのじゃ。見せてやろう。',
          ],
          panel: {
            title: '門番の経路表（ルーティングテーブル）',
            blocks: [
              { type: 'paragraph', text: 'わしの経路表じゃ。宛先ごとに「次に向かう門（ネクストホップ）」が書いてある。' },
              {
                type: 'table',
                headers: ['宛先ネットワーク', '次に向かう門（ネクストホップ）'],
                rows: [
                  ['192.168.20.0/24（港町）', '国境の門 C（192.168.20.1）'],
                  ['192.168.30.0/24（山岳の国）', '国境の門 D（192.168.30.1）'],
                ],
              },
              { type: 'paragraph', text: '港町へ行きたいなら、経路表のとおり【門C】へ向かうのじゃ。忘れるでないぞ！' },
            ],
          },
          clears: true,
        },
      },
    ],
    clearExplanation:
      '門番（ルーター）から、次に進むべき道を教えてもらった！\n\n' +
      'ルーターは「経路表（ルーティングテーブル）」を持っていて、\n' +
      '宛先のネットワークごとに「次に向かう門（ネクストホップ）」を知っている。\n\n' +
      '港町へ続く道は【門C】。さっそく国境を越えよう！',
    clearTitle: 'みちが わかった！',
    clearReturn: '/Stage-2-2', // 非回帰仕様: クリア後は 2-2 へ
  },
  'Stage-2-2': {
    terrain: '/models/stage/background_gate-1.glb',
    bounds: 11.8,
    spawn: { x: 0, z: 9.5, angle: Math.PI },
    intro: { position: [0, 30, 26], look: [0, 0, 0] },
    bgm: 'stage',
    objective:
      '2-1 で門番に教えてもらった経路表によると、\n港町（192.168.20.0/24）へ続くのは【門C】だ。\n\n' +
      '3つの門のかんばんを調べて、港町へ続く門を見つけ、\nその門を くぐって国境を越えよう！',
    quizButton: false, // このステージは依頼書ではなく、正しい門を通ることでクリアする
    objects: [
      { model: '/models/object/sekisyo-0.glb', position: [-8.2, -7], scale: 0.55 },
      { model: '/models/object/sekisyo-0.glb', position: [0, -7], scale: 0.55 },
      { model: '/models/object/sekisyo-0.glb', position: [8.2, -7], scale: 0.55 },
    ],
    villages: [
      {
        id: 'gate-b',
        name: '門B',
        position: [-8.2, -7],
        model: false,
        signPosition: [-8.2, -3.6],
        labelPosition: [-8.2, -3.0],
        labelY: 1.7,
        labelSize: 0.8,
        prompt: 'ゆきさきを しらべる',
        signLines: ['国境の門B', '192.168.10.1', 'ゆきさき: 花の国'],
        dialogue: [
          'ここは「国境の門B」。IPアドレスは 192.168.10.1。\nゆきさきは【花の国】と書いてある。',
          '港町へは 行けないようだ……。',
        ],
      },
      {
        id: 'gate-c',
        name: '門C',
        position: [0, -7],
        model: false,
        signPosition: [0, -3.6],
        labelPosition: [0, -3.0],
        labelY: 1.7,
        labelSize: 0.8,
        prompt: 'ゆきさきを しらべる',
        signLines: ['国境の門C', '192.168.20.1', 'ゆきさき: 港町'],
        dialogue: [
          'ここは「国境の門C」。IPアドレスは 192.168.20.1。\nゆきさきは【港町】！',
          '経路表のとおりだ。この門のIPアドレスを\n配達依頼書に書きこもう！',
        ],
      },
      {
        id: 'gate-d',
        name: '門D',
        position: [8.2, -7],
        model: false,
        signPosition: [8.2, -3.6],
        labelPosition: [8.2, -3.0],
        labelY: 1.7,
        labelSize: 0.8,
        prompt: 'ゆきさきを しらべる',
        signLines: ['国境の門D', '192.168.30.1', 'ゆきさき: 山岳の国'],
        dialogue: [
          'ここは「国境の門D」。IPアドレスは 192.168.30.1。\nゆきさきは【山岳の国】と書いてある。',
          '港町へは 行けないようだ……。',
        ],
      },
    ],
    zones: [
      {
        id: 'pass-b',
        position: [-8.2, -5.2],
        radius: 1.8,
        prompt: '門をとおる',
        interaction: {
          type: 'dialogue',
          lines: [
            '門番「この門のゆきさきは【花の国】じゃ。\n港町へは 行けんぞ」',
            '経路表を思い出そう。港町（192.168.20.0/24）へ続く門は……',
          ],
        },
      },
      {
        id: 'pass-c',
        position: [0, -5.2],
        radius: 1.8,
        prompt: '門をとおる',
        interaction: {
          type: 'dialogue',
          lines: [
            '門番「ゆきさきは【港町】。経路表のとおりじゃな。\nようこそ、国境の門C（192.168.20.1）へ！」',
            '正しいネクストホップを選べた！\nいざ、国境を越えて港町へ！',
          ],
          clears: true,
        },
      },
      {
        id: 'pass-d',
        position: [8.2, -5.2],
        radius: 1.8,
        prompt: '門をとおる',
        interaction: {
          type: 'dialogue',
          lines: [
            '門番「この門のゆきさきは【山岳の国】じゃ。\n港町へは 行けんぞ」',
            '経路表を思い出そう。港町（192.168.20.0/24）へ続く門は……',
          ],
        },
      },
    ],
    quizKey: 'stage-2-2', // 解説文の参照用（依頼書 UI は quizButton: false で出さない）
    clearTitle: '国境を越えた！',
    clearReturn: '/content/1',
  },
  'Stage-3-1': {
    terrain: '/models/stage/background_portTown.glb',
    bounds: 11.8,
    spawn: { x: 0, z: 9.5, angle: Math.PI },
    intro: { position: [0, 30, 26], look: [0, 0, 0] },
    bgm: 'stage',
    objective:
      '港町に着いた！　鬼退治を手伝ってくれる仲間をさがそう。\n\n' +
      '町にいる 3 匹の動物（イヌ・サル・キジ）に きびだんご を配って、\n' +
      'この町の仲間たち（LAN のホスト）と顔見知りになろう！',
    sea: true,
    objects: [{ model: '/models/object/background_portTown_object.glb', position: [0, 0], groundSnap: false }],
    collect: { label: 'きびだんご をわたした', total: 3 },
    npcs: [
      {
        id: 'dog',
        name: 'イヌ',
        model: '/models/character/dog.glb',
        position: [-6.5, 2.5],
        angle: 0.8,
        prompt: 'きびだんごを わたす',
        interaction: {
          type: 'collect',
          lines: [
            'きびだんご ありがとうワン！\nよし、鬼退治には オイラもついていくワン！',
            'オイラの識別番号（MACアドレス）は\n【AA:BB:CC:00:00:01】。\n仲間帳に書いておいてくれよな！',
          ],
          repeatLine: 'もう きびだんごは もらったワン！\nほかの仲間にも 配ってやってくれ！',
        },
      },
      {
        id: 'monkey',
        name: 'サル',
        model: '/models/character/monkey.glb',
        position: [5.5, -3.5],
        angle: -0.6,
        prompt: 'きびだんごを わたす',
        interaction: {
          type: 'collect',
          lines: [
            'ウキッ！　うまい きびだんごだ！\n鬼退治、オイラも行くッキ！',
            'オイラの識別番号（MACアドレス）は\n【AA:BB:CC:00:00:02】だッキ。\nちゃんと おぼえておいてくれよ！',
          ],
          repeatLine: 'もう もらったッキ！\nはやく みんなに配るッキ！',
        },
      },
      {
        id: 'pheasant',
        name: 'キジ',
        model: '/models/character/pheasant.glb',
        position: [3.5, 6.5],
        angle: -2.2,
        prompt: 'きびだんごを わたす',
        interaction: {
          type: 'collect',
          lines: [
            'きびだんご、いただきます！\n鬼退治には わたくしの翼が お役に立ちましょう。',
            'わたくしの識別番号（MACアドレス）は\n【AA:BB:CC:00:00:03】です。\nお見知りおきを！',
          ],
          repeatLine: 'きびだんごは もう いただきました。\nほかの方へ どうぞ！',
        },
      },
    ],
    clearExplanation:
      '仲間帳（MACアドレステーブル）が完成した！\n\n' +
      'イヌ:  AA:BB:CC:00:00:01\nサル: AA:BB:CC:00:00:02\nキジ: AA:BB:CC:00:00:03\n\n' +
      'MACアドレスは、機器（NIC）にひとつずつ割り当てられた固有の番号。\n' +
      '16進数で 6 つに区切って書く「物理的な住所」だ。\n\n' +
      'これで 誰がどこにいるか、正確にわかるぞ。\n次は 鬼ヶ島へわたる 船をさがそう！',
    clearTitle: 'なかまが そろった！',
    clearReturn: '/Stage-3-2',
  },
  'Stage-3-2': {
    terrain: '/models/stage/background_portTown.glb',
    bounds: 11.8,
    spawn: { x: 0, z: 9.5, angle: Math.PI },
    intro: { position: [0, 30, 26], look: [0, 0, 0] },
    bgm: 'stage',
    objective:
      '鬼ヶ島まで行くには、海をわたる船がいる。\n\n' +
      '船場にいる漁師が「問題に正解したら船を貸してやる」と\n言っているらしい。話を聞きに行こう！',
    sea: true,
    objects: [{ model: '/models/object/background_portTown_object.glb', position: [0, 0], groundSnap: false }],
    npcs: [
      {
        id: 'dog',
        name: 'イヌ',
        model: '/models/character/dog.glb',
        position: [-6.5, 2.5],
        angle: 0.8,
        prompt: 'はなす',
        interaction: {
          type: 'dialogue',
          lines: ['漁師さんは 船場にいるワン！\n北の桟橋（さんばし）を さがすワン！'],
        },
      },
      {
        id: 'fisherman',
        name: '漁師',
        model: '/models/character/fisherman.glb',
        position: [4.5, -9.5],
        angle: -0.2, // スポーン方向（南）を向く
        prompt: 'はなす',
        interaction: {
          type: 'choiceQuiz',
          intro: [
            'おう、桃太郎か。船を借りたいんだってな。\n海の男は 連絡が命。ひとつ 問題を出すぞ。',
            'ネットワークの世界にも【スイッチ】っていう\n賢い仕分け役がいるらしいな。',
          ],
          quizTitle: '漁師の もんだい',
        },
      },
    ],
    quizKey: 'stage-3-2',
    clearReturn: '/content/1',
  },
  'Stage-4-1': {
    terrain: '/models/stage/background_portTown.glb',
    bounds: 11.8,
    spawn: { x: 0, z: 9.5, angle: Math.PI },
    intro: { position: [0, 30, 26], look: [0, 0, 0] },
    bgm: 'stage',
    objective:
      '仲間との絆、漁師との約束。すべてが そろった！\n\n' +
      '鬼ヶ島（宛先ホスト）は こことは別のネットワークの先だ。\n' +
      '海路（WAN）をわたって、届け物を運びきろう！\n\n' +
      'まずは 船場の漁師に あいさつして、\n船を出してもらおう！',
    sea: true,
    objects: [{ model: '/models/object/background_portTown_object.glb', position: [0, 0], groundSnap: false }],
    cutscene: 'onigashima',
    npcs: [
      {
        id: 'fisherman',
        name: '漁師',
        model: '/models/character/fisherman.glb',
        position: [4.5, -9.5],
        angle: -0.2, // スポーン方向（南）を向く（3-2 と同じ場所）
        prompt: 'はなす',
        interaction: {
          type: 'dialogue',
          lines: [
            'おう、桃太郎！　いよいよ 鬼ヶ島へ出発だな。',
            '約束どおり、わしの船を貸してやる。\n桟橋（さんばし）の先に とめてあるぞ。',
            '鬼ヶ島は この海のずっと先——別のネットワークの先だ。\n海路（WAN）をわたって、届け物を運びきってこい！',
          ],
          flag: 'boat-unlocked', // 会話後に乗船できるようになる
        },
      },
    ],
    // 桟橋の先の乗船ゾーン（モデルなしのインタラクション）
    zones: [
      {
        id: 'board',
        position: [2.5, -11.8],
        radius: 2.2,
        prompt: 'ふねに のる',
        interaction: {
          type: 'cutscene',
          requires: 'boat-unlocked',
          lockedLines: ['勝手に船を出すわけにはいかない。\nまずは 漁師さんに あいさつをしよう。'],
        },
      },
    ],
    clearExplanation:
      '見事、鬼を退治した！　届け物は 宛先に到達した！\n\n' +
      '送信元（おばあさんの家）から 宛先（鬼ヶ島）まで——\n' +
      '村をたずね、国境の門（ルーター）を乗りつぎ、\n仲間（LAN のホスト）と協力して、海路（WAN）をわたった。\n\n' +
      'これが【エンドツーエンド通信】の完成だ！',
    clearTitle: 'とどけものが とどいた！',
    clearReturn: '/Stage-4-2',
  },
  'Stage-4-2': {
    terrain: '/models/stage/background_portTown.glb',
    bounds: 11.8,
    spawn: { x: 0, z: 9.5, angle: Math.PI },
    intro: { position: [0, 30, 26], look: [0, 0, 0] },
    bgm: 'ending',
    objective:
      '鬼退治をおえて 港町にもどると、\n君の帰りを祝う宴がはじまっている。\n\n' +
      '仲間たちが、旅の思い出をかけた「復習クイズ」を\n用意しているようだ。3 匹全員の問題に答えよう！',
    sea: true,
    objects: [{ model: '/models/object/background_portTown_object.glb', position: [0, 0], groundSnap: false }],
    collect: { label: 'クイズに せいかい', total: 3 },
    npcs: [
      {
        id: 'dog',
        name: 'イヌ',
        model: '/models/character/dog.glb',
        position: [-6.5, 2.5],
        angle: 0.8,
        prompt: 'もんだいに こたえる',
        interaction: { type: 'reviewQuiz', index: 0 },
      },
      {
        id: 'pheasant',
        name: 'キジ',
        model: '/models/character/pheasant.glb',
        position: [3.5, 6.5],
        angle: -2.2,
        prompt: 'もんだいに こたえる',
        interaction: { type: 'reviewQuiz', index: 1 },
      },
      {
        id: 'monkey',
        name: 'サル',
        model: '/models/character/monkey.glb',
        position: [5.5, -3.5],
        angle: -0.6,
        prompt: 'もんだいに こたえる',
        interaction: { type: 'reviewQuiz', index: 2 },
      },
    ],
    quizKey: 'stage-4-2',
    clearExplanation:
      '全問正解！　これで 冒険はおしまい。\n\n' +
      '君はこの旅で、パケット・IPアドレス・ルーター・\nスイッチ・MACアドレス を体験した。\n\n' +
      '手紙に住所がいるように、通信には IPアドレスがいる。\n' +
      'IPアドレスで「どのネットワークの どのホストか」を特定し、\n' +
      'MACアドレスで「目の前の機器」を特定する。\n\n' +
      '用語集でふりかえって、次は サブネットや DNS の世界へ進もう！',
    clearTitle: 'ぼうけんの おわり',
    clearReturn: '/content/1',
  },
}
