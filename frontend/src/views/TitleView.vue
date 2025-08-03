<template>
  <BackView />

  <div class="content-overlay">
    <div ref="titleContainer" class="title-canvas-container"></div>

    <button @click="startGame" class="start-button">はじめる</button>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { useRouter } from 'vue-router';
import BackView from '@/components/BackView.vue';

const router = useRouter();
const titleContainer = ref(null);
let renderer, scene, camera, model;
let animationId = null;

// ★ ボタンクリック時の関数を追加
const startGame = () => {
  router.push('/select-story'); // ストーリー選択に移動
};

const initTitleScene = () => {
  const container = titleContainer.value;
  if (!container) return;

  scene = new THREE.Scene();
  // ★ カメラのアスペクト比を描画領域に合わせる
  camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);

  const mtlLoader = new MTLLoader();
  mtlLoader.load(
    '/models/title/GameTitle-v2.mtl',
    (materials) => {
      materials.preload();
      const objLoader = new OBJLoader();
      objLoader.setMaterials(materials);
      objLoader.load(
        '/models/title/GameTitle-v2.obj',
        (obj) => {
          model = obj;
          model.scale.set(2, 2, 2); // スケールを調整
          scene.add(model);

          camera.position.set(0, 5, 8);//カメラの位置
          camera.lookAt(0, 3, 0); //カメラの向き
        }
      );
    }
  );

  window.addEventListener('resize', onWindowResize);
};

const onWindowResize = () => {
  const container = titleContainer.value;
  if (!container || !renderer || !camera) return;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
};

const animate = () => {
  animationId = requestAnimationFrame(animate);
  if (model) {
    model.position.y = Math.sin(Date.now() * 0.001) * 3;
  }
  if (renderer) {
    renderer.render(scene, camera);
  }
};

onMounted(() => { initTitleScene(); animate(); });
onUnmounted(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', onWindowResize);
  if (renderer) renderer.dispose();
});
</script>

<style scoped>
.content-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}
.title-canvas-container {
  width: 100%;
  height: 100%;
}

/* ★ ボタンのスタイルを追加 */
.start-button {
  position: absolute;
  bottom: 25%;
  padding: 12px 48px;
  font-size: 2.5em;
  font-weight: bold;
  color: white;
  background-color: rgba(0, 0, 0, 0.4);
  border: 2px solid white;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(2px);
}
.start-button:hover {
  background-color: white;
  color: black;
}
</style>
