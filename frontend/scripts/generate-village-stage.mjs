// 1-1 の地形を生成する（旧 background_village.glb の置き換え。旧アセットは残す）。
//
//   node scripts/generate-village-stage.mjs
//   → public/models/stage/background_village_v2.glb
//
// 方針:
// - ボクセル柱方式（0.8 グリッド・固定シード）。上面 0.4 の色スラブ + 下は土の胴体で、
//   縁の崖が土色に見える（ハブ島と同じ世界観）。
// - 道は「スポーン → 十字路 → 3 つの村」のポリラインをセルに焼き込む。
//   村の位置は stages3d.js の配置（花: -7.8,0.8 / 鍛冶: 7.2,-7.4 / 商人: 7.2,5.4）が正。
// - 池は南西に窪みとして掘る（水面は StageWorld が village_lake を y=-0.35 に敷く）。
// - 木・丘は道・村の空き地・池・スポーンを避けて配置。丘の段差は 0.4（歩いて登れる）。
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO } from '@gltf-transform/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../public/models/stage/background_village_v2.glb');

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
const rand = mulberry32(0x0101);

// ── パレット（表示色） ──
const COLORS = {
  grass: [92, 200, 60],
  grassDark: [76, 176, 50],
  road: [226, 190, 116],
  roadDark: [196, 156, 90],
  dirt: [92, 62, 38], // 崖・池の底
  water: [64, 144, 214], // 池の水面
  trunk: [104, 74, 46],
  leaf: [58, 150, 48],
  leafDark: [46, 128, 40],
};

const STEP = 0.8;
const HALF = 12.8;
const SKIRT = -2.2; // 島の底
const TOP_SLAB = 0.4; // 上面の色スラブの厚み

// ── レイアウト定義 ──
const VILLAGES = [
  { x: -7.8, z: 0.8 }, // 花の村
  { x: 7.2, z: -7.4 }, // 鍛冶の村
  { x: 7.2, z: 5.4 }, // 商人の村
];
const SPAWN = { x: 0.5, z: 9.5 };
const CROSS = { x: 0.5, z: 1.4 }; // 十字路
const POND = { x: -9.2, z: 7.2, r: 2.6 };

// 道のポリライン（スポーン → 十字路 → 各村の前）
const ROADS = [
  [[SPAWN.x, 12.8], [SPAWN.x, SPAWN.z], [CROSS.x, CROSS.z]],
  [[CROSS.x, CROSS.z], [-3.2, 1.1], [-5.4, 1.0]], // 花の村へ（西）
  [[CROSS.x, CROSS.z], [2.8, -2.6], [4.9, -5.2]], // 鍛冶の村へ（北東）
  [[CROSS.x, CROSS.z], [2.8, 3.4], [4.7, 4.5]], // 商人の村へ（南東）
];

function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax;
  const dz = bz - az;
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

function roadDistance(x, z) {
  let min = Infinity;
  for (const line of ROADS) {
    for (let i = 0; i < line.length - 1; i++) {
      min = Math.min(min, distToSegment(x, z, line[i][0], line[i][1], line[i + 1][0], line[i + 1][1]));
    }
  }
  return min;
}

function isRoad(x, z) {
  if (roadDistance(x, z) < 1.0) return true;
  // スポーン広場と十字路は少し広めに
  if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 1.9) return true;
  if (Math.hypot(x - CROSS.x, z - CROSS.z) < 1.6) return true;
  return false;
}

function inPond(x, z) {
  return Math.hypot(x - POND.x, z - POND.z) < POND.r;
}

function nearVillage(x, z, r = 3.0) {
  return VILLAGES.some((v) => Math.hypot(x - v.x, z - v.z) < r);
}

// 丘（歩いて登れる 0.4 刻み）: 北西の高台 + 北の縁 + 南東の小さな高み
function hillHeight(x, z) {
  let h = 0;
  const mounds = [
    { x: -9.5, z: -9.5, r: 5.2, h: 1.6 },
    { x: 3.0, z: -11.5, r: 3.6, h: 1.2 },
    { x: 11.5, z: 11.0, r: 3.4, h: 0.8 },
    { x: -11.8, z: 5.0, r: 2.6, h: 0.8 },
  ];
  for (const m of mounds) {
    const d = Math.hypot(x - m.x, z - m.z);
    if (d < m.r) h = Math.max(h, m.h * (1 - d / m.r) * 1.6);
  }
  return Math.min(1.6, Math.round(h / 0.4) * 0.4);
}

// ── 柱の生成 ──
function buildColumns() {
  const bag = {};
  const add = (color, cx, cy, cz, sx, sy, sz) => {
    ;(bag[color] ??= []).push([cx, cy, cz, sx, sy, sz]);
  };
  const N = Math.round((HALF * 2) / STEP); // 32
  for (let iz = 0; iz < N; iz++) {
    for (let ix = 0; ix < N; ix++) {
      const x = -HALF + (ix + 0.5) * STEP;
      const z = -HALF + (iz + 0.5) * STEP;

      if (inPond(x, z)) {
        // 池: 水面 -0.25 の水ボクセル + 土の底（waterLevel -0.2 で進入不可になる高さ）
        add('water', x, -0.35, z, STEP, 0.2, STEP);
        add('dirt', x, (-0.45 + SKIRT) / 2, z, STEP, -0.45 - SKIRT, STEP);
        continue;
      }

      const road = isRoad(x, z);
      const flat = road || nearVillage(x, z);
      const h = flat ? 0 : hillHeight(x, z);

      // 上面スラブ（草 or 道）
      let topColor;
      if (road) topColor = rand() < 0.12 ? 'roadDark' : 'road';
      else topColor = rand() < 0.18 ? 'grassDark' : 'grass';
      add(topColor, x, h - TOP_SLAB / 2, z, STEP, TOP_SLAB, STEP);
      // 土の胴体
      add('dirt', x, (h - TOP_SLAB + SKIRT) / 2, z, STEP, h - TOP_SLAB - SKIRT, STEP);
    }
  }
  return { bag, add };
}

// ── 木（幹 + 3 段の葉。道・村・池・スポーンを避けた固定配置） ──
function addTrees(add) {
  const spots = [];
  let guard = 0;
  while (spots.length < 16 && guard++ < 4000) {
    const x = -11.2 + rand() * 22.4;
    const z = -11.2 + rand() * 22.4;
    if (roadDistance(x, z) < 2.2) continue; // 葉の張り出しが道をふさがないように
    if (Math.hypot(x - CROSS.x, z - CROSS.z) < 3.0) continue;
    if (inPond(x, z) || Math.hypot(x - POND.x, z - POND.z) < POND.r + 1.0) continue;
    if (nearVillage(x, z, 3.6)) continue;
    if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 3.2) continue;
    if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < 2.6)) continue;
    spots.push({ x, z });
  }
  for (const { x, z } of spots) {
    const base = hillHeight(x, z);
    const s = 0.85 + rand() * 0.5;
    add('trunk', x, base + 0.4 * s, z, 0.4 * s, 0.8 * s, 0.4 * s);
    add('leafDark', x, base + (0.8 + 0.35) * s, z, 1.7 * s, 0.7 * s, 1.7 * s);
    add('leaf', x, base + (0.8 + 0.95) * s, z, 1.25 * s, 0.6 * s, 1.25 * s);
    add('leaf', x, base + (0.8 + 1.45) * s, z, 0.7 * s, 0.5 * s, 0.7 * s);
  }
}

// ── GLB 出力 ──
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

async function build() {
  const doc = new Document();
  doc.createBuffer();
  const scene = doc.createScene('villageStage');
  doc.getRoot().setDefaultScene(scene);
  const makeAccessor = (type, array) =>
    doc.createAccessor().setType(type).setArray(array).setBuffer(doc.getRoot().listBuffers()[0]);

  const { bag, add } = buildColumns();
  addTrees(add);

  const mesh = doc.createMesh('villageStage');
  for (const [key, defs] of Object.entries(bag)) {
    const [r, g, b] = COLORS[key];
    const mat = doc
      .createMaterial(`vs_${key}`)
      .setBaseColorFactor([toLinear(r), toLinear(g), toLinear(b), 1])
      .setMetallicFactor(0)
      .setRoughnessFactor(1);
    mesh.addPrimitive(buildBoxesPrim(doc, makeAccessor, defs, mat));
  }
  scene.addChild(doc.createNode('villageStage').setMesh(mesh));
  await new NodeIO().write(OUT, doc);
  const total = Object.values(bag).reduce((n, d) => n + d.length, 0);
  console.log(`written: ${OUT} (boxes: ${total})`);
}

await build();
