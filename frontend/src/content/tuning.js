// 手触りのチューニング値。すべてデータ化し、コードに数値を埋め込まない
// （docs/rebuild-policy.md §4.1: パラメータはデータファイルで調整可能に）。
export const CHARACTER = {
  // キャラは世界に対して小さく（1.6 → 約 0.96）。ステージの相対的な広さ・
  // 建物のスケール感を出すための全体方針（速度・ジャンプも比例調整）
  scale: 0.6,
  walkSpeed: 3.2, // 通常移動の最高速 (unit/s)
  dashSpeed: 5.6, // ダッシュの最高速
  accel: 22, // 加速 (unit/s^2)
  decel: 20, // 減速（入力なし時）
  turnSmooth: 0.16, // 向き替えのスムージング秒
  jumpSpeed: 6.2, // ジャンプ初速 (unit/s)
  gravity: 24, // 重力 (unit/s^2)
  stepUp: 0.5, // 歩いて登れる段差の上限（これ以上は壁扱い = 木や屋根に登れない）
  stepDown: 0.6, // 歩いて降りられる段差（吸着）。超えると落下
  dropMax: 1.1, // 進入をブロックする崖の高さ
  footstepInterval: 0.3, // 歩行 SE の間隔（歩速でスケール）
  walkAnimBase: 1.15, // walk クリップの基準再生速度
}

export const HUB = {
  bounds: 11.6, // ハブ島の移動可能範囲（|x|,|z| の上限）
  plateDwellTime: 2.0, // プレート滞在の発火時間 (s)
  plateSwapDelay: 0.5, // レベルスワップ直後の判定遅延 (s)
  transitionDuration: 2.0, // TITLE→SELECT のカメラ遷移 (s)
}
