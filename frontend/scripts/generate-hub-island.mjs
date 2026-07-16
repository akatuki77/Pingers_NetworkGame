// ハブワールド専用の島 GLB を生成する。
//
//   node scripts/generate-hub-island.mjs
//   → public/models/stage/background_hub.glb
//
// 方針:
// - Stage 1-1 のベースラインスクリーンショット(docs/screenshots/baseline/stage-1-1.png)
//   から草・道・崖の「実際の表示色」をサンプリングし、ハブのライティング
//   (ambient 0.6 + directional 4.0、上面の受光係数 ≒ 3.8)を逆算してテクスチャ色に
//   変換する。GLB 埋め込みのパレット PNG は MagicaVoxel の全 256 色を含み、
//   未使用の蛍光色を拾ってしまうため使わない。
// - 上面は完全な平面(25.6×25.6・原点中心・y=0)。セレクトプレートの設置と
//   キャラクター移動を邪魔する地形物を一切含めない(装飾は HubView 側で別途配置)。
// - 上面テクスチャは 128×128 の低解像度+NEAREST フィルタで、MagicaVoxel 調の
//   チャンキーなまだら草原を再現する。乱数は固定シード=再生成しても同一出力。
// - アセット契約(docs/asset-refactoring-plan.md §4): 背景 25.6×25.6・XZ 原点中心。
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO } from '@gltf-transform/core';
import { PNG } from 'pngjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../../docs/screenshots/baseline/stage-1-1.png');
const OUT = resolve(__dirname, '../public/models/stage/background_hub.glb');
const OUT_ROCK = resolve(__dirname, '../public/models/object/hub_rock.glb');
const OUT_FLOWER = resolve(__dirname, '../public/models/object/hub_flower.glb');

// 表示色 → テクスチャ色の逆算。
// 受光係数 = ambient 0.6 + directional 4.0 × dot(上面法線, 光方向 0.80) = 3.8。
// three.js の物理ライティングでは Lambert BRDF の 1/π が掛かるため
// 実効係数 L = 3.8/π ≒ 1.21(ハブのレンダリング実測と一致)。
// display_linear = texture_linear × L より texture = display × L^(-1/2.2) ≒ × 0.92
const LIGHT_INV = Math.pow(3.8 / Math.PI, -1 / 2.2);
const toTexture = ({ r, g, b }) => ({
  r: Math.round(Math.min(255, r * LIGHT_INV)),
  g: Math.round(Math.min(255, g * LIGHT_INV)),
  b: Math.round(Math.min(255, b * LIGHT_INV)),
});

// ---- 1. ベースラインスクショから草・道・崖の表示色をサンプリング ----
function median(colors) {
  const lum = c => c.r * 0.3 + c.g * 0.6 + c.b * 0.1;
  const sorted = [...colors].sort((a, b) => lum(a) - lum(b));
  return sorted[Math.floor(sorted.length / 2)];
}

function samplePalette() {
  const png = PNG.sync.read(readFileSync(SRC));
  const grass = [];
  const sand = [];
  const cliff = [];
  for (let y = 0; y < png.height; y += 2) {
    for (let x = 0; x < png.width; x += 2) {
      const i = (y * png.width + x) * 4;
      const c = { r: png.data[i], g: png.data[i + 1], b: png.data[i + 2] };
      if (c.g > c.r + 40 && c.g > c.b + 80 && c.g > 120) grass.push(c);
      else if (c.r > 200 && c.g > 160 && c.b < 160 && c.r > c.g && c.g > c.b) sand.push(c);
      else if (c.r > 110 && c.r < 200 && c.r > c.g + 25 && c.g > c.b + 15 && c.g < 150) cliff.push(c);
    }
  }
  if (grass.length < 100 || sand.length < 20 || cliff.length < 20) {
    throw new Error(`サンプリング失敗: grass=${grass.length} sand=${sand.length} cliff=${cliff.length}`);
  }
  // 草はムラ表現のため中央値と暗部(下位 1/4)の 2 トーンを取る
  const lum = c => c.r * 0.3 + c.g * 0.6 + c.b * 0.1;
  const sortedGrass = grass.sort((a, b) => lum(a) - lum(b));
  const grassMain = sortedGrass[Math.floor(sortedGrass.length * 0.55)];
  const grassDark = sortedGrass[Math.floor(sortedGrass.length * 0.15)];
  const palette = {
    grassMain: toTexture(grassMain),
    grassDark: toTexture(grassDark),
    sand: toTexture(median(sand)),
    cliff: toTexture(median(cliff)),
    // 花・きのこの差し色は 1-1 の小物と同系の固定色
    accents: [toTexture({ r: 220, g: 60, b: 60 }), toTexture({ r: 245, g: 210, b: 120 }), toTexture({ r: 240, g: 240, b: 240 })],
  };
  console.log('display grass:', grassMain, 'dark:', grassDark);
  console.log('display sand:', median(sand), 'cliff:', median(cliff));
  console.log('texture palette:', JSON.stringify(palette));
  return palette;
}

// ---- 3. 上面テクスチャ生成(128×128、固定シードのまだら草原+中央広場) ----
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

function buildTopTexture({ grassMain, grassDark, sand }) {
  const size = 128;
  const png = new PNG({ width: size, height: size });
  const rand = mulberry32(0x1129);
  const put = (x, y, c) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    png.data[i] = c.r;
    png.data[i + 1] = c.g;
    png.data[i + 2] = c.b;
    png.data[i + 3] = 255;
  };

  // ベースの草色(1-1 の草原はほぼ均一な明るい緑。ムラは控えめにする)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) put(x, y, grassMain);

  // 控えめな草むらのムラ(暗めの緑を小さく散らす)
  for (let n = 0; n < 40; n++) {
    const cx = Math.floor(rand() * size);
    const cy = Math.floor(rand() * size);
    const r = 1.5 + rand() * 3;
    for (let y = Math.floor(cy - r); y <= cy + r; y++) {
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r && rand() > 0.45 + (d / r) * 0.4) put(x, y, grassDark);
      }
    }
  }

  // 中央の砂の広場は廃止（スポーンは左上に移動したため、全面を草にする）。
  void sand;

  // 1px の花の差し色は画面上でノイズにしか見えないため入れない
  // (にぎやかしは花・岩・NPC など 3D 装飾側で担う)

  // 縁を 1px 暗い草色に(島のふちの引き締め)
  for (let i = 0; i < size; i++) {
    put(i, 0, grassDark);
    put(i, size - 1, grassDark);
    put(0, i, grassDark);
    put(size - 1, i, grassDark);
  }

  return PNG.sync.write(png);
}

// ---- 4. GLB 組み立て(上面=テクスチャ付き平面、側面+底面=土色) ----
async function build() {
  const palette = samplePalette();
  const texPng = buildTopTexture(palette);

  const doc = new Document();
  doc.createBuffer();
  const scene = doc.createScene('hubIsland');
  doc.getRoot().setDefaultScene(scene);

  const H = 25.6 / 2; // 12.8
  const D = 2.56; // 島の厚み

  const texture = doc.createTexture('hubGrass').setImage(texPng).setMimeType('image/png');
  const matTop = doc
    .createMaterial('hubGrassTop')
    .setBaseColorTexture(texture)
    .setMetallicFactor(0)
    .setRoughnessFactor(1);
  // 低解像度テクスチャを NEAREST で拡大し、ボクセル調のチャンキーな見た目にする
  matTop.getBaseColorTextureInfo().setMagFilter(9728).setMinFilter(9728);

  const cliff = palette.cliff;
  const matCliff = doc
    .createMaterial('hubCliff')
    .setBaseColorFactor([
      Math.pow(cliff.r / 255, 2.2), // sRGB → linear(baseColorFactor は linear)
      Math.pow(cliff.g / 255, 2.2),
      Math.pow(cliff.b / 255, 2.2),
      1,
    ])
    .setMetallicFactor(0)
    .setRoughnessFactor(1);

  const makeAccessor = (type, array) =>
    doc.createAccessor().setType(type).setArray(array).setBuffer(doc.getRoot().listBuffers()[0]);

  // --- 上面(y=0、+Y 法線、UV 全面) ---
  const topPrim = doc
    .createPrimitive()
    .setAttribute('POSITION', makeAccessor('VEC3', new Float32Array([
      -H, 0, -H, H, 0, -H, H, 0, H, -H, 0, H,
    ])))
    .setAttribute('NORMAL', makeAccessor('VEC3', new Float32Array([
      0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
    ])))
    .setAttribute('TEXCOORD_0', makeAccessor('VEC2', new Float32Array([
      0, 0, 1, 0, 1, 1, 0, 1,
    ])))
    .setIndices(makeAccessor('SCALAR', new Uint16Array([0, 2, 1, 0, 3, 2])))
    .setMaterial(matTop);

  // --- 側面 4 枚 + 底面(外向き法線) ---
  const sidePositions = [];
  const sideNormals = [];
  const sideIndices = [];
  const addQuad = (verts, normal) => {
    const base = sidePositions.length / 3;
    for (const v of verts) sidePositions.push(...v);
    for (let i = 0; i < 4; i++) sideNormals.push(...normal);
    sideIndices.push(base, base + 2, base + 1, base, base + 3, base + 2);
  };
  addQuad([[-H, 0, H], [H, 0, H], [H, -D, H], [-H, -D, H]], [0, 0, 1]); // +Z
  addQuad([[H, 0, -H], [-H, 0, -H], [-H, -D, -H], [H, -D, -H]], [0, 0, -1]); // -Z
  addQuad([[H, 0, H], [H, 0, -H], [H, -D, -H], [H, -D, H]], [1, 0, 0]); // +X
  addQuad([[-H, 0, -H], [-H, 0, H], [-H, -D, H], [-H, -D, -H]], [-1, 0, 0]); // -X
  addQuad([[-H, -D, -H], [-H, -D, H], [H, -D, H], [H, -D, -H]], [0, -1, 0]); // 底

  const sidePrim = doc
    .createPrimitive()
    .setAttribute('POSITION', makeAccessor('VEC3', new Float32Array(sidePositions)))
    .setAttribute('NORMAL', makeAccessor('VEC3', new Float32Array(sideNormals)))
    .setIndices(makeAccessor('SCALAR', new Uint16Array(sideIndices)))
    .setMaterial(matCliff);

  const mesh = doc.createMesh('hubIsland').addPrimitive(topPrim).addPrimitive(sidePrim);
  scene.addChild(doc.createNode('hubIsland').setMesh(mesh));

  await new NodeIO().write(OUT, doc);
  console.log(`written: ${OUT}`);
}

// ---- 5. 岩(hub_rock.glb): 1-1 の白い岩と同系色のボクセル調の岩(原点=底面中心) ----
async function buildRock() {
  const doc = new Document();
  doc.createBuffer();
  const scene = doc.createScene('hubRock');
  doc.getRoot().setDefaultScene(scene);

  const makeAccessor = (type, array) =>
    doc.createAccessor().setType(type).setArray(array).setBuffer(doc.getRoot().listBuffers()[0]);

  const toLinear = (c) => Math.pow((c * LIGHT_INV) / 255, 2.2);
  const makeMat = (name, r, g, b) =>
    doc
      .createMaterial(name)
      .setBaseColorFactor([toLinear(r), toLinear(g), toLinear(b), 1])
      .setMetallicFactor(0)
      .setRoughnessFactor(1);
  const matLight = makeMat('rockLight', 208, 208, 214); // 1-1 の岩の白灰(表示色)を逆算
  const matDark = makeMat('rockDark', 158, 160, 168);

  // ボックスを積んだ MagicaVoxel 調の岩: [cx, cy, cz, sx, sy, sz]
  const boxDefs = {
    light: [
      [0, 0.45, 0, 1.6, 0.9, 1.3],
      [0.25, 1.15, -0.1, 1.0, 0.6, 0.8],
    ],
    dark: [
      [-0.75, 0.3, 0.45, 0.6, 0.6, 0.6],
      [0.85, 0.25, 0.4, 0.5, 0.5, 0.5],
    ],
  };

  const mesh = doc
    .createMesh('hubRock')
    .addPrimitive(buildBoxesPrim(doc, makeAccessor, boxDefs.light, matLight))
    .addPrimitive(buildBoxesPrim(doc, makeAccessor, boxDefs.dark, matDark));
  scene.addChild(doc.createNode('hubRock').setMesh(mesh));

  await new NodeIO().write(OUT_ROCK, doc);
  console.log(`written: ${OUT_ROCK}`);
}

// ボックス群([cx,cy,cz,sx,sy,sz])を 1 プリミティブに変換する共通ヘルパー
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
  return doc
    .createPrimitive()
    .setAttribute('POSITION', makeAccessor('VEC3', new Float32Array(positions)))
    .setAttribute('NORMAL', makeAccessor('VEC3', new Float32Array(normals)))
    .setIndices(makeAccessor('SCALAR', new Uint16Array(indices)))
    .setMaterial(material);
}

// ---- 6. 花(hub_flower.glb): コンパクトなボクセル調の一輪花(原点=底面中心) ----
// flower.glb(1-1 の花畑メッシュ)は縮小しても散布が広く紙吹雪ノイズになるため、
// 判別できる大きさの一輪花を新造する。花びらは 'hubFlowerPetals' ノードに分離し、
// HubView 側で clone ごとにマテリアルを差し替えて色違いを作れるようにする。
async function buildFlower() {
  const doc = new Document();
  doc.createBuffer();
  const scene = doc.createScene('hubFlower');
  doc.getRoot().setDefaultScene(scene);

  const makeAccessor = (type, array) =>
    doc.createAccessor().setType(type).setArray(array).setBuffer(doc.getRoot().listBuffers()[0]);

  const toLinear = (c) => Math.pow((c * LIGHT_INV) / 255, 2.2);
  const makeMat = (name, r, g, b) =>
    doc
      .createMaterial(name)
      .setBaseColorFactor([toLinear(r), toLinear(g), toLinear(b), 1])
      .setMetallicFactor(0)
      .setRoughnessFactor(1);
  const matStem = makeMat('flowerStem', 62, 150, 52); // 葉の緑(表示色)を逆算
  const matPetal = makeMat('flowerPetals', 224, 64, 64); // 既定は赤。clone 側で色替え

  const stemBoxes = [
    [0, 0.3, 0, 0.12, 0.6, 0.12], // 茎
    [0.16, 0.26, 0, 0.22, 0.08, 0.12], // 葉
    [-0.16, 0.4, 0, 0.22, 0.08, 0.12],
  ];
  const petalBoxes = [
    [0, 0.72, 0, 0.26, 0.22, 0.26], // 花芯
    [0.25, 0.72, 0, 0.2, 0.18, 0.2], // 花びら×4
    [-0.25, 0.72, 0, 0.2, 0.18, 0.2],
    [0, 0.72, 0.25, 0.2, 0.18, 0.2],
    [0, 0.72, -0.25, 0.2, 0.18, 0.2],
  ];

  const stemMesh = doc.createMesh('hubFlowerStem').addPrimitive(buildBoxesPrim(doc, makeAccessor, stemBoxes, matStem));
  const petalMesh = doc.createMesh('hubFlowerPetals').addPrimitive(buildBoxesPrim(doc, makeAccessor, petalBoxes, matPetal));
  const root = doc.createNode('hubFlower');
  root.addChild(doc.createNode('hubFlowerStem').setMesh(stemMesh));
  root.addChild(doc.createNode('hubFlowerPetals').setMesh(petalMesh));
  scene.addChild(root);

  await new NodeIO().write(OUT_FLOWER, doc);
  console.log(`written: ${OUT_FLOWER}`);
}

await build();
await buildRock();
await buildFlower();
