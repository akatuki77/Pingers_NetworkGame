// 鬼ヶ島の島モデルを生成する（旧 background_onigashima.glb の置き換え。旧アセットは残す）。
//
//   node scripts/generate-onigashima.mjs
//   → public/models/stage/background_onigashima_v2.glb
//
// 方針:
// - ハブ島と同じボクセル柱方式（固定シード・再生成しても同一出力）。
// - 原点 = XZ 中心。喫水線 = y=0（岩の裾は y=-2 まで水中に沈む前提。
//   ステージ側は海面 y≒-0.14 に対し position.y≒-0.1 で置く）。
// - 見せ場は南面（+Z、4-1 のカットシーンで船が近づく側）:
//   洞窟の口 + 牙、怒り目、山頂の赤い角、磯の砦の門と幟。
// - フットプリントはアセット契約どおり 25.6×25.6 に収める。
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO } from '@gltf-transform/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../public/models/stage/background_onigashima_v2.glb');

// ハブ島と同じ「表示色 → テクスチャ色」逆算係数（generate-hub-island.mjs 参照）
const LIGHT_INV = Math.pow(3.8 / Math.PI, -1 / 2.2);
const toLinear = (c) => Math.pow((c * LIGHT_INV) / 255, 2.2);

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- 形状パラメータ ----
const STEP = 0.8; // ボクセル柱の一辺
const R_LIM = 12.4; // 島の最大半径（25.6 フットプリント内）
const H_MAX = 8.6; // 山の最高部
const SKIRT = -2.0; // 水中に沈む裾の底
const SHORE_H = 0.45; // 磯の高さ（喫水線の上）
const SHORE_BAND = 2.6; // 磯の幅

// 角度方向の輪郭ノイズ（16 バケットの値ノイズを補間。ゴツゴツした海岸線を作る）
const rimRand = mulberry32(0x0417);
const RIM = Array.from({ length: 16 }, () => 0.80 + rimRand() * 0.20);
function rimAt(theta) {
  const t = ((theta + Math.PI) / (2 * Math.PI)) * 16;
  const i = Math.floor(t) % 16;
  const f = t - Math.floor(t);
  const a = RIM[i];
  const b = RIM[(i + 1) % 16];
  return a + (b - a) * (f * f * (3 - 2 * f)); // smoothstep 補間
}

// 高さの凹凸ノイズ
const hRand = mulberry32(0x0611);
const HN = [];
for (let i = 0; i < 33 * 33; i++) HN.push(hRand());
const hNoise = (ix, iz) => HN[(iz * 33 + ix) % HN.length];

// 洞窟の口（南面 +Z）: この XZ 領域の山柱を [floor..ceiling] だけくり抜く
const CAVE = { halfW: 2.3, zMin: 1.2, floor: SHORE_H, ceiling: 3.6 };
const inCave = (x, z) => Math.abs(x) < CAVE.halfW && z > CAVE.zMin;

function quantize(h) {
  return Math.max(0, Math.round(h / STEP) * STEP);
}

// ---- 柱の生成 ----
// 戻り値: { boxes: { 材質名: [cx,cy,cz,sx,sy,sz][] } }
function buildColumns() {
  const boxes = {
    rockLow: [], // 山腹（暗い火山岩）
    rockHigh: [], // 山頂寄り（さらに暗い）
    shore: [], // 磯の砂利
    caveIn: [], // 洞窟の内壁・奥（ほぼ黒）
  };
  const N = Math.round((R_LIM * 2) / STEP); // 31
  for (let iz = 0; iz <= N; iz++) {
    for (let ix = 0; ix <= N; ix++) {
      const x = -R_LIM + ix * STEP;
      const z = -R_LIM + iz * STEP;
      const r = Math.hypot(x, z);
      const theta = Math.atan2(z, x);
      const rEdge = R_LIM * rimAt(theta);
      if (r > rEdge) continue; // 海

      const rMount = rEdge - SHORE_BAND;
      if (r > rMount) {
        // 磯（砂利の平地。門・牙・上陸の舞台）
        boxes.shore.push([x, (SHORE_H + SKIRT) / 2, z, STEP, SHORE_H - SKIRT, STEP]);
        continue;
      }

      // 山。中心をやや北（-Z）に置き、南面が長い斜面になるようにする
      const rc = Math.hypot(x, z + 1.6) / (rMount + 1.6);
      let h = H_MAX * Math.pow(Math.max(0, 1 - rc), 0.95);
      // 東の副峰（シルエットの単調さを崩す）
      const rc2 = Math.hypot(x - 5.6, z + 4.0) / 4.2;
      h = Math.max(h, 5.2 * Math.pow(Math.max(0, 1 - rc2), 1.1));
      h += (hNoise(ix, iz) - 0.5) * 1.4 * Math.min(1, h / 3); // 高いほど凹凸
      h = quantize(Math.max(SHORE_H, h));

      const mat = h > H_MAX * 0.55 ? 'rockHigh' : 'rockLow';
      if (inCave(x, z)) {
        if (h > CAVE.ceiling + STEP) {
          // 洞窟: 暗い床 + 天井から上の山体（口は磯側に開く）
          boxes.caveIn.push([x, (CAVE.floor + SKIRT) / 2, z, STEP, CAVE.floor - SKIRT, STEP]);
          boxes[mat].push([x, (h + CAVE.ceiling) / 2, z, STEP, h - CAVE.ceiling, STEP]);
        } else {
          // 天井を支えられない低い柱は口の前庭（床だけ）にする
          boxes.caveIn.push([x, (CAVE.floor + SKIRT) / 2, z, STEP, CAVE.floor - SKIRT, STEP]);
        }
      } else {
        boxes[mat].push([x, (h + SKIRT) / 2, z, STEP, h - SKIRT, STEP]);
      }
    }
  }
  return boxes;
}

// ---- 顔・小物 ----
function buildFeatures() {
  const f = {
    eye: [], // 白目（怒り目）
    fang: [], // 牙
    horn: [], // 赤い角
    wood: [], // 砦の門
    banner: [], // 幟
    caveIn: [], // 洞窟の奥壁
  };

  // 怒り目（ハの字）: 南斜面の洞窟の上あたり。外側が高く内側が低い 2 段の白箱
  for (const s of [-1, 1]) {
    f.eye.push([s * 2.5, 5.7, 3.55, 1.5, 0.7, 0.7]);
    f.eye.push([s * 1.5, 5.3, 3.9, 0.9, 0.7, 0.7]);
  }

  // 洞窟の奥壁（黒）と口元の牙: 上から 3 本 + 下から 2 本
  f.caveIn.push([0, 1.9, 1.6, CAVE.halfW * 2 - 0.2, 3.4, 0.6]);
  const fangTop = [-1.5, 0, 1.5];
  for (const fx of fangTop) f.fang.push([fx, CAVE.ceiling - 0.55, 7.4, 0.55, 1.1, 0.5]);
  for (const fx of [-0.8, 0.9]) f.fang.push([fx, SHORE_H + 0.45, 7.5, 0.55, 0.9, 0.5]);

  // 山頂の赤い角（2 本、先細り 3 段）
  for (const s of [-1, 1]) {
    const bx = s * 1.9;
    f.horn.push([bx, H_MAX + 0.5, -1.4, 1.0, 1.0, 1.0]);
    f.horn.push([bx + s * 0.25, H_MAX + 1.4, -1.4, 0.7, 0.8, 0.7]);
    f.horn.push([bx + s * 0.5, H_MAX + 2.1, -1.4, 0.45, 0.7, 0.45]);
  }

  // 磯の砦の門（洞窟の正面、上陸地点）: 柱 2 本 + 笠木 + 反り上がりの端
  const gz = 10.2;
  const gy = SHORE_H;
  for (const s of [-1, 1]) f.wood.push([s * 2.0, gy + 1.5, gz, 0.5, 3.0, 0.5]);
  f.wood.push([0, gy + 3.1, gz, 5.4, 0.5, 0.6]);
  for (const s of [-1, 1]) f.wood.push([s * 2.8, gy + 3.35, gz, 0.8, 0.45, 0.6]);
  // 幟（笠木から下がる赤い布 2 枚）
  for (const s of [-1, 1]) f.banner.push([s * 1.1, gy + 2.3, gz + 0.08, 0.7, 1.5, 0.12]);

  // 磯のトゲ岩（骨のような白い岩）: 南の磯の左右
  for (const [sx, sz, h] of [[-6.5, 8.6, 1.6], [6.8, 8.2, 2.0], [-8.4, 5.4, 1.2], [9.0, 4.6, 1.4]]) {
    f.fang.push([sx, SHORE_H + h / 2, sz, 0.7, h, 0.7]);
    f.fang.push([sx + 0.3, SHORE_H + h * 0.75, sz + 0.15, 0.4, h * 0.5, 0.4]);
  }
  return f;
}

// ---- GLB 組み立て ----
function buildBoxesPrim(doc, makeAccessor, defs, material) {
  const positions = [];
  const normals = [];
  const indices = [];
  const addFace = (verts, normal) => {
    const base = positions.length / 3;
    for (const v of verts) positions.push(...v);
    for (let i = 0; i < 4; i++) normals.push(...normal);
    indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
  };
  for (const [cx, cy, cz, sx, sy, sz] of defs) {
    const x0 = cx - sx / 2;
    const x1 = cx + sx / 2;
    const y0 = cy - sy / 2;
    const y1 = cy + sy / 2;
    const z0 = cz - sz / 2;
    const z1 = cz + sz / 2;
    addFace([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], [0, 1, 0]);
    addFace([[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0]], [0, -1, 0]);
    addFace([[x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1]], [0, 0, 1]);
    addFace([[x1, y1, z0], [x0, y1, z0], [x0, y0, z0], [x1, y0, z0]], [0, 0, -1]);
    addFace([[x1, y1, z1], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1]], [1, 0, 0]);
    addFace([[x0, y1, z0], [x0, y1, z1], [x0, y0, z1], [x0, y0, z0]], [-1, 0, 0]);
  }
  const IndexArray = positions.length / 3 > 65535 ? Uint32Array : Uint16Array;
  return doc
    .createPrimitive()
    .setAttribute('POSITION', makeAccessor('VEC3', new Float32Array(positions)))
    .setAttribute('NORMAL', makeAccessor('VEC3', new Float32Array(normals)))
    .setIndices(makeAccessor('SCALAR', new IndexArray(indices)))
    .setMaterial(material);
}

async function build() {
  const doc = new Document();
  doc.createBuffer();
  const scene = doc.createScene('onigashima');
  doc.getRoot().setDefaultScene(scene);
  const makeAccessor = (type, array) =>
    doc.createAccessor().setType(type).setArray(array).setBuffer(doc.getRoot().listBuffers()[0]);
  const makeMat = (name, r, g, b) =>
    doc
      .createMaterial(name)
      .setBaseColorFactor([toLinear(r), toLinear(g), toLinear(b), 1])
      .setMetallicFactor(0)
      .setRoughnessFactor(1);

  // 表示色ベースのパレット（暗すぎた旧モデルの反省でトーンを 2〜3 段持たせる）
  const mats = {
    rockLow: makeMat('oniRockLow', 106, 96, 104), // 紫がかった火山岩
    rockHigh: makeMat('oniRockHigh', 74, 66, 76),
    shore: makeMat('oniShore', 176, 170, 158), // 砂利の磯
    caveIn: makeMat('oniCave', 26, 22, 28), // 洞窟の闇
    eye: makeMat('oniEye', 245, 240, 225),
    fang: makeMat('oniFang', 235, 231, 218),
    horn: makeMat('oniHorn', 196, 58, 44), // 鬼の角の赤
    wood: makeMat('oniWood', 96, 70, 46),
    banner: makeMat('oniBanner', 188, 44, 38),
  };

  const columns = buildColumns();
  const features = buildFeatures();
  // caveIn は柱と小物の両方にある → 結合
  const merged = { ...columns };
  for (const [k, v] of Object.entries(features)) {
    merged[k] = [...(merged[k] ?? []), ...v];
  }

  const mesh = doc.createMesh('onigashima');
  for (const [key, defs] of Object.entries(merged)) {
    if (!defs.length) continue;
    mesh.addPrimitive(buildBoxesPrim(doc, makeAccessor, defs, mats[key]));
  }
  scene.addChild(doc.createNode('onigashima').setMesh(mesh));

  await new NodeIO().write(OUT, doc);
  const total = Object.values(merged).reduce((n, d) => n + d.length, 0);
  console.log(`written: ${OUT} (boxes: ${total})`);
}

await build();
