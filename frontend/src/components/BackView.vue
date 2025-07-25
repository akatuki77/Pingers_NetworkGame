<template>
  <div ref="container" class="three-background"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three'; //three.jsのインポート
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';// OBJLoaderのインポート(形状)
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js'; // MTLLoaderのインポート(色)

const container = ref(null);

let renderer, scene, camera, model;
let animationId = null;

// Three.jsの初期化処理
const init = () => {
  scene = new THREE.Scene();//3Dモデルを配置する空間を作成

  // ★★★ ここからグラデーション背景の作成 ★★★
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 2; // グラデーションなので、幅は小さくてOK
  canvas.height = 512;

  // 上から下へのグラデーションを作成
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#a0d8ef'); // 上部の水色
  gradient.addColorStop(1, '#c2e9fb'); // 下部の薄い水色

  // グラデーションで塗りつぶす
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // 作成したCanvasからテクスチャを生成して背景に設定
  scene.background = new THREE.CanvasTexture(canvas);
  // ★★★ ここまで ★★★

  // カメラの設定
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 15;
  camera.position.x = 0;
  camera.position.y = 5;
  camera.lookAt(0, -5, 0); // カメラの向きを調整

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.value.appendChild(renderer.domElement);
  renderer.shadowMap.enabled = true; //　影を有効にする

  // ライトの設定
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // 明るさを調整
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 5);
  directionalLight.position.set(80, 50, -40);
  directionalLight.castShadow = true; // 影を落とす設定
  scene.add(directionalLight);

  const mtlLoader = new MTLLoader();
  mtlLoader.load(
    '/models/background/BackImage.mtl',
    (materials) => {
      materials.preload();
      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.load(
        '/models/background/BackImage.obj',
        (obj) => {
          model = obj;
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          model.position.sub(center);
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true; // 影を落とす
              child.receiveShadow = true; // 影を受ける
            }
          });
          scene.add(model);
        }
      );
    }
  );

  window.addEventListener('resize', onWindowResize);
};

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

const animate = () => {
  animationId = requestAnimationFrame(animate);
  if (model) {
    model.rotation.y += 0.0025;
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
}
</style>
