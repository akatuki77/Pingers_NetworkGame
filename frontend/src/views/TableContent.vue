<template>
  <div class="content-page">
    <BackView />
    <div ref="container" class="canvas-container"></div>
    <BackButton to="/select-story" />

    <div ref="storyOverlay" class="story-overlay" v-if="currentStory">
      <h1 class="story-title">{{ currentStory.title }}</h1>
      <ul class="chapter-list">
        <li v-for="chapter in currentStory.chapter" :key="chapter.number">
          <span>{{ chapter.number }}</span>
          <span>{{ chapter.name }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'; // ★ インポート
import BackView from '@/components/BackView.vue';
import BackButton from '@/components/BackButton.vue';

// --- データとルーターの準備 ---
const route = useRoute();
const storyContent = {
  '1': {
    title: 'ももたろう', chapter: [{number: '第一章', name: 'テスト編'}, {number: '第二章', name: 'テスト2編'}, {number: '第三章', name: 'テスト3編'}, {number: '第四章', name: 'テスト4編'}] },
  '2': { title: 'うらしまたろう', chapter: [{number: '第一章', name: 'テスト編'}, {number: '第二章', name: 'テスト2編'}, {number: '第三章', name: 'テスト3編'}, {number: '第四章', name: 'テスト4編'}] }
};
const currentStory = computed(() => storyContent[route.params.id] || null);

// --- Three.jsの準備 ---
const container = ref(null);
const storyOverlay = ref(null); // ★ HTML要素へのref
let renderer, css2dRenderer, scene, camera, model; // ★ css2dRenderer変数を追加
let animationId = null;

const init = () => {
  const localContainer = container.value;
  if (!localContainer) return;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, localContainer.clientWidth / localContainer.clientHeight, 0.1, 1000);

  // --- WebGLRenderer (3Dオブジェクト用) ---
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(localContainer.clientWidth, localContainer.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  localContainer.appendChild(renderer.domElement);

  // ★★★ CSS2DRenderer (HTML要素用) のセットアップ ★★★
  css2dRenderer = new CSS2DRenderer();
  css2dRenderer.setSize(localContainer.clientWidth, localContainer.clientHeight);
  css2dRenderer.domElement.style.position = 'absolute';
  css2dRenderer.domElement.style.top = '0px';
  localContainer.appendChild(css2dRenderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
  scene.add(directionalLight);

  const mtlLoader = new MTLLoader();
  const objLoader = new OBJLoader();
  mtlLoader.load('/models/select/opened_book.mtl', (materials) => {
    materials.preload();
    objLoader.setMaterials(materials);
    objLoader.load('/models/select/opened_book.obj', (obj) => {
      model = obj;

      model.scale.set(2, 2, 2);
      const bbox = new THREE.Box3().setFromObject(model);
      const center = bbox.getCenter(new THREE.Vector3());
      model.position.sub(center);
      camera.position.set(0, 17, 0);
      camera.lookAt(0, 0, 0);

      // ★★★ HTML要素を3Dオブジェクトとして扱う ★★★
      if (storyOverlay.value) {
        const storyLabel = new CSS2DObject(storyOverlay.value);
        storyLabel.position.set(-7, 1.5, -2.5); // 本の少し上の位置に調整
        model.add(storyLabel); // ★本の子要素として追加
      }

      scene.add(model);
    });
  });

  window.addEventListener('resize', onWindowResize);
};

const onWindowResize = () => {
  const localContainer = container.value;
  if (!localContainer || !renderer || !camera) return;
  camera.aspect = localContainer.clientWidth / localContainer.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(localContainer.clientWidth, localContainer.clientHeight);
  css2dRenderer.setSize(localContainer.clientWidth, localContainer.clientHeight); // ★こちらもリサイズ
};

const animate = () => {
  animationId = requestAnimationFrame(animate);
  renderer.render(scene, camera);
  css2dRenderer.render(scene, camera); // ★こちらも描画
};

onMounted(() => { init(); animate(); });
onUnmounted(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', onWindowResize);
  if (renderer) renderer.dispose();
});
</script>

<style scoped>
.canvas-container, .story-overlay {
  position: absolute;
  top: 0;
  left: 0;
}
.canvas-container {
  width: 100%;
  height: 100%;
}
.content-page {
  overflow: hidden;
}

/* ★ CSSでの中央揃えは不要になるのでシンプルなスタイルに */
.story-overlay {
  padding: 1rem;
  background-color: red;
  color: #333;
  pointer-events: none; /* ★ 3Dシーンのクリックを妨げないように */
}

</style>
