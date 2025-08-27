<template>
  <div class="content-page">
    <BackView />
    <div ref="container" class="canvas-container"></div>
    <BackButton to="/select-story" />

    <div ref="storyOverlay" class="story-overlay">
      <template v-if="currentStory">
        <h1 class="story-title">{{ currentStory.title }}</h1>
        <ul class="chapter-list" :style="dynamicListStyle">
          <li v-for="chapter in currentStory.chapter" :key="chapter.number" @click="selectChapter(chapter)">
            <div class="chapter">{{ chapter.number }}</div>
            <div class="edited">{{ chapter.name }}</div>
          </li>
        </ul>
      </template>
    </div>

    <div ref="subChapterOverlay" class="sub-chapter-overlay">
      <template v-if="selectedChapter">
        <ul class="sub-chapter-list">
          <li v-for="sub in selectedChapter.subChapters" :key="sub.id" @click="onClickSubChapter()">
            <span>{{ sub.id }}</span>
            <span>{{ sub.title }}</span>
          </li>
        </ul>
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
    chapter: [
      {
        number: '第一章',
        name: '刀購入編',
        subChapters: [
          { id: '1-1', title: '鍛冶の村' },
          { id: '1-2', title: '' },
          { id: '1-3', title: '' },
        ]
      },
      {
        number: '第二章',
        name: '港町編',
        subChapters: [
          { id: '2-1', title: '' },
          { id: '2-2', title: '' },
        ]
      },
      {
        number: '第三章',
        name: '仲間づくり編',
        subChapters: [
          { id: '3-1', title: '' },
          { id: '3-2', title: '' },
        ]
      },
      {
        number: '第四章',
        name: '鬼ヶ島編',
        subChapters: [
          { id: '4-1', title: '' },
          { id: '4-2', title: '' },
        ]
      },
    ],
  },
  '2': {
    title: 'うらしまたろう',
    chapter: [
      {
        number: '第一章',
        name: '亀との出会い',
        subChapters: [
          { id: '2-1-1', title: '浜辺にて' },
        ]
      },
    ],
  },
};
const dynamicListStyle = computed(() => {
  if (!currentStory.value) return {};

  const chapterCount = currentStory.value.chapter.length;

  // 1〜4章のときの基準サイズ
  let fontSize = '1em';

  // 条件に応じて基準サイズを上書き
  if (chapterCount >= 7) {        // 7章以上なら
    fontSize = '0.7em';
  } else if (chapterCount >= 5) { // 5章か6章なら
    fontSize = '0.85em';
  }

  return { fontSize };
});
const currentStory = computed(() => storyContent[route.params.id] || null);

// --- 状態管理 ---
const container = ref(null);
const storyOverlay = ref(null);      // 左パネルのHTML要素
const subChapterOverlay = ref(null);  // 右パネルのHTML要素
const selectedChapter = ref(null);    // 選択された章オブジェクト

// --- クリック処理 ---
const selectChapter = (chapter) => {
  selectedChapter.value = (selectedChapter.value === chapter) ? null : chapter;
};

const onClickSubChapter = () => {
  router.push(`/stageOne`);
};
// --- Three.jsの準備 ---
let renderer, css3dRenderer, scene, camera, model;
let storyLabel = null;      // 左パネルの3Dオブジェクト
let subChapterLabel = null; // 右パネルの3Dオブジェクト
let animationId = null;

// 選択状態を監視して、右パネルの表示/非表示を制御
watch(selectedChapter, (newSelection) => {
  if (subChapterLabel) {
    subChapterLabel.visible = !!newSelection;
  }
});
// ストーリーが切り替わったら選択状態をリセット
watch(currentStory, () => {
  selectedChapter.value = null;
});

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
  css3dRenderer.domElement.style.pointerEvents = 'auto'; // クリックを有効に
  localContainer.appendChild(css3dRenderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
  scene.add(directionalLight);

  // 左パネルの3Dオブジェクト化
  if (storyOverlay.value) {
    storyLabel = new CSS3DObject(storyOverlay.value);
    storyLabel.rotation.x = -Math.PI / 2;
    storyLabel.scale.set(0.02, 0.02, 0.02);
    storyLabel.position.set(-5.5, 0.1, 0.5); // 左パネルの位置
    storyLabel.visible = !!currentStory.value;
  }

  // 右パネルの3Dオブジェクト化
  if (subChapterOverlay.value) {
    subChapterLabel = new CSS3DObject(subChapterOverlay.value);
    subChapterLabel.rotation.x = -Math.PI / 2;
    subChapterLabel.scale.set(0.02, 0.02, 0.02);
    subChapterLabel.position.set(3, 0.1, 2); // 右パネルの位置 (X座標を調整)
    subChapterLabel.visible = false; // 最初は非表示
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

      // 両方のラベルをモデルに追加
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
  pointer-events: none; /* 親はクリックを透過 */
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
}

.chapter-list {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  list-style: none;
  padding: 0;
  margin: 0;
  overflow: auto;
}

.chapter-list li {
  display: flex;
  flex-direction: column;
  pointer-events: auto; /* li自体はクリック対象に */
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

/* 右パネルのスタイル */
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
}
.sub-chapter-list li:hover {
  background-color: rgba(0, 0, 0, 0.1);
}
.sub-chapter-list li span:first-child {
  font-weight: bold;
}
</style>
