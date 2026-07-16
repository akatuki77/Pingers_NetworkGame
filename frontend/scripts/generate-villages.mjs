// 1-1 用の 3 つの村モデルを生成する（旧 village.glb の流用をやめ、村ごとに専用モデル化）。
//
//   node scripts/generate-villages.mjs
//   → public/models/object/village_flower.glb   花の村（花壇と花のアーチ）
//   → public/models/object/village_smith.glb    鍛冶の村（炉の煙突・金床・剣立て）
//   → public/models/object/village_merchant.glb 商人の村（縞テントの屋台・木箱・樽）
//
// 方針:
// - ハブ島・鬼ヶ島と同じボックス組み立て方式（固定配置・再生成しても同一出力）。
// - 原点 = 底面中心。正面 = +Z（StageWorld が lookAt で看板側へ向ける）。
// - フットプリントは半径 2.2 以内（地形に焼き込まれた木・丘にめり込まない大きさ）。
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO } from '@gltf-transform/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = (name) => resolve(__dirname, `../public/models/object/${name}.glb`);

const LIGHT_INV = Math.pow(3.8 / Math.PI, -1 / 2.2);
const toLinear = (c) => Math.pow((c * LIGHT_INV) / 255, 2.2);

// ── パレット（表示色） ──────────────────────────────────────────
const COLORS = {
  plaster: [222, 204, 168], // 漆喰壁
  timber: [104, 74, 46], // 梁・柱
  straw: [226, 182, 94], // わら屋根
  strawDark: [198, 154, 72],
  slate: [98, 102, 116], // 鍛冶屋の石屋根
  stone: [158, 158, 162], // 石壁・煙突
  door: [70, 50, 32],
  window: [255, 232, 150], // 灯りのついた窓
  leaf: [86, 158, 66],
  pink: [232, 118, 148],
  red: [214, 72, 60],
  yellow: [240, 206, 92],
  white: [242, 238, 226],
  coal: [46, 44, 46],
  ember: [255, 142, 54], // 炉の残り火
  iron: [74, 76, 86], // 金床
  awningRed: [206, 74, 58],
  awningWhite: [240, 232, 214],
  crate: [198, 152, 94],
  crateDark: [152, 110, 62],
  barrel: [136, 96, 58],
  band: [88, 62, 38],
};

// ── ボックス集積のユーティリティ ────────────────────────────────
function makeBag() {
  const bag = {};
  return {
    add(color, cx, cy, cz, sx, sy, sz) {
      ;(bag[color] ??= []).push([cx, cy, cz, sx, sy, sz]);
    },
    entries: () => Object.entries(bag),
  };
}

/** 切妻を段々で表現したボクセル屋根。 */
function addRoof(bag, color, darkColor, cx, baseY, cz, w, d) {
  const layers = [
    [w + 0.55, d + 0.55, color],
    [w + 0.05, d + 0.05, color],
    [w - 0.5, d - 0.5, darkColor ?? color],
  ];
  let y = baseY;
  for (const [lw, ld, c] of layers) {
    if (lw <= 0.2 || ld <= 0.2) break;
    bag.add(c, cx, y + 0.14, cz, lw, 0.28, ld);
    y += 0.28;
  }
}

/** 標準的な家（漆喰壁 + 梁 + 扉 + 窓 + わら屋根）。 */
function addHouse(bag, cx, cz, w, d, wallH, { roof = 'straw', wall = 'plaster' } = {}) {
  bag.add(wall, cx, wallH / 2, cz, w, wallH, d);
  // 四隅の柱
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      bag.add('timber', cx + (sx * (w - 0.14)) / 2, wallH / 2, cz + (sz * (d - 0.14)) / 2, 0.16, wallH, 0.16);
    }
  }
  // 正面（+Z）の扉と窓
  bag.add('door', cx - 0.15, 0.42, cz + d / 2 + 0.02, 0.5, 0.84, 0.08);
  bag.add('window', cx + w / 4 + 0.1, wallH * 0.62, cz + d / 2 + 0.02, 0.42, 0.36, 0.06);
  // 屋根
  const roofColor = roof === 'slate' ? 'slate' : 'straw';
  const roofDark = roof === 'slate' ? 'coal' : 'strawDark';
  addRoof(bag, roofColor, roofDark, cx, wallH, cz, w, d);
  return wallH + 0.28 * 3; // 屋根の頂上高さ
}

/** 花（茎 + 花びら 1 ボクセル）。 */
function addFlower(bag, color, x, z) {
  bag.add('leaf', x, 0.16, z, 0.1, 0.32, 0.1);
  bag.add(color, x, 0.42, z, 0.26, 0.22, 0.26);
}

// ── 花の村 ──────────────────────────────────────────────────────
function buildFlowerVillage(bag) {
  addHouse(bag, -1.0, -0.7, 2.0, 1.7, 1.1);
  addHouse(bag, 1.2, -1.2, 1.5, 1.3, 0.95);
  // 花のアーチ（入口 +Z）
  for (const s of [-1, 1]) bag.add('timber', s * 0.8, 0.75, 1.7, 0.14, 1.5, 0.14);
  bag.add('leaf', 0, 1.56, 1.7, 1.9, 0.18, 0.2);
  for (const [x, c] of [[-0.8, 'pink'], [-0.3, 'yellow'], [0.3, 'red'], [0.8, 'pink']]) {
    bag.add(c, x, 1.74, 1.7, 0.3, 0.22, 0.26);
  }
  // 花壇 2 列
  const bedColors = ['pink', 'red', 'yellow', 'white', 'pink'];
  bedColors.forEach((c, i) => addFlower(bag, c, -1.7 + i * 0.55, 1.1));
  ;['yellow', 'white', 'red'].forEach((c, i) => addFlower(bag, c, 1.0 + i * 0.5, 0.4));
  // 家の脇の茂み
  bag.add('leaf', -2.0, 0.3, -1.4, 0.6, 0.6, 0.6);
  bag.add('leaf', 2.1, 0.26, -0.4, 0.5, 0.52, 0.5);
}

// ── 鍛冶の村 ────────────────────────────────────────────────────
function buildSmithVillage(bag) {
  // 鍛冶場（石壁 + 石屋根 + 煙突）
  addHouse(bag, -0.8, -0.6, 2.2, 1.8, 1.15, { roof: 'slate', wall: 'stone' });
  bag.add('stone', -0.2, 1.15 + 0.84 + 0.35, -0.9, 0.44, 1.15, 0.44); // 煙突
  bag.add('coal', -0.2, 1.15 + 0.84 + 0.98, -0.9, 0.5, 0.14, 0.5);
  // 炉（外の窯 + 残り火）
  bag.add('stone', 1.3, 0.45, -1.1, 0.9, 0.9, 0.8);
  bag.add('coal', 1.3, 0.95, -1.1, 0.7, 0.24, 0.6);
  bag.add('ember', 1.3, 0.5, -0.68, 0.5, 0.3, 0.08);
  // 金床（切り株 + 鉄床）
  bag.add('timber', 0.9, 0.19, 0.7, 0.42, 0.38, 0.42);
  bag.add('iron', 0.9, 0.5, 0.7, 0.66, 0.24, 0.34);
  // 剣立て（白い刀身 3 本）
  bag.add('timber', -1.6, 0.35, 1.2, 0.8, 0.14, 0.3);
  for (const [i, x] of [-1.85, -1.6, -1.35].entries()) {
    bag.add('white', x, 0.75 + (i % 2) * 0.08, 1.2, 0.09, 0.72, 0.09);
    bag.add('timber', x, 0.52, 1.2, 0.2, 0.08, 0.12);
  }
  // 水樽
  bag.add('barrel', 2.0, 0.3, 0.2, 0.5, 0.6, 0.5);
  bag.add('band', 2.0, 0.52, 0.2, 0.54, 0.08, 0.54);
}

// ── 商人の村 ────────────────────────────────────────────────────
function buildMerchantVillage(bag) {
  addHouse(bag, -1.0, -0.9, 2.0, 1.7, 1.1);
  // 屋台（柱 4 本 + 紅白の縞テント + 売り台）
  const sx = 1.2;
  const sz = -0.3;
  for (const dx of [-1, 1]) {
    for (const dz of [-1, 1]) {
      bag.add('timber', sx + dx * 0.65, 0.6, sz + dz * 0.55, 0.12, 1.2, 0.12);
    }
  }
  const stripes = ['awningRed', 'awningWhite', 'awningRed', 'awningWhite', 'awningRed'];
  stripes.forEach((c, i) => {
    bag.add(c, sx - 0.7 + 0.35 * i + 0.175, 1.28, sz, 0.35, 0.1, 1.5);
  });
  bag.add('crate', sx, 0.42, sz + 0.15, 1.2, 0.5, 0.7); // 売り台
  bag.add('yellow', sx - 0.3, 0.75, sz + 0.15, 0.3, 0.16, 0.3); // 商品
  bag.add('red', sx + 0.25, 0.75, sz + 0.15, 0.3, 0.16, 0.3);
  // 木箱の山
  bag.add('crate', 0.4, 0.27, 1.3, 0.55, 0.55, 0.55);
  bag.add('crateDark', 0.98, 0.24, 1.35, 0.48, 0.48, 0.48);
  bag.add('crate', 0.66, 0.78, 1.3, 0.5, 0.5, 0.5);
  // 樽 2 つ
  for (const [bx, bz] of [[-2.0, 0.6], [-1.55, 1.0]]) {
    bag.add('barrel', bx, 0.3, bz, 0.5, 0.6, 0.5);
    bag.add('band', bx, 0.5, bz, 0.54, 0.08, 0.54);
  }
}

// ── GLB 出力 ────────────────────────────────────────────────────
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
    const x0 = cx - sx / 2, x1 = cx + sx / 2;
    const y0 = cy - sy / 2, y1 = cy + sy / 2;
    const z0 = cz - sz / 2, z1 = cz + sz / 2;
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

async function writeVillage(name, builder) {
  const doc = new Document();
  doc.createBuffer();
  const scene = doc.createScene(name);
  doc.getRoot().setDefaultScene(scene);
  const makeAccessor = (type, array) =>
    doc.createAccessor().setType(type).setArray(array).setBuffer(doc.getRoot().listBuffers()[0]);

  const bag = makeBag();
  builder(bag);

  const mesh = doc.createMesh(name);
  for (const [colorKey, defs] of bag.entries()) {
    const [r, g, b] = COLORS[colorKey];
    const mat = doc
      .createMaterial(`${name}_${colorKey}`)
      .setBaseColorFactor([toLinear(r), toLinear(g), toLinear(b), 1])
      .setMetallicFactor(0)
      .setRoughnessFactor(1);
    mesh.addPrimitive(buildBoxesPrim(doc, makeAccessor, defs, mat));
  }
  scene.addChild(doc.createNode(name).setMesh(mesh));
  const file = outPath(name);
  await new NodeIO().write(file, doc);
  console.log(`written: ${file}`);
}

await writeVillage('village_flower', buildFlowerVillage);
await writeVillage('village_smith', buildSmithVillage);
await writeVillage('village_merchant', buildMerchantVillage);
