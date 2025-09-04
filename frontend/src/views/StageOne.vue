<template>
  <div>
    <div ref="canvasContainer"></div>

    <div
      v-for="(label, index) in persistentLabels"
      :key="`label-${index}`"
      class="persistent-label"
      :class="{ hidden: !label.visible }"
      :style="{ top: `${label.y}px`, left: `${label.x}px` }"
    >
      {{ label.text }}
    </div>

    <div
      id="speech-bubble"
      :class="{ hidden: !speechBubble.visible }"
      :style="{ top: `${speechBubble.y}px`, left: `${speechBubble.x}px` }"
    >
      <p>{{ speechBubble.text }}</p>
    </div>

    <button id="question-button" @click="showQuestionModal">
      問題文を表示
    </button>

    <div id="question-modal" class="modal" :class="{ hidden: !isQuestionModalVisible }">
      <div class="modal-content">
        <p id="question-modal-text">{{ questionText }}</p>
        <button @click="hideQuestionModal">閉じる</button>
      </div>
    </div>

    <div id="answer-modal" class="modal" :class="{ hidden: !isAnswerModalVisible }">
      <div id="modal-content" :class="{ 'correct-answer-content': isCorrect }">
        <div id="question-modal-text">
          <template v-if="!isCorrect">
            <input
              ref="answerInput"
              type="text"
              v-model="userAnswer"
              placeholder="答えを入力"
              @keydown.enter="submitAnswer"
            />
            <button @click="submitAnswer">回答</button>
            <p id="feedback-text" :style="{ color: feedbackColor }">
              {{ feedbackText }}
            </p>
          </template>
          <template v-else>
            <div class="clear-display-area">
              <p id="feedback-text" :style="{ color: feedbackColor }">
                {{ feedbackText }}
              </p>
              <div class="correct-animation-container">
                <img :src="kiraKiraGif" alt="キラキラ背景" class="kirakira-background">
                <img :src="momoPng" alt="桃太郎" class="momo-image">
                <img
                  :src="bladeBagPng"
                  alt="刀袋"
                  class="blade-bag-image"
                  :class="{ 'show-blade-bag': showBladeBag }"
                >
              </div>
              <button @click="showExplanation">
                解説を見る
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div id="explanation-modal" class="modal" :class="{ hidden: !isExplanationModalVisible }">
      <div class="modal-content">
        <div id="question-modal-text">
          <h2>クリア！</h2>
          <p id="explanation-text">{{ explanationText }}</p>
        </div>
        <button @click="closeExplanation">一覧に戻る</button>
      </div>
    </div>

    <div id="key-guide">
      <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> 移動  <kbd>Space</kbd> ジャンプ  <kbd>Enter</kbd> 回答入力
    </div>
  </div>

  <BackButton to="/content/1" />
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from "vue";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import BackButton from "@/components/BackButton.vue";
import { useCharacterKeymap } from "@/composable/useCharacterKeymap.js";
import { useCharacter } from "@/composable/useCharacter.js";
import { useKeyboard } from "@/composable/useKeyboard.js";
import { useRouter } from "vue-router";

// === Vue リアクティブな状態管理 ===
const canvasContainer = ref(null);
const answerInput = ref(null);

// UIの状態
const speechBubble = ref({ visible: false, text: "", x: 0, y: 0 });
const isAnswerModalVisible = ref(false);
const isExplanationModalVisible = ref(false);
const isCorrect = ref(false);
const persistentLabels = ref([]);
const isQuestionModalVisible = ref(false);

// クリア演出関連
const momoPng = ref('/models/clear/momo.png');
const kiraKiraGif = ref('/models/clear/kira_kira.gif');
const bladeBagPng = ref('/models/clear/blade_bag.png');
const showBladeBag = ref(false);

// クイズデータ
const questionText = ref("");
const userAnswer = ref("");
const feedbackText = ref("");
const feedbackColor = ref("black");
const explanationText = ref("ステージで学んだことについての説明");

// === three.js関連の変数 (リアクティブにしない) ===
let scene, camera, renderer, controls, background, backgroundBox;
const collidableObjects = [];
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();

// composableの呼び出し
const characterHook = useCharacter();
const { keysPressed } = useKeyboard();
useCharacterKeymap(characterHook, keysPressed);

// 衝突したオブジェクトを保持
let collisionTargetObject = null;

// クイズ情報
let currentQuestionIndex = 1;
const castleLocations = [
  { name: "住所；2-6-11", location: "花の村", x: -0.7, z: -7.5, object: null },
  { name: "住所；2-3-35", location: "鍛冶の村", x: 8, z: -6, object: null },
  { name: "住所；2-1-6", location: "商人の村", x: -9.5, z: -6.5, object: null }
];
let animationFrameId;

const router = useRouter();

// === 初期化処理 ===
onMounted(() => {
  showQuestionModal();
  initThree();
  loadModels();
  setupEventListeners();
  displayQuestion();
  animate();
});

// === クリーンアップ処理 ===
onUnmounted(() => {
  cancelAnimationFrame(animationFrameId);
  cleanupEventListeners();
  if (renderer) {
    renderer.dispose();
  }
});

// === three.jsのセットアップ ===
function initThree() {
  scene = new THREE.Scene();
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

  camera = new THREE.PerspectiveCamera( 11, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(80, 50, 25);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  canvasContainer.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.enabled = false;
  controls.update();

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 5.0);
  directionalLight.position.set(10, 15, -5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -20;
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 20;
  scene.add(directionalLight);
}

// === モデル読み込み ===
function loadGltfModel(path) {
  return new Promise((resolve, reject) => {
    new GLTFLoader().load(path, resolve, undefined, reject);
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

function loadModels() {
    Promise.all([
      loadObjModel('/models/stage/', 'background_village.mtl', 'background_village.obj'),
      loadObjModel('/models/object/', 'village.mtl', 'village.obj'),
      loadObjModel('/models/object/', 'village_lake.mtl', 'village_lake.obj'),
      loadGltfModel('/models/object/flower.glb'),
    ])
    .then(async ([Background, loadedVillage, loadedLake, loadedFlower]) => {
      background = Background;
      scene.add(background);
      collidableObjects.push(background);

      let rayOrigin, intersects, groundY;

      castleLocations.forEach(location => {
          const village = loadedVillage.clone();
          village.scale.set(0.5, 0.5, 0.5);
          location.object = village;
          rayOrigin = new THREE.Vector3(location.x, 100, location.z);
          raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
          intersects = raycaster.intersectObject(background, true);
          groundY = intersects.length > 0 ? intersects[0].point.y : 0;
          village.position.set(location.x, groundY, location.z);
          scene.add(village);
          collidableObjects.push(village);
      });

      const lakePosition = { x: -0.05, y: 0, z: 0 };
      rayOrigin = new THREE.Vector3(lakePosition.x, 100, lakePosition.z);
      raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
      intersects = raycaster.intersectObject(background, true);
      groundY = intersects.length > 0 ? intersects[0].point.y : 0;
      loadedLake.position.set(lakePosition.x, groundY - 2.5, lakePosition.z);
      scene.add(loadedLake);

      const flower = loadedFlower.scene.clone();
      const flowerPosition = { x: 0.4, y: 0, z: 0.5 };
      rayOrigin = new THREE.Vector3(flowerPosition.x, 100, flowerPosition.z);
      raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
      intersects = raycaster.intersectObject(background, true);
      groundY = intersects.length > 0 ? intersects[0].point.y : 0;
      flower.position.set(flowerPosition.x, groundY - 2.4, flowerPosition.z);
      flower.rotation.y = -6.2;
      scene.add(flower);
      collidableObjects.push(flower);

      scene.traverse(child => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      backgroundBox = new THREE.Box3().setFromObject(background);
      await characterHook.loadCharacter(scene);

      persistentLabels.value = castleLocations.map(loc => ({
        text: loc.location,
        x: 0,
        y: 0,
        visible: true,
        sourceObject: loc.object
      }));
    });
}

// === イベントリスナー ===
function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
}

function cleanupEventListeners() {
    window.removeEventListener('resize', onWindowResize);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

watch(() => keysPressed.value['enter'], (isPressed) => {
  if (isPressed && !isAnswerModalVisible.value && isQuestionModalVisible.value === false) {
    isAnswerModalVisible.value = true;
    nextTick(() => {
      if(answerInput.value) answerInput.value.focus();
    });
  }
});

watch(() => keysPressed.value['escape'], (isPressed) => {
  if (isPressed) {
    isAnswerModalVisible.value = false;
    isExplanationModalVisible.value = false;
    isQuestionModalVisible.value = false;
  }
});

// アニメーションループ
function animate() {
    animationFrameId = requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (characterHook.mixer) characterHook.mixer.update(delta);

    if (characterHook.character && background) {
        characterHook.updatePosition({
        delta,
        keysPressed: keysPressed.value,
        raycaster,
        collidableObjects,
        castleLocations,
        backgroundBox
    });

    const detectionRadius = 3.0;
    let closestCastle = null;
    let minDistance = Infinity;
    const characterPosition = characterHook.character.position;

    castleLocations.forEach(location => {
        const castlePos = new THREE.Vector3(location.x, characterPosition.y, location.z);
        const distance = characterPosition.distanceTo(castlePos);
        if (distance < minDistance) {
            minDistance = distance;
            closestCastle = location;
        }
    });

    if (closestCastle && minDistance < detectionRadius) {
        speechBubble.value.visible = true;
        speechBubble.value.text = closestCastle.name;
        collisionTargetObject = closestCastle.object;
    } else {
        speechBubble.value.visible = false;
        collisionTargetObject = null;
    }

    updateSpeechBubble();
    updatePersistentLabels();
  }

    controls.update();
    renderer.render(scene, camera);
}

function updateSpeechBubble() {
    if (!speechBubble.value.visible || !collisionTargetObject) return;
    const vector = new THREE.Vector3();

    collisionTargetObject.updateMatrixWorld();
    vector.setFromMatrixPosition(collisionTargetObject.matrixWorld).add(new THREE.Vector3(0, 2.5, 0));
    vector.project(camera);

    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;
    speechBubble.value.x = (vector.x * widthHalf) + widthHalf;
    speechBubble.value.y = -(vector.y * heightHalf) + heightHalf;
}

function updatePersistentLabels() {
  if (!camera) return;
  const widthHalf = window.innerWidth / 2;
  const heightHalf = window.innerHeight / 2;

  persistentLabels.value.forEach(label => {
    if (!label.sourceObject) return;
    const vector = new THREE.Vector3();
    label.sourceObject.updateMatrixWorld();
    vector.setFromMatrixPosition(label.sourceObject.matrixWorld).add(new THREE.Vector3(0, 2.5, 0));
    vector.project(camera);
    label.x = (vector.x * widthHalf) + widthHalf;
    label.y = -(vector.y * heightHalf) + heightHalf;
  });
}

// === UI ロジック ===
watch(isCorrect, (newValue) => {
  if (newValue === true) {
    setTimeout(() => {
      showBladeBag.value = true;
    }, 300);
  }
});

function displayQuestion() {
    const currentCastle = castleLocations[currentQuestionIndex];
    questionText.value = `${currentCastle.location}の住所は何かな？`;
    feedbackText.value = '';
    userAnswer.value = '';
    isCorrect.value = false;
    showBladeBag.value = false;
}

function showQuestionModal() {
  isQuestionModalVisible.value = true;
}

function hideQuestionModal() {
  isQuestionModalVisible.value = false;
}

function submitAnswer() {
    if (!userAnswer.value) return;
    const correctAnswer = castleLocations[currentQuestionIndex].name;
    if (userAnswer.value.trim() === correctAnswer) {
        feedbackText.value = '正解◎';
        feedbackColor.value = 'green';
        isCorrect.value = true;
    } else {
        feedbackText.value = '不正解…もう一度考えてみよう！';
        feedbackColor.value = 'red';
    }
}

function showExplanation() {
    explanationText.value = `鍛冶の村の住所は「２丁目３番３５号」だね！

実は、このお話はネットワークの世界とそっくりなんだ。
君が操作していた桃太郎は、情報を運ぶ小さなデータ「パケット」。
そして、目的地の「鍛冶の村」は、パケットが届けられる「宛先」なんだよ。

手紙に住所が必要なように、パケットを正確に届けるためにも「IPアドレス」という住所が絶対に必要になるんだ。
君が正しい住所を見つけられたから、桃太郎は鍛冶の村にたどり着けたんだね！`;
    isExplanationModalVisible.value = true;
    isAnswerModalVisible.value = false;
}

function closeExplanation() {
    router.push('/content/1');
}
</script>

<style>
@font-face {
  font-family: 'azuki-font';
  src: url('@/assets/fonts/azuki.ttf') format('truetype');
}
body {
  margin: 0;
  overflow: hidden;
  font-family: 'azuki-font', sans-serif;
}

.persistent-label, #speech-bubble {
  position: absolute;
  background-color: rgba(255, 255, 255, 0.4);
  border: 2px solid black;
  border-radius: 10px;
  padding: 10px 15px;
  font-size: 16px;
  font-weight: bold;
  z-index: 100;
  transform: translate(-50%, -50%);
  white-space: nowrap;
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}

#speech-bubble {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.5s ease, visibility 0.5s ease;
}

#speech-bubble.hidden {
  opacity: 0;
  visibility: hidden;
}

#speech-bubble::after {
  content: "";
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  border-width: 10px 10px 0;
  border-style: solid;
  border-color: black transparent transparent transparent;
}

#question-button {
  position: absolute;
  top: 20px;
  left: 90px;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 5px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 10;
  border: 1px solid #ccc;
  cursor: pointer;
  font-size: 25px;
  font-weight: bold;
}

#question-button:hover {
  background-color: rgba(240, 240, 240, 0.95);
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  opacity: 1;
  visibility: visible;
  transition: opacity 0.5s ease, visibility 0.5s ease;
}

.modal.hidden {
  opacity: 0;
  visibility: hidden;
}

#modal-content,
.modal-content {
  background: white;
  padding: 30px;
  border-radius: 8px;
  text-align: center;
  transform: translateY(0);
  transition: all 0.5s ease;
  position: relative;
  display: flex;
  flex-direction: column; /* 要素を縦に並べる */
  justify-content: center;
  align-items: center;
  line-height: 1.5;
}

.modal.hidden .modal-content,
.modal.hidden #modal-content {
  transform: translateY(20px);
}

#question-modal-text {
  font-size: 28px;
  font-weight: bold;
}

#explanation-text {
  white-space: pre-wrap;
}

#modal-content button,
.modal-content button,
#modal-content input,
.modal-content input {
  margin: 5px;
  font-size: 22px;
  padding: 8px 16px;
  border-radius: 5px;
  border: 1px solid #ccc;
}

#feedback-text {
  font-weight: bold;
  margin-top: 10px;
  min-height: 1.2em;
  font-size: 24px;
}

#key-guide {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  color: black;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 30px;
  z-index: 10;
}

#key-guide kbd {
  display: inline-block;
  background-color: #eee;
  color: #333;
  border-radius: 4px;
  padding: 4px 8px;
  border: 1px solid #ccc;
  box-shadow: 0 2px 0 #aaa;
  font-weight: bold;
  margin: 0 2px;
  font-family: inherit;
}

/* --- クリア演出エリア全体のコンテナ --- */
.clear-display-area {
  background-color: rgba(255, 255, 255, 0.8); /* 薄い白い背景 */
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between; /* 要素間にスペース */
  align-items: center;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

/* --- クリア演出コンテナ (正解時のmodal-content) --- */
#modal-content.correct-answer-content {
  width: 600px; /* 必要に応じて調整 */
  height: 500px; /* 高さを少し増やしてスペースを確保 */
  padding: 0;
  background: transparent; /* clear-display-areaが背景になるため透明に */
  border: none;
  box-shadow: none;
  overflow: hidden;
}

#modal-content.correct-answer-content #question-modal-text {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: flex-start; /* 上から順に配置 */
  align-items: center;
  height: 100%;
  width: 100%;
  padding-bottom: 0; /* paddingはclear-display-areaで設定 */
  box-sizing: border-box;
}

/* --- 個別要素のスタイルとz-index --- */
#modal-content.correct-answer-content #feedback-text {
  position: relative;
  z-index: 10; /* 最前面 */
  margin-bottom: 20px; /* 演出エリアとの間にスペース */
  font-size: 1.8em; /* 正解を大きく表示 */
  background-color: transparent; /* clear-display-areaが背景を持つため */
  padding: 0;
  border-radius: 0;
}

.correct-animation-container {
  position: relative; /* clear-display-area内での位置 */
  width: 100%;
  flex-grow: 1; /* 残りのスペースを埋める */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  overflow: hidden; /* はみ出し防止 */
  z-index: 5; /* フィードバックとボタンの間 */
}

.kirakira-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: -1; /* 演出の中では一番後ろ */
}

.momo-image {
  position: absolute;
  bottom: 0; /* 演出エリアの下部に配置 */
  left: 50%;
  transform: translateX(-50%);
  max-height: 80%; /* 演出エリアに合わせて調整 */
  object-fit: contain;
  z-index: 3; /* 刀袋よりは後ろ、キラキラよりは前 */
}

.blade-bag-image {
  position: absolute;
  top: -50%;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  transition: top 4s ease-out, opacity 4s ease-out;
  max-width: 40%;
  z-index: 4; /* 桃太郎より手前 */
}

.blade-bag-image.show-blade-bag {
  top: 40%;
  opacity: 1;
}

#modal-content.correct-answer-content button {
  position: relative;
  z-index: 10; /* 最前面 */
  margin-top: 20px; /* 演出エリアとの間にスペース */
  background-color: rgba(255, 255, 255, 0.9);
  border: 2px solid #333;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 1.2em;
  cursor: pointer;
}
</style>
