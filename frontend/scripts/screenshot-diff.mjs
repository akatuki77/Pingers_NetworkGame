// 2 つのスクリーンショットディレクトリをピクセル比較する。
// 用途: docs/asset-refactoring-plan.md §6-2 の差分判定(レベル A は 1% 未満で合格)。
//
//   node scripts/screenshot-diff.mjs --before ../../docs/screenshots/baseline --after ../../docs/screenshots/current
//
// 差分画像は after 側に <name>.diff.png として出力する。
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const { values: args } = parseArgs({
  options: {
    before: { type: 'string' },
    after: { type: 'string' },
    threshold: { type: 'string', default: '1' }, // 合格ライン(%)
  },
});
if (!args.before || !args.after) {
  console.error('usage: node scripts/screenshot-diff.mjs --before <dir> --after <dir> [--threshold 1]');
  process.exit(2);
}

const beforeDir = resolve(import.meta.dirname, args.before);
const afterDir = resolve(import.meta.dirname, args.after);
const limit = Number(args.threshold);

let failed = false;
for (const name of readdirSync(beforeDir).filter((f) => f.endsWith('.png') && !f.endsWith('.diff.png'))) {
  const before = PNG.sync.read(readFileSync(resolve(beforeDir, name)));
  let after;
  try {
    after = PNG.sync.read(readFileSync(resolve(afterDir, name)));
  } catch {
    console.log(`MISSING  ${name} (after 側に存在しない)`);
    failed = true;
    continue;
  }
  if (before.width !== after.width || before.height !== after.height) {
    console.log(`SIZE     ${name} (${before.width}x${before.height} vs ${after.width}x${after.height})`);
    failed = true;
    continue;
  }
  const diff = new PNG({ width: before.width, height: before.height });
  const diffPixels = pixelmatch(before.data, after.data, diff.data, before.width, before.height, { threshold: 0.1 });
  const pct = (diffPixels / (before.width * before.height)) * 100;
  const ok = pct < limit;
  if (!ok) {
    writeFileSync(resolve(afterDir, name.replace('.png', '.diff.png')), PNG.sync.write(diff));
    failed = true;
  }
  console.log(`${ok ? 'OK  ' : 'FAIL'}     ${name} diff=${pct.toFixed(3)}%`);
}
process.exit(failed ? 1 : 0);
