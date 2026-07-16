// 全ルートの初期表示スクリーンショットを撮影する。
// 用途: docs/asset-refactoring-plan.md §6 のベースライン取得と、変更後の比較用撮影。
//
//   node scripts/capture-screenshots.mjs --base http://localhost:5173 --out ../../docs/screenshots/baseline
//
// 前提: frontend の dev サーバーが起動していること。バックエンド不要(未ログイン状態で撮影)。
//
// 撮影手順(決定論性の担保):
//   1. ページスクリプト実行前に performance.now / Date.now / requestAnimationFrame を
//      制御可能なスタブに差し替える(addInitScript)
//      → three.js の Clock・アニメーションループは window.__stepFrames を呼ぶまで
//        1 フレームも進まない
//   2. 実時間で networkidle + フォント読み込みまで待ち切る
//      → モジュール・モデル・テクスチャの取得とマウント完了を保証
//   3. Escape を送る
//      → 目標モーダルが開いていれば閉じる(全ステージに Escape watcher あり。
//        モーダルのないルートでは何も起きない)。アセット比較が目的なので
//        シーンを隠さない状態に統一する。CSS トランジション(0.7s)は実時間で
//        動くため、実時間で待って終端状態に落ち着かせる
//   4. __stepFrames で全ルート同一のフレーム数・タイムステップだけ描画を進める
//   5. スクリーンショット
//
// リトライ: この開発機では以下の環境起因の撮影失敗がランダムに発生することが
// 実測で確認されている。いずれかを検知したらそのルートを撮り直す(最大 3 回)。
//   a. ネットワークアダプタ変化(net::ERR_NETWORK_CHANGED)で読み込み中のフェッチが
//      中断 → three.js のローダーはリトライせずモデルが静かに欠落
//      (症状: タイトル文字の消失、全面白画面)。
//      バックエンド未起動による API 失敗(localhost:3000)は想定内として無視する
//   b. GPU プロセスのクラッシュで全 WebGL コンテキストが同時喪失 → 毎フレーム描画の
//      メインシーンは復旧するが、マウント時に 1 回だけ描画する BackButton が
//      空白のままになる(モデル形式・ルートを問わず発生)
//
// 過去の経緯: 当初は CDP virtual time(pauseIfNetworkFetchesPending)方式だったが、
// 仮想時間の予算が dev サーバーのモジュール読み込みの合間に不定量消費され、
// モーダル開閉状態やアニメーション位相が実行ごとに揺れることが実測で確認された
// (docs/screenshots/_determinism-check の diff 画像がその記録)。読み込み待ちを
// 実時間に、アニメーション進行をページ内フェイククロックに分離して解消した。
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { PNG } from 'pngjs';

const { values: args } = parseArgs({
  options: {
    base: { type: 'string', default: 'http://localhost:5173' },
    out: { type: 'string', default: '../../docs/screenshots/baseline' },
    only: { type: 'string' }, // ルート名を指定して 1 枚だけ撮る(例: --only title)
    // モーダルを閉じずに撮る(モーダル UI 自体の見た目比較用)。
    // 既定はシーン比較用に Escape で閉じる
    'keep-modal': { type: 'boolean', default: false },
  },
});

// 進める描画時間: 600 フレーム × 16.67ms ≒ 10 秒(60fps 相当)
const FRAMES = 600;
const FRAME_MS = 1000 / 60;

const routes = [
  { path: '/', name: 'title' },
  { path: '/glossary', name: 'glossary' },
  { path: '/select-story', name: 'select-story' },
  { path: '/content/1', name: 'content-1' },
  { path: '/Stage-1-1', name: 'stage-1-1' },
  { path: '/Stage-2-1', name: 'stage-2-1' },
  { path: '/Stage-2-2', name: 'stage-2-2' },
  { path: '/Stage-3-1', name: 'stage-3-1' },
  { path: '/Stage-3-2', name: 'stage-3-2' },
  { path: '/Stage-4-1', name: 'stage-4-1' },
  { path: '/Stage-4-2', name: 'stage-4-2' },
];

const outDir = resolve(import.meta.dirname, args.out);
mkdirSync(outDir, { recursive: true });

// ほぼ全面白 = WebGL が一度も描画されていない症状(ごく稀に発生することを実測)。
// 正常な画面は最も白い glossary/content でも白率 50% 未満。
function whiteRatio(file) {
  const png = PNG.sync.read(readFileSync(file));
  let white = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i] > 250 && png.data[i + 1] > 250 && png.data[i + 2] > 250) white++;
  }
  return white / (png.width * png.height);
}

const browser = await chromium.launch();
const consoleErrors = [];

async function captureRoute(route, file) {
  // ルートごとに新しいページで撮る(クロックとシーン状態を毎回リセットするため)
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(`${route.name}: ${msg.text()}`);
  });
  page.on('pageerror', (e) => consoleErrors.push(`${route.name}: pageerror: ${e.message}`));
  // アセット取得失敗の検知(API はバックエンド未起動時の失敗が想定内なので除外)
  const failedResources = [];
  page.on('requestfailed', (req) => {
    if (!req.url().includes('localhost:3000')) {
      failedResources.push(`${req.url()} (${req.failure()?.errorText})`);
    }
  });
  await page.addInitScript(() => {
    // GPU プロセスクラッシュ(全コンテキスト喪失)の検知用
    window.__lostContexts = 0;
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      const ctx = origGetContext.call(this, type, ...rest);
      if (type === 'webgl' || type === 'webgl2') {
        this.addEventListener('webglcontextlost', () => { window.__lostContexts++; });
      }
      return ctx;
    };
    let now = 0;
    let queue = [];
    let nextId = 1;
    const ids = new Map();
    const nativeRaf = window.requestAnimationFrame.bind(window);
    performance.now = () => now;
    Date.now = () => 1750000000000 + now; // 固定起点(Date 表示を使う画面はない)
    // 撮影直前に呼ぶ: Playwright の screenshot は rAF で描画安定を待つため、
    // ネイティブ rAF を返す。アプリのループの次チックはスタブのキューに
    // 滞留したままなので、シーンは凍結された状態を維持する。
    window.__restoreRaf = () => {
      window.requestAnimationFrame = nativeRaf;
    };
    window.requestAnimationFrame = (cb) => {
      const id = nextId++;
      ids.set(id, cb);
      queue.push(id);
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      ids.delete(id);
    };
    window.__stepFrames = (frames, dt) => {
      for (let i = 0; i < frames; i++) {
        now += dt;
        const current = queue;
        queue = [];
        for (const id of current) {
          const cb = ids.get(id);
          if (cb) {
            ids.delete(id);
            cb(now);
          }
        }
      }
    };
  });
  await page.goto(args.base + route.path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // フォント読み込みがマウント(=カメラアスペクト確定)より遅れると canvas
  // コンテナの寸法が 2 通りに分かれるため、確定後のレイアウトで再計算させる
  // (全ビューに resize ハンドラがある)
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  // モーダルを閉じ(--keep-modal 時は開いたまま)、CSS トランジション(0.7s)の
  // 終端まで実時間で待つ
  if (!args['keep-modal']) await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  // 描画を決定論的に進める(戻り値を待つことで完了を保証)
  await page.evaluate(
    ([frames, dt]) => window.__stepFrames(frames, dt),
    [FRAMES, FRAME_MS],
  );
  await page.evaluate(() => window.__restoreRaf());
  await page.screenshot({ path: file });
  const lostContexts = await page.evaluate(() => window.__lostContexts);
  await page.close();
  return { failedResources, lostContexts };
}

const MAX_ATTEMPTS = 3;
for (const route of routes.filter((r) => !args.only || r.name === args.only)) {
  const file = resolve(outDir, `${route.name}.png`);
  let ok = false;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS && !ok; attempt++) {
    const { failedResources, lostContexts } = await captureRoute(route, file);
    if (failedResources.length > 0) {
      console.warn(`WARN: ${route.name} でアセット取得失敗(attempt ${attempt}): ${failedResources.join(', ')}`);
    } else if (lostContexts > 0) {
      console.warn(`WARN: ${route.name} で WebGL コンテキスト喪失 ×${lostContexts}(attempt ${attempt})`);
    } else if (whiteRatio(file) > 0.9) {
      console.warn(`WARN: ${route.name} がほぼ全面白(attempt ${attempt})`);
    } else {
      ok = true;
    }
  }
  if (!ok) {
    console.error(`ERROR: ${route.name} が ${MAX_ATTEMPTS} 回とも失敗。手動確認が必要`);
    process.exitCode = 1;
  }
  console.log(`captured ${route.name}.png`);
}

await browser.close();

if (consoleErrors.length > 0) {
  console.log('\n--- console errors (参考。未ログイン撮影では API 系エラーは想定内) ---');
  for (const e of consoleErrors) console.log(e);
}
