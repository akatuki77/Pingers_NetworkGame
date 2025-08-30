<template>
  <div :class="stageData?.className">
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
      <div id="modal-content">
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
          </template>
          <button v-if="isCorrect" @click="showExplanation">
            解説を見る
          </button>
          <p id="feedback-text" :style="{ color: feedbackColor }">
            {{ feedbackText }}
          </p>
        </div>
      </div>
    </div>

    <div id="explanation-modal" class="modal" :class="{ hidden: !isExplanationModalVisible }">
      <div class="modal-content">
        <div id="question-modal-text">
          <h2>クリア！</h2>
          <p id="explanation-text" style="white-space: pre-wrap;">{{ explanationText }}</p>
        </div>
        <button @click="closeExplanation">一覧に戻る</button>
      </div>
    </div>

    <div id="key-guide">
      <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> 移動  <kbd>Space</kbd> ジャンプ  <kbd>Enter</kbd> 回答入力
    </div>

    <BackButton to="/content/1" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import BackButton from "@/components/BackButton.vue";
import { useCharacterKeymap } from "@/composable/useCharacterKeymap.js";
import { useCharacter } from "@/composable/useCharacter.js";
import { useKeyboard } from "@/composable/useKeyboard.js";
import { stages } from '@/data/stages.js';

// === ルーターと現在のステージデータを準備 ===
const route = useRoute();
const router = useRouter();
const stageData = computed(() => {
  const stageId = route.params.stageId;
  return stages[stageId];
});

// === Vue リアクティブな状態管理 ===
const canvasContainer = ref(null);
const answerInput = ref(null);
const speechBubble = ref({ visible: false, text: "", x: 0, y: 0 });
const isAnswerModalVisible = ref(false);
const isExplanationModalVisible = ref(false);
const isCorrect = ref(false);
const persistentLabels = ref([]);
const isQuestionModalVisible = ref(false);
const userAnswer = ref("");
const feedbackText = ref("");
const feedbackColor = ref("black");
const questionText = ref("");
const explanationText = ref("");

// === three.js関連の変数 ===
let scene, camera, renderer, controls, background, backgroundBox;
const collidableObjects = [];
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
let animationFrameId;

// === composableの呼び出し ===
const characterHook = useCharacter();
const { keysPressed } = useKeyboard();
useCharacterKeymap(characterHook, keysPressed);

let collisionTargetObject = null;
let currentQuestionIndex = 1;
const castleLocations = ref([]);

// === ライフサイクル ===
onMounted(() => {
  initThree();
  loadStageAssets(); // ★★★ 変更点1：最初の読み込みをここで行う ★★★
  setupEventListeners();
  animate();
});

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId);
  cleanupEventListeners();
  if (renderer) renderer.dispose();
});

// === 3D・ロジックの関数群 ===

// ★★★ 変更点2：immediate: true を削除 ★★★
watch(stageData, () => {
  loadStageAssets();
});

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

  camera = new THREE.PerspectiveCamera(11, window.innerWidth / window.innerHeight, 0.1, 1000);
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

async function loadStageAssets() {
  if (!stageData.value) {
    console.error("ステージデータが見つかりません:", route.params.stageId);
    return;
  }

  const objectsToRemove = scene.children.filter(child => child.userData.isStageAsset);
  objectsToRemove.forEach(child => {
    scene.remove(child);
  });
  collidableObjects.length = 0;

  const assetPromises = Object.entries(stageData.value.assets).map(async ([name, loaderFunc]) => {
      return { name, asset: await loaderFunc() };
  });
  const loadedAssetsList = await Promise.all(assetPromises);
  const loadedAssets = loadedAssetsList.reduce((acc, { name, asset }) => {
      acc[name] = asset;
      return acc;
  }, {});

  background = loadedAssets['background'];
  if (background) {
    background.userData.isStageAsset = true;
    scene.add(background);
    collidableObjects.push(background);
    backgroundBox = new THREE.Box3().setFromObject(background);
  }

  stageData.value.sceneObjects.forEach(objInfo => {
    if (objInfo.assetName === 'background') return;

    const model = loadedAssets[objInfo.assetName].clone();
    model.userData.isStageAsset = true;

    if (objInfo.position) {
      if (objInfo.scale) model.scale.set(objInfo.scale.x, objInfo.scale.y, objInfo.scale.z);
      if (objInfo.rotation) model.rotation.set(objInfo.rotation.x, objInfo.rotation.y, objInfo.rotation.z);

      let finalPosition = new THREE.Vector3(objInfo.position.x, objInfo.position.y, objInfo.position.z);
      if (objInfo.useRaycastY && background) {
          const rayOrigin = new THREE.Vector3(objInfo.position.x, 100, objInfo.position.z);
          raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
          const intersects = raycaster.intersectObject(background, true);
          if (intersects.length > 0) {
              finalPosition.y += intersects[0].point.y;
          }
      }
      model.position.copy(finalPosition);
    }

    scene.add(model);
    collidableObjects.push(model);
  });

  castleLocations.value = stageData.value.quiz.locations.map(loc => {
    const village = loadedAssets[loc.assetName].clone();
    village.userData.isStageAsset = true;
    if (loc.scale) village.scale.set(loc.scale, loc.scale, loc.scale);

    let finalPosition = new THREE.Vector3(loc.position.x, 0, loc.position.z);
    if (background) {
        const rayOrigin = new THREE.Vector3(loc.position.x, 100, loc.position.z);
        raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
        const intersects = raycaster.intersectObject(background, true);
        if (intersects.length > 0) {
            finalPosition.y = intersects[0].point.y;
        }
    }
    village.position.copy(finalPosition);

    scene.add(village);
    collidableObjects.push(village);
    return { ...loc, object: village };
  });

  scene.traverse(child => {
      if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
      }
  });

  await characterHook.loadCharacter(scene);
  persistentLabels.value = castleLocations.value.map(loc => ({
      text: loc.location, x: 0, y: 0, visible: true, sourceObject: loc.object
  }));

  displayQuestion();
}function setupEventListeners() {
  window.addEventListener('resize', onWindowResize);
}

function cleanupEventListeners() {
  window.removeEventListener('resize', onWindowResize);
}

function onWindowResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

watch(() => keysPressed.value['enter'], (isPressed) => {
  if (isPressed && !isAnswerModalVisible.value) {
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

// ★★★ キャラクターと村の距離をチェックする新しい関数 ★★★
function checkProximity() {
  const PROXIMITY_THRESHOLD = 3.0; // この距離（例: 5）より近づいたら表示する

  if (!characterHook.character || !castleLocations.value.length) {
    return null;
  }

  const characterPosition = characterHook.character.position;
  let closestLocation = null;
  let minDistance = Infinity;

  // すべての村の場所をループして、一番近いものを探す
  castleLocations.value.forEach(location => {
    const locationPosition = location.object.position;
    const distance = characterPosition.distanceTo(locationPosition);

    if (distance < PROXIMITY_THRESHOLD && distance < minDistance) {
      minDistance = distance;
      closestLocation = location;
    }
  });

  return closestLocation; // 一番近い村の情報を返す（範囲外ならnull）
}

function animate() {
  animationFrameId = requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (characterHook.mixer) characterHook.mixer.update(delta);

  if (characterHook.character && background) {
    // キャラクターの位置更新はそのまま実行（壁などにぶつかって止まる処理は維持）
    characterHook.updatePosition({
      delta,
      keysPressed: keysPressed.value,
      raycaster,
      collidableObjects,
      castleLocations: castleLocations.value,
      backgroundBox
    });

    // ★★★ 距離をチェックして、一番近い村の情報を取得 ★★★
    const nearbyLocation = checkProximity();

    // ★★★ "nearbyLocation" (近くの村の情報) を元に吹き出しを操作 ★★★
    if (nearbyLocation) {
      speechBubble.value.visible = true;
      speechBubble.value.text = nearbyLocation.name; // 表示するのは住所(name)
      collisionTargetObject = nearbyLocation.object;
    } else {
      speechBubble.value.visible = false;
      collisionTargetObject = null;
    }

    updateSpeechBubble();
    updatePersistentLabels();
  }

  if (controls) controls.update();
  if (renderer) renderer.render(scene, camera);
}
function updateSpeechBubble() {
  if (!speechBubble.value.visible || !collisionTargetObject || !camera) return;
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
  if (!camera || !persistentLabels.value.length) return;

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

function displayQuestion() {
  if (!castleLocations.value.length || !stageData.value) return;
  const currentCastle = castleLocations.value[currentQuestionIndex];
  if (!currentCastle) return;
  questionText.value = stageData.value.quiz.question(currentCastle.location);
  feedbackText.value = '';
  userAnswer.value = '';
  isCorrect.value = false;
}

function showQuestionModal() { isQuestionModalVisible.value = true; }
function hideQuestionModal() { isQuestionModalVisible.value = false; }

function submitAnswer() {
  if (!userAnswer.value || !castleLocations.value.length) return;
  const correctAnswer = castleLocations.value[currentQuestionIndex].name;
  if (userAnswer.value.trim() === correctAnswer) {
    feedbackText.value = '正解◎';
    feedbackColor.value = 'green';
    isCorrect.value = true;
  } else {
    feedbackText.value = '不正解×';
    feedbackColor.value = 'red';
  }
}

function showExplanation() {
  if (!stageData.value) return;
  explanationText.value = stageData.value.quiz.explanation;
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
  z-index: 100;
  opacity: 1;
  visibility: visible;
  transition: opacity 0.7s ease, visibility 0.7s ease;
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
  transition: transform 0.7s ease;
  max-width: 800px;
}

#question-modal-text {
  font-size: 28px;
  font-weight: bold;
  line-height: 1.5;
  margin-bottom: 25px;
}

.modal-content button,
.modal-content input {
  margin: 5px;
  padding: 10px 20px;
  font-size: 1em;
  border-radius: 5px;
  border: 1px solid #ccc;
}

#feedback-text {
  font-weight: bold;
  margin-top: 10px;
  min-height: 1.2em;
}

#key-guide {
  position: absolute;
  bottom: 30px;
  left: 53%;
  transform: translateX(0%);
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
</style>
