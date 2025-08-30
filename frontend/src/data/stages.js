// /src/data/stages.js

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

// モデル読み込み用のヘルパー関数
function loadGltfModel(path) {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(path, (gltf) => resolve(gltf.scene), undefined, reject);
  });
}
function loadObjModel(basePath, mtlFileName, objFileName) {
  return new Promise((resolve, reject) => {
    const mtlLoader = new MTLLoader();
    mtlLoader.setPath(basePath);
    mtlLoader.load(mtlFileName, (materials) => {
      materials.preload();
      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.setPath(basePath);
      objLoader.load(objFileName, resolve, undefined, reject);
    }, undefined, reject);
  });
}

// 各ステージの設計図
export const stages = {
  '1-1': {
    className: 'theme-village',
    // ---- このステージで使う3Dモデルのリスト ----
    assets: {
      background: () => loadObjModel('/models/character/', 'background_village.mtl', 'background_village.obj'),
      village: () => loadObjModel('/models/character/', 'village.mtl', 'village.obj'),
      lake: () => loadObjModel('/models/character/', 'village_lake.mtl', 'village_lake.obj'),
      flower: () => loadGltfModel('/models/character/flower.glb'),
    },
    // ---- シーンに配置するオブジェクトの情報  ----
    sceneObjects: [
      { assetName: 'background' },
      { assetName: 'lake', position: { x: -0.05, y: -2.5, z: 0 }, useRaycastY: true },
      { assetName: 'flower', position: { x: 0.4, y: -2.4, z: 0.5 }, rotation: { x: 0, y: -6.2, z: 0 }, useRaycastY: true }
    ],
    // ---- このステージのクイズ情報  ----
    quiz: {
      locations: [
        { name: "２丁目６ー１１", location: "花の村", position: { x: -0.7, z: -7.5 }, assetName: 'village', scale: 0.5 },
        { name: "２丁目３ー３５", location: "鍛冶の村", position: { x: 8, z: -6 }, assetName: 'village', scale: 0.5 },
        { name: "２丁目１ー６", location: "商人の村", position: { x: -9.5, z: -6.5 }, assetName: 'village', scale: 0.5 },
      ],
      question: (locationName) => `${locationName}の住所は何でしょうか。`,
      explanation: `鍛冶の村の住所は「２丁目３番３５号」だね！

実は、このお話はネットワークの世界とそっくりなんだ。
君が操作していた桃太郎は、情報を運ぶ小さなデータ「パケット」。
そして、目的地の「鍛冶の村」は、パケットが届けられる「宛先」なんだよ。

手紙に住所が必要なように、パケットを正確に届けるためにも「IPアドレス」という住所が絶対に必要になるんだ。
君が正しい住所を見つけられたから、桃太郎は鍛冶の村にたどり着けたんだね！`
    }
  },
};
