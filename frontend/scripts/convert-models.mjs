// OBJ+MTL+パレット PNG → GLB 変換パイプライン(docs/asset-refactoring-plan.md PR-AS3)
//
//   node scripts/convert-models.mjs public/models/stage/background_village.obj [...他の .obj]
//
// 変換内容:
//   1. obj2gltf で GLB 化(テクスチャは PNG のまま埋め込み。ピクセル値は不変)
//   2. gltf-transform で dedup(重複リソース統合)→ weld(完全一致頂点の結合)→
//      prune(未使用データ除去)
//
// やらないこと(見た目維持のため。計画書 §5):
//   - quantize / simplify(ボクセルのエッジが崩れる可能性)
//   - テクスチャの再圧縮・リサイズ
//   - マテリアル値の書き換え(見た目の同一性は読み込み側の
//     assetLoader.loadGlbAsPhong が MeshPhongMaterial 再構築で担保する)
import obj2gltf from 'obj2gltf';
import { NodeIO } from '@gltf-transform/core';
import { KHRMeshQuantization } from '@gltf-transform/extensions';
import { dedup, weld, prune, quantize } from '@gltf-transform/functions';
import { writeFileSync, statSync } from 'node:fs';

// --quantize: 頂点属性の量子化(位置 16bit・法線 8bit・UV 16bit)。
// ボクセルモデルは座標が規則格子・法線が軸方向のみなので実質無劣化で
// 大幅にサイズが減る。適用時は必ずスクリーンショット差分で確認すること
// (計画書 §5「quantize は既定でオフ。試す場合は差分承認付きで」)。
const args = process.argv.slice(2);
const useQuantize = args.includes('--quantize');
const inputs = args.filter((a) => a !== '--quantize');
if (inputs.length === 0) {
  console.error('usage: node scripts/convert-models.mjs [--quantize] <model.obj> [...]');
  process.exit(2);
}

const io = new NodeIO().registerExtensions([KHRMeshQuantization]);

// obj2gltf は MTL の Kd/ Ks をそのまま(線形値として)baseColorFactor に書くが、
// three.js の MTLLoader は Kd を sRGB として解釈する。従来の見た目に合わせるため
// 単色成分を sRGB → 線形に変換する(テクスチャ持ちは factor が白なので影響なし)。
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

for (const objPath of inputs) {
  if (!objPath.endsWith('.obj')) {
    console.error(`skip(.obj ではない): ${objPath}`);
    continue;
  }
  const glbPath = objPath.replace(/\.obj$/, '.glb');

  // obj2gltf: 同名 .mtl と map_Kd のテクスチャを自動で解決して埋め込む
  const glb = await obj2gltf(objPath, { binary: true });

  const doc = await io.readBinary(new Uint8Array(glb.buffer, glb.byteOffset, glb.byteLength));
  for (const mat of doc.getRoot().listMaterials()) {
    const [r, g, b, a] = mat.getBaseColorFactor();
    mat.setBaseColorFactor([srgbToLinear(r), srgbToLinear(g), srgbToLinear(b), a]);
  }
  const transforms = [dedup(), weld(), prune()];
  if (useQuantize) {
    transforms.push(
      quantize({ quantizePosition: 16, quantizeNormal: 8, quantizeTexcoord: 16 }),
    );
  }
  await doc.transform(...transforms);
  const out = await io.writeBinary(doc);

  writeFileSync(glbPath, out);
  const before = statSync(objPath).size;
  const after = statSync(glbPath).size;
  console.log(
    `${objPath} -> ${glbPath}  ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB`,
  );
}
