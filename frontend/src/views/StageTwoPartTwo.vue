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

    <div id="answer-modal" :class="{ hidden: !isAnswerModalVisible }">
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
          <p id="explanation-text">{{ explanationText }}</p>
        </div>
        <button @click="closeExplanation">閉じる</button>
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
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import BackButton from "@/components/BackButton.vue";
import { useCharacterKeymap } from "@/composable/useCharacterKeymap.js";
import { useCharacter } from "@/composable/useCharacter.js";
import { useKeyboard } from "@/composable/useKeyboard.js";
import { useRouter } from 'vue-router';

// === Vue リアクティブな状態管理 ===
const canvasContainer = ref(null);
const answerInput = ref(null);

// UIの状態
const speechBubble = ref({ visible: false, text: "", x: 0, y: 0 });
const isAnswerModalVisible = ref(false);
const isExplanationModalVisible = ref(false);
const isCorrect = ref(false);
const persistentLabels = ref([]); // ★ [追加] 常時表示ラベル用の配列
const isQuestionModalVisible = ref(false);

// クイズデータ
const questionText = ref("");
const userAnswer = ref("");
const feedbackText = ref("");
const feedbackColor = ref("black");
const explanationText = ref("ステージで学んだことについての説明");

// === three.js関連の変数 (リアクティブにしない) ===
let scene, camera, renderer, controls,  background, backgroundBox, background2, triggerZoneBox;
// let idleAction, walkAction;
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
  { name: "192.168.10.1", location: "関所B", x: -8.8, z: -5.5, object: null },
  { name: "192.168.20.1", location: "関所C", x: -0.1, z: -6.5, object: null },
  { name: "192.168.30.1", location: "関所D", x: 9, z: -5, object: null },
];
const gateLocations = [
  { x: -0.05, z: 16.3, object: null }
];
const gatekeeperLocations = [
    { x: -7.3, z: -3.8, object: null },
    { x: 1.5, z: -4.8, object: null },
    { x: 10.4, z: -3.3, object: null }
];
let animationFrameId;

const router = useRouter(); // routerインスタンスを取得

// === 初期化処理 ===
onMounted(() => {
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
        loadObjModel('/models/stage/', 'background_gate-1.mtl', 'background_gate-1.obj'),
        loadObjModel('/models/stage/', 'background_gate_oneRoad.mtl', 'background_gate_oneRoad.obj'),
        loadObjModel('/models/object/', 'sekisyo-0.mtl', 'sekisyo-0.obj'),
        loadObjModel('/models/character/', 'gatekeeper.mtl', 'gatekeeper.obj'),
        loadObjModel('/models/object/', 'village_lake.mtl', 'village_lake.obj')
    ])
    .then(async ([Background, Background2, loadedSekisyo, loadedGatekeeper, loadedLake]) => {
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
        background2.position.set(0, -4.9, newZPosition);

        scene.add(background2);
        collidableObjects.push(background2);

        // 2つの背景のつなぎ目に「見えないゾーン」を作成
        const zonePositionZ = -background1Size.z / 2; // つなぎ目のZ座標
        // ゾーンのジオメトリ（幅、高さ、奥行き）
        const zoneGeometry = new THREE.BoxGeometry(background1Size.x, 10, 2);
        // ゾーンのマテリアル（透明にする）
        const zoneMaterial = new THREE.MeshBasicMaterial({ visible: false });
        const triggerZone = new THREE.Mesh(zoneGeometry, zoneMaterial);

        // ゾーンをつなぎ目に配置
        triggerZone.position.set(0, 5, zonePositionZ);
        scene.add(triggerZone);

        // ゾーンの当たり判定用の箱を計算しておく
        triggerZoneBox = new THREE.Box3().setFromObject(triggerZone);

        let rayOrigin, intersects, groundY;

        // 関所のモデルを配置
        castleLocations.forEach(location => {
            const sekisyo = loadedSekisyo.clone();
            sekisyo.scale.set(0.5, 0.5, 0.5);
            location.object = sekisyo;
            rayOrigin = new THREE.Vector3(location.x, 100, location.z);
            raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
            intersects = raycaster.intersectObject(background, true);
            groundY = intersects.length > 0 ? intersects[0].point.y : 0;
            sekisyo.position.set(location.x, 2, location.z);
            scene.add(sekisyo);
            collidableObjects.push(sekisyo);
        });

        // 門のモデルを配置
        gateLocations.forEach(location => {
            const gate = loadedSekisyo.clone();
            gate.scale.set(0.8, 0.8, 0.8);
            location.object = gate;
            rayOrigin = new THREE.Vector3(location.x, 100, location.z);
            raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
            intersects = raycaster.intersectObject(background, true);
            groundY = intersects.length > 0 ? intersects[0].point.y : 0;
            gate.position.set(location.x, 2, location.z);
            scene.add(gate);
            collidableObjects.push(gate);
        });

        // 門番のモデルを配置
        gatekeeperLocations.forEach(location => {
            const gatekeeper = loadedGatekeeper.clone();
            gatekeeper.scale.set(0.5, 0.5, 0.5);
            location.object = gatekeeper;
            rayOrigin = new THREE.Vector3(location.x, 100, location.z);
            raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
            intersects = raycaster.intersectObject(background, true);
            groundY = intersects.length > 0 ? intersects[0].point.y : 0;
            gatekeeper.position.set(location.x, groundY, location.z);
            scene.add(gatekeeper);
            collidableObjects.push(gatekeeper);
        });

        // 湖のモデルを配置
        const lakePosition = { x: -0.05, y: 0, z: 0 };
        rayOrigin = new THREE.Vector3(lakePosition.x, 100, lakePosition.z);
        raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
        intersects = raycaster.intersectObject(background, true);
        groundY = intersects.length > 0 ? intersects[0].point.y : 0;
        loadedLake.position.set(lakePosition.x, groundY - 2.42, lakePosition.z);
        scene.add(loadedLake);

        scene.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        backgroundBox = new THREE.Box3().setFromObject(background);
        await characterHook.loadCharacter(scene);

        // ★ [追加] 常時表示ラベルを初期化
        persistentLabels.value = castleLocations.map(loc => ({
          text: loc.location, // 村の名前を設定
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

// Enterキーで回答モーダルを開く
watch(() => keysPressed.value['enter'], (isPressed) => {
  if (isPressed && !isAnswerModalVisible.value) { // モーダルが既に開いていなければ
    isAnswerModalVisible.value = true;
    nextTick(() => {
      if(answerInput.value) answerInput.value.focus();
    });
  }
});

// Escapeキーでモーダルを閉じる
watch(() => keysPressed.value['escape'], (isPressed) => {
  if (isPressed) {
    isAnswerModalVisible.value = false;
    isExplanationModalVisible.value = false;
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

    const detectionRadius = 3.0; // 吹き出しを表示する半径。この値を調整してください
    let closestCastle = null;
    let minDistance = Infinity;
    const characterPosition = characterHook.character.position;

    // 全ての村との距離を計算し、最も近い村を探す
    castleLocations.forEach(location => {
        const castlePos = new THREE.Vector3(location.x, characterPosition.y, location.z);
        const distance = characterPosition.distanceTo(castlePos);
        if (distance < minDistance) {
            minDistance = distance;
            closestCastle = location;
        }
    });

    // 最も近い村が検出範囲内にあるかチェック
    if (closestCastle && minDistance < detectionRadius) {
        // 範囲内なら吹き出しを表示
        speechBubble.value.visible = true;
        speechBubble.value.text = closestCastle.name;
        collisionTargetObject = closestCastle.object; // 吹き出しの位置決めに使うオブジェクト
    } else {
        // 範囲外なら吹き出しを非表示
        speechBubble.value.visible = false;
        collisionTargetObject = null;
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
    const currentCastle = castleLocations[currentQuestionIndex];

    questionText.value = `2-1で関所Cに行けば、港町へ辿り着けると分かったね！
    ${currentCastle.location}の住所は何かな？`;

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

// 回答の提出
function submitAnswer() {
    if (!userAnswer.value) return;
    const correctAnswer = castleLocations[currentQuestionIndex].name;
    if (userAnswer.value.trim() === correctAnswer) {
        feedbackText.value = '正解◎';
        feedbackColor.value = 'green';
        isCorrect.value = true;
    } else {
        feedbackText.value = '不正解×';
        feedbackColor.value = 'red';
    }
}

// 解説モーダルの表示
function showExplanation() {
    explanationText.value = explanationText.value = `港町へ続く正しい関所の IPアドレス が分かったね！

    今回の冒険では、ネットワークの道案内役 「ルータ」 の仕組みを学んだんだ。

    君が通ってきた『関所』は、データを次の場所へと中継する「ルータ」のこと。そして、門番に正しい行き先を尋ねたあの行動が、ネットワークの世界で言う 「ルーティング」 なんだよ。`;

    isExplanationModalVisible.value = true;
    isAnswerModalVisible.value = false;
}

// 解説モーダルの閉じるボタン
function closeExplanation() {
    router.push('/content/1');
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

.modal-content button,
.modal-content input {
  margin: 5px;
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
</style>
