<template>
  <div class="content-page">
    <BackView />
    <div ref="container" class="canvas-container"></div>
    <BackButton to="/select-story" />

    <div ref="storyOverlay" class="story-overlay">
      <template v-if="currentStory">
        <h1 class="story-title" @click="resetSelection">{{ currentStory.title }}</h1>
        <ul class="chapter-list">
          <li v-for="chapter in currentStory.chapter" :key="chapter.number" @click="selectChapter(chapter)">
            <div class="chapter">{{ chapter.number }}</div>
            <div class="edited">{{ chapter.name }}</div>
          </li>
        </ul>
      </template>
    </div>

    <div ref="subChapterOverlay" class="sub-chapter-overlay">
      <template v-if="selectedSubChapter">
        <div class="synopsis-view">
          <h2 class="synopsis-title">{{ selectedSubChapter.id }} {{ selectedSubChapter.title }}</h2>
          <p class="synopsis-text">{{ selectedSubChapter.summary }}</p>
          <div class="synopsis-actions">
            <button @click="onClickSubChapter" class="action-button">ステージへ</button>
            <button @click="selectedSubChapter = null" class="back-list-button">一覧へ戻る</button>
          </div>
        </div>
      </template>

      <template v-else-if="selectedChapter">
        <ul class="sub-chapter-list">
          <li v-for="sub in selectedChapter.subChapters" :key="sub.id" @click="selectSubChapter(sub)">
            <span>{{ sub.id }}</span>
            <span>{{ sub.title }}</span>
          </li>
        </ul>
      </template>

      <template v-else-if="currentStory">
        <p class="summary-text">{{ currentStory.summary }}</p>
      </template>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { useRoute, useRouter} from 'vue-router';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import BackView from '@/components/BackView.vue';
import BackButton from '@/components/BackButton.vue';

// --- データとルーターの準備 ---
const router = useRouter();
const route = useRoute();

const storyContent = {
  '1': {
    title: 'ももたろう',
    summary: `昔々、ある所に桃から生まれた男の子、桃太郎がいました。
鬼ヶ島にいる鬼を退治するため、旅に出る物語です。`,
    chapter: [
      {
        number: '第一章',
        name: '刀購入編',
        subChapters: [
          // ★★★ subChaptersにあらすじ(summary) ★★★
          { id: '1-1', title: '鍛冶の村', summary: 'あらすじ' },
        ]
      },
      { number: '第二章',
        name: '港町編',
        subChapters: [
          { id: '2-1', title: 'タイトル', summary: 'あらすじ' },
          { id: '2-2', title: 'タイトル', summary: 'あらすじ' }
        ]
      },
      { number: '第三章',
        name: '仲間集め編',
        subChapters: [
          { id: '3-1', title: 'タイトル', summary: 'あらすじ' },
          { id: '3-2', title: 'タイトル', summary: 'あらすじ' },
        ]
      },
      { number: '第四章',
        name: '鬼ヶ島編',
        subChapters: [
          { id: '4-1', title: 'タイトル', summary: 'あらすじ' },
          { id: '4-2', title: 'タイトル', summary: 'あらすじ' },
        ]
      },
    ],
  },
};

const currentStory = computed(() => storyContent[route.params.id] || null);

// --- 状態管理 ---
const container = ref(null);
const storyOverlay = ref(null);
const subChapterOverlay = ref(null);
const selectedChapter = ref(null);
const selectedSubChapter = ref(null); // ★★★ 選択されたサブチャプターの状態を追加 ★★★

// --- クリック処理 ---
const selectChapter = (chapter) => {
  selectedChapter.value = (selectedChapter.value === chapter) ? null : chapter;
  selectedSubChapter.value = null; // 章を切り替えたらサブチャプターの選択はリセット
};

// ★★★ サブチャプターを選択する関数を新設 ★★★
const selectSubChapter = (subChapter) => {
  selectedSubChapter.value = subChapter;
};

// ステージに移動する関数（変更なし）
const onClickSubChapter = () => {
  router.push(`/stageOne`);
};

const resetSelection = () => {
  selectedChapter.value = null;
};

// --- Three.jsの準備 (省略) ---
let renderer, css3dRenderer, scene, camera, model, storyLabel, subChapterLabel, animationId;
watch(currentStory, () => { selectedChapter.value = null; });
const init = () => {
  const localContainer = container.value;
  if (!localContainer) return;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, localContainer.clientWidth / localContainer.clientHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(localContainer.clientWidth, localContainer.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  localContainer.appendChild(renderer.domElement);
  css3dRenderer = new CSS3DRenderer();
  css3dRenderer.setSize(localContainer.clientWidth, localContainer.clientHeight);
  css3dRenderer.domElement.style.position = 'absolute';
  css3dRenderer.domElement.style.top = '0px';
  css3dRenderer.domElement.style.pointerEvents = 'auto';
  localContainer.appendChild(css3dRenderer.domElement);
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
  scene.add(directionalLight);
  if (storyOverlay.value) {
    storyLabel = new CSS3DObject(storyOverlay.value);
    storyLabel.rotation.x = -Math.PI / 2;
    storyLabel.scale.set(0.02, 0.02, 0.02);
    storyLabel.position.set(-5.5, 0.1, 0.5);
    storyLabel.visible = !!currentStory.value;
  }
  if (subChapterOverlay.value) {
    subChapterLabel = new CSS3DObject(subChapterOverlay.value);
    subChapterLabel.rotation.x = -Math.PI / 2;
    subChapterLabel.scale.set(0.02, 0.02, 0.02);
    subChapterLabel.position.set(3, 0.1, 2);
    subChapterLabel.visible = true;
  }
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
      if (storyLabel) model.add(storyLabel);
      if (subChapterLabel) model.add(subChapterLabel);
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
  css3dRenderer.setSize(localContainer.clientWidth, localContainer.clientHeight);
};
const animate = () => {
  animationId = requestAnimationFrame(animate);
  renderer.render(scene, camera);
  css3dRenderer.render(scene, camera);
};
onMounted(() => { init(); animate(); });
onUnmounted(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', onWindowResize);
  if (renderer) renderer.dispose();
});
</script>

<style scoped>
.content-page {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
}

.canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.story-overlay,
.sub-chapter-overlay {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  color: #333;
  border-radius: 10px;
  pointer-events: none;
}

.story-overlay {
  width: 23em;
  height: 33em;
}

.sub-chapter-overlay {
  width: 18em;
  height: 33em;
}

.story-title {
  font-size: 3rem;
  font-weight: bold;
  padding-bottom: 0.5em;
  flex-shrink: 0;
  cursor: pointer;
  pointer-events: auto;
}

.story-title:hover {
  color: #555;
}

.summary-text {
  font-size: 1.5em;
  line-height: 1.6;
  padding: 1rem;
  white-space: pre-wrap;
}

.chapter-list {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  list-style: none;
  padding: 0;
  margin: 0;
  overflow: auto;
  font-size: 1em;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.chapter-list::-webkit-scrollbar {
  display: none;
}

.chapter-list li {
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  cursor: pointer;
  padding: 0.5em;
  margin-bottom: 0.5em;
  border-radius: 5px;
}

.chapter-list li:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.chapter {
  font-size: 0.8em;
  font-weight: bold;
  color: #444;
  padding-bottom: 1em;
  width: fit-content;
}

.edited {
  font-size: 1.5em;
  font-weight: bold;
}

.sub-chapter-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sub-chapter-list li {
  display: flex;
  gap: 0.5em;
  font-size: 1.5em;
  padding: 0.3em 0.5em;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  pointer-events: auto;
}

.sub-chapter-list li:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.sub-chapter-list li span:first-child {
  font-weight: bold;
}

/* ★★★ あらすじ表示用のスタイル ★★★ */
.synopsis-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem;
  pointer-events: auto;
}
.synopsis-title {
  font-size: 1.8em;
  font-weight: bold;
  margin-bottom: 1em;
  color: #333;
}
.synopsis-text {
  font-size: 1.1em;
  line-height: 1.7;
  color: #555;
}
.synopsis-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 4rem;
}
.action-button, .back-list-button {
  padding: 0.8em;
  font-size: 1.1em;
  font-weight: bold;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  transition: background-color 0.2s;
}
.action-button {
  background-color: #8a6d3b;
  color: white;
}
.action-button:hover {
  background-color: #6c542d;
}
.back-list-button {
  background-color: transparent;
  color: #555;
  border: 1px solid #ccc;
}
.back-list-button:hover {
  background-color: #f0f0f0;
}
</style>
