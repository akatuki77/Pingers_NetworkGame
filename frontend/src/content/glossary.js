// 用語集（C-8 増補済み）。relatedStageIds はステージ⇔用語の相互リンク用。
export const terms = [
  {
    id: 'packet',
    name: 'パケット (Packet)',
    description:
      'ネットワークを通じて転送されるデータの小さな単位。ヘッダー（宛先情報など）とペイロード（実際のデータ）で構成される。この物語の桃太郎は、届け物を運ぶパケットそのものだ。',
    relatedStageIds: [1],
  },
  {
    id: 'ip-address',
    name: 'IPアドレス (IP Address)',
    description:
      'ネットワーク上の機器を識別するためのインターネットプロトコル上の住所。通常、「192.168.1.1」のようにピリオドで区切られた4つの数字で表される。1-1 の村さがしで使った「論理的な住所」。',
    relatedStageIds: [1, 3],
  },
  {
    id: 'router',
    name: 'ルーター (Router)',
    description:
      'ネットワークにおいて、データを異なるネットワーク間で中継・転送するための機器やソフトウェアのこと。2-1 と 2-2 の「国境の門」がこれ。',
    relatedStageIds: [2, 3],
  },
  {
    id: 'routing-table',
    name: 'ルーティングテーブル (Routing Table)',
    description:
      'ルーターが持つ「宛先ネットワーク → 次に向かう門（ネクストホップ）」の対応表。2-1 の門番が見せてくれた経路表のこと。ルーターはこの表を引いてパケットの行き先を決める。',
    relatedStageIds: [2],
  },
  {
    id: 'next-hop',
    name: 'ネクストホップ (Next Hop)',
    description:
      'パケットを次に渡す「隣のルーター」のこと。最終目的地まで一気に届けるのではなく、経路表に書かれたネクストホップへ順々に渡していくのがネットワークの旅のしかた。',
    relatedStageIds: [2, 3],
  },
  {
    id: 'default-gateway',
    name: 'デフォルトゲートウェイ (Default Gateway)',
    description:
      '内部ネットワークと外部ネットワーク（インターネットなど）を接続するための出入り口となるルーターのこと。宛先が自分と同じネットワークにないパケットは、まずデフォルトゲートウェイ（最寄りのルーター）に送られる。',
    relatedStageIds: [3],
  },
  {
    id: 'subnet-mask',
    name: 'サブネットマスク／プレフィックス長',
    description:
      'IPアドレスのうち、どこまでが「ネットワーク部」でどこからが「ホスト部」かを示す境界のこと。「/24」は先頭 24 ビットがネットワーク部という意味で、「255.255.255.0」と同じ。192.168.10.x と 192.168.20.x が別のネットワークなのはこのため。',
    relatedStageIds: [3],
  },
  {
    id: 'mac-address',
    name: 'MACアドレス (MAC Address)',
    description:
      'ネットワーク機器（NIC＝ネットワークカード）に割り当てられた物理的な固有の識別番号。「00:1A:2B:3C:4D:5E」のように 16進数（0〜9 と A〜F で表す数）で書く。3-1 で仲間たちが教えてくれた識別番号。',
    relatedStageIds: [4, 5],
  },
  {
    id: 'switch',
    name: 'スイッチ (Switch)',
    description:
      'ネットワーク内で、特定の宛先MACアドレスを持つ機器にのみデータを転送する機器。全員にそのまま流してしまう「ハブ」という単純な機器とは異なり、無駄なトラフィックを減らすことができる。',
    relatedStageIds: [5, 7],
  },
  {
    id: 'mac-address-table',
    name: 'MACアドレステーブル',
    description:
      'スイッチが学習する「MACアドレス → ポート」の対応表。3-1 で作った仲間帳がこれ。この表があるから、スイッチは話したい相手にだけ正確にデータを届けられる。',
    relatedStageIds: [4, 5],
  },
  {
    id: 'unicast-broadcast',
    name: 'ユニキャスト／ブロードキャスト',
    description:
      '1対1で特定の相手にだけ送るのがユニキャスト、ネットワーク内の全員に送るのがブロードキャスト。3-2 の漁師の問題で学んだ、スイッチの賢い使い分け。',
    relatedStageIds: [5],
  },
  {
    id: 'lan-wan',
    name: 'LAN／WAN',
    description:
      'LAN は建物や部屋の中などの構内ネットワーク（港町の仲間たち）、WAN は遠く離れた場所どうしを結ぶ広域ネットワーク（鬼ヶ島への海路）。ふたつを組み合わせて、世界中へデータが届く。',
    relatedStageIds: [6],
  },
]
