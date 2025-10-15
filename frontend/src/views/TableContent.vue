<template>
  <div class="content-page">
    <BackView />
    <UserInfo v-if="userStore.isLoggedIn" />
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
            <span v-if="isStageCleared(sub)" class="cleared-mark">〇</span>
            <span v-else class="cleared-mark"></span>
            <div class="sub-chapter-text">
              <span>{{ sub.id }}</span>
              <span>{{ sub.title }}</span>
            </div>
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
import UserInfo from '@/components/UserInfo.vue';
import { useUserStore } from '@/stores/userStore'; // ★ 変更点: Piniaストアをインポート

// --- データとルーターの準備 ---
const router = useRouter();
const route = useRoute();
const userStore = useUserStore(); // ★ 変更点: Piniaストアをインスタンス化

// --- 物語データ
const storyContent = {
  '1': {
    title: 'ももたろう',
    summary: `昔々、ある所に桃から生まれた男の子、桃太郎がいました。\n鬼ヶ島にいる鬼を退治するため、旅に出る物語です。`,
    chapter: [
      {
        number: '第一章',
        name: '刀購入編',
        subChapters: [
          { id: '1-1', title: '鍛冶の村へ', summary: 'まずは旅の準備だ！鬼を退治するには、「刀」と、仲間を集めるための「きびだんご」が必要だ。\n最初の目的地である「鍛冶の村」へ向かい、それらを手に入れよう！', routeName: 'Stage-1-1' },
        ]
      },
      {
        number: '第二章',
        name: '港町編 ',
        subChapters: [
          { id: '2-1', title: '国境の門番', summary: '刀は手に入れたが、仲間も船もない。\n村人の噂を信じて、両方が見つかるかもしれない「港町」へ！\nまずは目の前の関所を越えよう。', routeName: 'Stage-2-1' },
          { id: '2-2', title: '国境を越えて', summary: 'よし、門番が正しい門を教えてくれた。もう迷うことはない。\n目指すは港町だ！', routeName: 'Stage-2-2' },
        ]
      },
      {
        number: '第三章',
        name: '仲間集め編 ',
        subChapters: [
          { id: '3-1', title: 'きびだんごを配ろう', summary: '港町にはたくさんの動物がいる。鬼退治に協力してくれる仲間を探すため、\nまずはきびだんごを配って彼らと仲良くなることから始めよう！', routeName: 'Stage-3-1' },
          { id: '3-2', title: '仲間を誘おう', summary: '鬼退治の仲間は決まったが、鬼ヶ島へ行く手段がない。\n港の漁師なら、船を出してくれるかもしれない。話を聞きに行こう！', routeName: 'Stage-3-2' },
        ]
      },
      {
        number: '第四章',
        name: '鬼ヶ島編 ',
        subChapters: [
          { id: '4-1', title: '決戦！鬼ヶ島', summary: '仲間たちとの絆、漁師との約束。全てが揃った今、恐れるものはない。\nいざ、決戦の地「鬼ヶ島」へ！', routeName: 'Stage-4-1' },
          { id: '4-2', title: '冒険の終わり', summary: '見事、鬼を退治した！港町に戻ると、君の帰りを祝う宴が始まっている。\nこの旅で賢くなった仲間たちが、君の知恵を試したいようだ。', routeName: 'Stage-4-2' },
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
const selectedSubChapter = ref(null);
const clearedStages = ref(new Set()); // ★ 変更点: クリア済みステージIDを保持するSet

// ★ 変更点: クリア済みステージか判定する関数
const isStageCleared = (subChapter) => {
  return clearedStages.value.has(subChapter.stageId);
};

// ★ 変更点: クリア情報をバックエンドから取得する関数
const fetchClearedStages = async () => {
  // ログインしていなければ何もしない
  if (!userStore.isLoggedIn || !userStore.user?.id) {
    return;
  }
  try {
    const response = await fetch(`http://localhost:3000/api/records/${userStore.user.id}`);
    if (response.ok) {
      const records = await response.json();
      const clearedIds = records.map(record => record.stage_id);
      clearedStages.value = new Set(clearedIds);
    }
  } catch (error) {
    console.error('クリア情報の取得に失敗しました:', error);
  }
};


// --- クリック処理 ---
const selectChapter = (chapter) => {
  selectedChapter.value = (selectedChapter.value === chapter) ? null : chapter;
  selectedSubChapter.value = null;
};

const selectSubChapter = (subChapter) => {
  selectedSubChapter.value = subChapter;
};

const onClickSubChapter = () => {
  if (selectedSubChapter.value && selectedSubChapter.value.routeName) {
    router.push({ name: selectedSubChapter.value.routeName });
  } else {
    console.error('遷移先のrouteNameがデータに設定されていません。');
  }
};

const resetSelection = () => {
  selectedChapter.value = null;
};

// --- Three.jsの準備 (変更なし) ---
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

onMounted(() => {
  fetchClearedStages(); // ★ 変更点: マウント時にクリア情報を取得
  init();
  animate();
});

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
  width: 21em;
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
  align-items: center;
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
.sub-chapter-text {
  display: flex;
  gap: 0.5em;
}
.sub-chapter-text span:first-child {
  font-weight: bold;
}
/* ★ 変更点: クリアマーク用のCSS */
.cleared-mark {
  color: #28a745;
  font-weight: bold;
  font-size: 1.2em;
  width: 1.5em;
  text-align: center;
  flex-shrink: 0;
}
.synopsis-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 1rem;
  pointer-events: auto;
  position: relative;
  bottom: 5em;
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
  white-space: pre-wrap;
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
