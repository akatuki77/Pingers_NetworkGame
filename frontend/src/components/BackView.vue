<template>
  <div ref="container" class="three-background"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const container = ref(null);

let renderer, scene, camera;
let stageGroup = null; // 全てのステージオブジェクトをまとめるグループ
let animationId = null;
const raycaster = new THREE.Raycaster(); // 地面の高さを取得するために使用

// Three.jsの初期化処理
const init = () => {
  scene = new THREE.Scene();

  // グラデーション背景の作成
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 2;
  canvas.height = 512;
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#59c0f3');
  gradient.addColorStop(1, '#97d7fd');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  scene.background = new THREE.CanvasTexture(canvas);

  // カメラの設定 (ステージ全体が見えるように調整)
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 13, 20); // 少し上から見下ろす視点
  camera.lookAt(0, 0, 0);

  // レンダラーの設定
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  container.value.appendChild(renderer.domElement);

  // ライトの設定
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 4.0);
  directionalLight.position.set(10, 15, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  // ステージモデルの読み込み
  loadStageModels();

  window.addEventListener('resize', onWindowResize);
};

// GLTFモデルを読み込むヘルパー関数
function loadGltfModel(path) {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(path, resolve, undefined, reject);
  });
}

// OBJ/MTLモデルを読み込むヘルパー関数
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

// ステージを構成するモデルを全て読み込む
function loadStageModels() {
    // 回転させる全てのオブジェクトをこのグループに追加する
    stageGroup = new THREE.Group();
    scene.add(stageGroup);

    const castleLocations = [
        { name: "２丁目６ー１１", location: "花の村", x: -0.7, z: -7.5 },
        { name: "２丁目３ー３５", location: "鍛冶の村", x: 8, z: -6 },
        { name: "２丁目１ー６", location: "商人の村", x: -9.5, z: -6.5 }
    ];

    Promise.all([
        loadObjModel('/models/character/', 'background_village.mtl', 'background_village.obj'),
        loadObjModel('/models/character/', 'village.mtl', 'village.obj'),
        loadObjModel('/models/character/', 'village_lake.mtl', 'village_lake.obj'),
        loadGltfModel('/models/character/flower.glb'),
    ])
    .then(([background, loadedVillage, loadedLake, loadedFlower]) => {
        // 1. 地面を追加
        stageGroup.add(background);

        let rayOrigin, intersects, groundY;

        // 2. 3つの村をクローンして配置
        castleLocations.forEach(location => {
            const village = loadedVillage.clone();
            village.scale.set(0.5, 0.5, 0.5);

            // 地面の高さに合わせてY座標を調整
            rayOrigin = new THREE.Vector3(location.x, 100, location.z);
            raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
            intersects = raycaster.intersectObject(background, true);
            groundY = intersects.length > 0 ? intersects[0].point.y : 0;

            village.position.set(location.x, groundY, location.z);
            stageGroup.add(village);
        });

        // 3. 湖を配置
        const lakePosition = { x: -0.05, z: 0 };
        rayOrigin = new THREE.Vector3(lakePosition.x, 100, lakePosition.z);
        raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
        intersects = raycaster.intersectObject(background, true);
        groundY = intersects.length > 0 ? intersects[0].point.y : 0;
        loadedLake.position.set(lakePosition.x, groundY - 2.5, lakePosition.z);
        stageGroup.add(loadedLake);

        // 4. 花を配置
        const flower = loadedFlower.scene;
        const flowerPosition = { x: 0.4, z: 0.5 };
        rayOrigin = new THREE.Vector3(flowerPosition.x, 100, flowerPosition.z);
        raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
        intersects = raycaster.intersectObject(background, true);
        groundY = intersects.length > 0 ? intersects[0].point.y : 0;
        flower.position.set(flowerPosition.x, groundY - 2.4, flowerPosition.z);
        flower.rotation.y = -6.2;
        stageGroup.add(flower);

        // 全てのオブジェクトで影が描画されるように設定
        stageGroup.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
    });
}

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

// アニメーションループ
const animate = () => {
  animationId = requestAnimationFrame(animate);

  // stageGroupが読み込み完了していたら回転させる
  if (stageGroup) {
    stageGroup.rotation.y += 0.002;
  }

  renderer.render(scene, camera);
};

onMounted(() => {
  init();
  animate();
});

onUnmounted(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', onWindowResize);
  if (renderer) {
    renderer.dispose();
  }
});
</script>

<style scoped>
.three-background {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  overflow: hidden; /* スクロールバーを隠す */
}
</style>
