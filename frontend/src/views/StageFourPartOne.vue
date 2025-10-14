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

    <div id="key-guide">
      <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> 移動  <kbd>Enter</kbd> 決定  <kbd>Esc</kbd> 閉じる
    </div>

    <div class="oni-image-container" :class="{ hidden: !oniImageIsVisible }" @click.self="hideOniImage">
      <div class="image-content-box">
        <p id="question-modal-text">鬼を退治した！港町まで戻ろう！</p><br>
        <img :src="oniDefeatedImage" alt="鬼を倒した画像">
        <img :src="momoDefeatedImage" alt="桃太郎が倒した画像">
      </div>
    </div>

    <div v-if="isTransitionButtonVisible" class="transition-button-container">
      <button @click="oniPicture">鬼退治へ行く</button>
    </div>

    <div v-if="isStage42ButtonVisible" class="transition-button-container2">
      <button @click="goToStageFourPartTwo">4-2へ進む</button>
    </div>
  </div>

  <BackButton to="/content/1" />
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from "vue";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import BackButton from "@/components/BackButton.vue";
import { useCharacterKeymap } from "@/composable/useCharacterKeymap.js";
import { useCharacter } from "@/composable/useboat.js";
import { useKeyboard } from "@/composable/useKeyboard.js";
import { useRouter } from 'vue-router';
import oniDefeatedImage from "@/assets/image/oni_taiji.png";
import momoDefeatedImage from "@/assets/image/momo_taiji.png";
import { useStageClear } from "@/composable/useStageClear";//クリアしたときのデータ登録

// === Vue リアクティブな状態管理 ===
const canvasContainer = ref(null);
const answerInput = ref(null);
const { saveClearRecord } = useStageClear(); //関数を取り出す
const stageId = 6;

// UIの状態
const speechBubble = ref({ visible: false, text: "", x: 0, y: 0 });
const isCorrect = ref(false);
const persistentLabels = ref([]); // 常時表示ラベル用の配列
const isQuestionModalVisible = ref(false);
const oniImageIsVisible = ref(false); // 鬼を倒した画像の表示

// クイズデータ
const questionText = ref("");
const userAnswer = ref("");
const feedbackText = ref("");

// === three.js関連の変数 (リアクティブにしない) ===
let scene, camera, renderer, controls,  background, backgroundBox, background2;
const collidableObjects = [];
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();

// composableの呼び出し
const characterHook = useCharacter();
const { keysPressed } = useKeyboard();
useCharacterKeymap(characterHook, keysPressed);

// 衝突したオブジェクトを保持
let collisionTargetObject = null;

const router = useRouter(); // routerインスタンスを取得

// 1. ボタンの表示・非表示を管理するリアクティブな変数
const isTransitionButtonVisible = ref(false);
const isStage42ButtonVisible = ref(false);
const oniDefeated = ref(false);

// 2. ボタンを表示させたい目標地点の座標を設定
// ★ XとZの値を、あなたの設定したい座標に書き換えてください
const triggerPosition = new THREE.Vector3(0, 0, -3);
const stage42TriggerPosition = new THREE.Vector3(0, 0, 11.7);

const ObjectsLocations = [
  { x: 0.2, z: 3, object: null }, // 鬼ヶ島
  { x: 0, z: 25.6, object: null }, // 港町

];
let animationFrameId;

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
  // WebGLリソースの解放
  if (renderer) {
    renderer.dispose();
  }
});

// === three.jsのセットアップ ===
function initThree() {
  scene = new THREE.Scene();
  // ★★★ ここからグラデーション背景の作成 ★★★
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 2; // グラデーションなので、幅は小さくてOK
  canvas.height = 512;

  // 上から下へのグラデーションを作成
  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#59c0f3'); // 元: #a0d8ef
  gradient.addColorStop(1, '#97d7fd'); // 元: #c2e9fb  // グラデーションで塗りつぶす
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // 作成したCanvasからテクスチャを生成して背景に設定
  scene.background = new THREE.CanvasTexture(canvas);
  // ★★★ ここまで ★★★

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
  directionalLight.position.set(10, 15, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048; // 影の解像度を上げる
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.top = 20;
  directionalLight.shadow.camera.bottom = -20;
  directionalLight.shadow.camera.left = -20;
  directionalLight.shadow.camera.right = 20;
  scene.add(directionalLight);
}

// OBJとMTLファイルを読み込む関数
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

// モデルの読み込みとシーンへの追加
function loadModels() {
    Promise.all([
        loadObjModel('/models/stage/', 'background_onigashima.mtl', 'background_onigashima.obj'),
        loadObjModel('/models/stage/', 'background_portTown.mtl', 'background_portTown.obj'),
        loadObjModel('/models/object/', 'background_onigashima_object.mtl', 'background_onigashima_object.obj'),
        loadObjModel('/models/object/', 'background_portTown_object.mtl', 'background_portTown_object.obj'),
    ])
    .then(async ([Background, Background2, OniObject, PortTownObject]) => {
        // 背景モデルの設定
        background = Background;
        scene.add(background);
        collidableObjects.push(background);

        const background1Box = new THREE.Box3().setFromObject(background);
        const background1Size = new THREE.Vector3();
        background1Box.getSize(background1Size);

        const background2Box = new THREE.Box3().setFromObject(Background2);
        const background2Size = new THREE.Vector3();
        background2Box.getSize(background2Size);

        background2 = Background2;

        const newZPosition = (background1Size.z / 2) + (background2Size.z / 2);
        background2.position.set(0, 0, newZPosition);

        scene.add(background2);
        collidableObjects.push(background2);

        let rayOrigin, intersects, groundY;

        // 鬼ヶ島オブジェクトのモデルを配置
        const OniLocation = ObjectsLocations[0];
        const oniObject = OniObject.clone();
        oniObject.scale.set(1, 1, 1);
        OniLocation.object = oniObject;
        rayOrigin = new THREE.Vector3(OniLocation.x, 100, OniLocation.z);
        raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
        intersects = raycaster.intersectObject(background, true);
        groundY = intersects.length > 0 ? intersects[0].point.y : 0;
        oniObject.position.set(OniLocation.x, groundY - 0.14, OniLocation.z);
        scene.add(oniObject);

        // 港町オブジェクトのモデルを配置
        const PortLocation = ObjectsLocations[1];
        const object = PortTownObject.clone();
        object.scale.set(1, 1, 1);
        PortLocation.object = object;
        rayOrigin = new THREE.Vector3(PortLocation.x, 100, PortLocation.z);
        raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
        intersects = raycaster.intersectObject(background, true);
        groundY = intersects.length > 0 ? intersects[0].point.y : 0;
        object.position.set(PortLocation.x, groundY, PortLocation.z);
        scene.add(object);
        collidableObjects.push(object);

        scene.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        backgroundBox = new THREE.Box3().setFromObject(background);
        await characterHook.loadCharacter(scene);
    });
}

// === イベントリスナー ===
function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
}

// イベントリスナーのクリーンアップ
function cleanupEventListeners() {
    window.removeEventListener('resize', onWindowResize);
}

// === ウィンドウリサイズ時の処理 ===
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

watch(() => keysPressed.value['enter'], (isPressed) => {
  // ★ ボタンが表示されている（＝遷移ゾーンにいる）時だけ、キーを有効にする
  if (isPressed && isTransitionButtonVisible.value) {
    oniPicture(); // 鬼退治へ行く関数を呼び出す
  }

  if (isPressed && isStage42ButtonVisible.value) {
    goToStageFourPartTwo(); // 画面遷移する関数を呼び出す
  }
});

// Escapeキーでモーダルを閉じる
watch(() => keysPressed.value['escape'], (isPressed) => {
  if (isPressed) {
    if (isQuestionModalVisible.value) {
      hideQuestionModal();
    }
    if (oniImageIsVisible.value) {
      hideOniImage();
    }
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

            backgroundBox
        });

    const detectionRadius = 3.0; // 吹き出しを表示する半径。この値を調整してください


    // キャラクターの現在位置を取得
    const characterPosition = characterHook.character.position;

    // キャラクターと目標地点との距離を計算
    const oniDistance = characterPosition.distanceTo(triggerPosition);

    // 距離が設定した半径(detectionRadius)より小さいかどうかを判定
    if (oniDistance < detectionRadius && !oniDefeated.value) {
      // 半径の内側に入ったらボタンを表示
      isTransitionButtonVisible.value = true;
    } else {
      // 半径の外に出たらボタンを非表示
      isTransitionButtonVisible.value = false;
    }

    const stage42Distance = characterPosition.distanceTo(stage42TriggerPosition);
    if (oniDefeated.value) {
      // 距離が設定した半径(detectionRadius)より小さいかどうかを判定
      if (stage42Distance < detectionRadius) {
        // 半径の内側に入ったらボタンを表示
        isStage42ButtonVisible.value = true;
      } else {
        // 半径の外に出たらボタンを非表示
        isStage42ButtonVisible.value = false;
      }
    }

    updateSpeechBubble();
    updatePersistentLabels();
  }

    controls.update();
    renderer.render(scene, camera);
}

// === 衝突判定と吹き出しの更新 ===
function updateSpeechBubble() {
    // 追跡対象がない場合は何もしない
     if (!speechBubble.value.visible || !collisionTargetObject) return;
    const vector = new THREE.Vector3();

    // オブジェクトの中心から少し上に吹き出しを表示
    collisionTargetObject.updateMatrixWorld();
    vector.setFromMatrixPosition(collisionTargetObject.matrixWorld).add(new THREE.Vector3(0, 2.5, 0));
    vector.project(camera);

    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;
    speechBubble.value.x = (vector.x * widthHalf) + widthHalf;
    speechBubble.value.y = -(vector.y * heightHalf) + heightHalf;
}

// 常時表示ラベルの位置を更新する関数
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
function displayQuestion() {
    questionText.value = `船で鬼ヶ島へ行こう！`;

    feedbackText.value = '';
    userAnswer.value = '';
    isCorrect.value = false;
}

function showQuestionModal() {
  isQuestionModalVisible.value = true;
}

function hideQuestionModal() {
  isQuestionModalVisible.value = false;
}

function oniPicture() {
  // 鬼を倒した画像を表示する
  oniImageIsVisible.value = true;

  // 「鬼退治へ行く」ボタンを非表示にする
  isTransitionButtonVisible.value = false;

  // ★ 「鬼退治ボタンが押された」という事実を記憶する
  oniDefeated.value = true;
}

function hideOniImage() {
  oniImageIsVisible.value = false;
}

function goToStageFourPartTwo() {
  // '/stage-4-2' の部分は、実際のルート設定に合わせて変更
  saveClearRecord(stageId); // クリアデータを保存
  router.push('/Stage-4-2');
}
</script>

<style>
@font-face {
  font-family: 'azuki-font';
  /* @/ は src/ フォルダを指す便利なエイリアス（別名）です。
    これを使うことで、CSSファイルがどこにあっても常に正しいパスを指定できます。
  */
  src: url('@/assets/fonts/azuki.ttf') format('truetype');
}
body {
  margin: 0;
  overflow: hidden; /* スクロールバーを非表示 */
  font-family: 'azuki-font', sans-serif; /* フォントを適用 */
}

.persistent-label, #speech-bubble {
 position: absolute;
 /* 背景を半透明の白に変更 (透明度を 0.8 に設定) */
 background-color: rgba(255, 255, 255, 0.4);
 border: 2px solid black; /* 輪郭線はそのまま */
 border-radius: 10px;
 padding: 10px 15px;
 font-size: 16px;
 font-weight: bold;
 z-index: 100;
 transform: translate(-50%, -50%); /* translate の Y 軸方向の値を修正 */
 white-space: nowrap;
 backdrop-filter: blur(5px); /* ぼかし効果を追加 */
 -webkit-backdrop-filter: blur(5px); /* Safari 用 */
}

#speech-bubble {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.5s ease, visibility 0.5s ease;
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

#answer-modal,
#explanation-modal,
#question-modal {
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

#answer-modal.hidden,
#speech-bubble.hidden,
#explanation-modal.hidden,
#question-modal.hidden {
  opacity: 0;
  visibility: hidden;
}

#answer-modal.hidden,
#modal-content,
.modal-content {
  transform: translateY(20px);
}

/* 問題文モーダルのテキストを大きくするための専用スタイル */
#question-modal-text {
  font-size: 28px; /* 文字を大きく */
  font-weight: bold;
  line-height: 1.5; /* 行間を調整 */
  margin-bottom: 25px; /* テキストと閉じるボタンの間隔 */
  max-width: 80vw; /* 横幅が広がりすぎないように */
}

#question-modal-text,
#feedback-text {
  white-space: pre-wrap; /* 改行を有効にする */
}

#modal-content,
.modal-content {
  background: white;
  padding: 30px;
  border-radius: 8px;
  text-align: center;
  transform: translateY(0);
  transition: transform 0.7s ease;
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
}

.oni-image-container {
  position: fixed; /* absoluteからfixedに変更すると、より確実です */
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.6); /* ★ 半透明の黒に変更 */
  z-index: 200;
  opacity: 1;
  visibility: visible;
  transition: opacity 0.7s ease, visibility 0.7s ease;
}

.oni-image-container.hidden {
  /* ★ 開始状態（見えない） */
  opacity: 0;
  transform: translateY(0);
  /* ★ クリックなどを邪魔しないように */
  pointer-events: none;
}

/* こちらが「画像と、その周りの白い枠」の役割 */
.image-content-box {
  background: white;
  padding: 20px; /* ★ 白い枠の余白を調整 */
  border-radius: 8px;
  box-shadow: 0 5px 20px rgba(0,0,0,0.4);
  /* 中の画像がはみ出さないように */
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 画像自体のサイズを調整 */
.oni-image-container img {
  max-width: 80%;   /* 画面幅の80%を最大幅にする */
  max-height: 80%;  /* 画面高さの80%を最大高さにする */
}

#key-guide {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(0%);
  /* background-color: rgba(0, 0, 0, 0.5); */
  /* color: white; */
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

.transition-button-container,
.transition-button-container2 {
  position: absolute;
  bottom: 35px;
  left: 90%;
  transform: translateX(-50%);
  z-index: 100;
}

.transition-button-container button,
.transition-button-container2 button {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 25px;
  font-weight: bold;
  cursor: pointer;
  border: none;
  background-color: #ff69b4; /* ホットピンク */
  color: white;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  transition: all 0.3s ease;
}

.transition-button-container button:hover,
.transition-button-container2 button:hover {
  background-color: #ff85c1;
  transform: translateY(-2px);
}
</style>
