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
          <p id="feedback-text" :style="{ color: feedbackColor }">
            {{ feedbackText }}
          </p>
          <p id="question-modal-text">
            {{ Text }}
            <br><br>
            {{ questionOptions }}
          </p>
          <template v-if="!isCorrect">
            <input
              ref="answerInput"
              type="text"
              v-model="userAnswer"
              placeholder="答えを入力"
              @keydown.enter="submitAnswer"
              class="large-form-element"
            />
            <button @click="submitAnswer" class="large-form-element">回答</button>
          </template>
          <button v-if="isCorrect" @click="showExplanation" id="feedback-button">
            解説を見る
          </button>
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
const Text = ref("");
const questionOptions = ref("");
const userAnswer = ref("");
const feedbackText = ref("");
const feedbackColor = ref("black");
const explanationText = ref("ステージで学んだことについての説明");

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

// クイズ情報
const castleLocations = [
    { name: "オイラ、桃太郎さんについていくウキ！", location: "サル", x: -11.2, z: -2, object: null },
    { name: "鬼ヶ島までお供するケーン！", location: "キジ", x: 2.5, z: 7, object: null },
    { name: "鬼退治、ぜひ手伝わせてほしいワン！", location: "イヌ", x: -6.9, z: 4.5, object: null },
    { name: "Enterを押すと、問題文と選択肢が表示されるぜ！", location: "漁師", x: -1, z: -6.4, object: null },
];

const ObjectsLocations = [
    { x: 0, z: -0.2, object: null }, // 港町
    { x: 0.35, z: -22.51, object: null }  // 鬼ヶ島
];

const quiz = ref([
  {
    correctAnswerIndex: 1, // 正解は2番目の選択肢（インデックス1）
    question: "リーダーとしての最も賢い指示の出し方は3つのうちどれだと思う？",
    options: [
      "1.全員に聞こえるように、同じ指示を大声で叫ぶ",
      "2.指示を伝えたい相手を正確に選び、その仲間にだけこっそり伝える",
      "3.とりあえず一番近くにいる仲間に伝言を頼む"
    ]
  }
]);
let animationFrameId;

const router = useRouter(); // routerインスタンスを取得

// === 初期化処理 ===
onMounted(() => {
  // ★ quiz配列から最初の問題を取り出す
  const currentQuizData = quiz.value[0];

  // ★ 問題文をセットする
  Text.value = currentQuizData.question;

  // ★ 選択肢の配列を、改行(\n)で区切った一つの文字列に変換してセットする
  questionOptions.value = currentQuizData.options.join('\n');
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

function loadModels() {
    Promise.all([
        loadObjModel('/models/stage/', 'background_portTown.mtl', 'background_portTown.obj'),
        loadObjModel('/models/stage/', 'background_onigashima.mtl', 'background_onigashima.obj'),
        loadObjModel('/models/object/', 'background_portTown_object.mtl', 'background_portTown_object.obj'),
        loadObjModel('/models/object/', 'background_onigashima_object.mtl', 'background_onigashima_object.obj'),
        loadObjModel('/models/character/', 'monkey.mtl', 'monkey.obj'),
        loadObjModel('/models/character/', 'pheasant.mtl', 'pheasant.obj'),
        loadObjModel('/models/character/', 'dog.mtl', 'dog.obj'),
        loadObjModel('/models/character/', 'fisherman.mtl', 'fisherman.obj'),
    ])
    .then(async ([Background, Background2, PortTownObject, OniObject, Monkey, Pheasant, Dog, Fisherman]) => {
        // 背景モデルの設定
        background = Background;
        scene.add(background);
        collidableObjects.push(background);

        const background1Box = new THREE.Box3().setFromObject(background);
        const background1Size = new THREE.Vector3();
        background1Box.getSize(background1Size);
        background.position.set(0, 0, 0);

        const background2Box = new THREE.Box3().setFromObject(Background2);
        const background2Size = new THREE.Vector3();
        background2Box.getSize(background2Size);

        background2 = Background2;

        const newZPosition = (-background1Size.z / 2) + (-background2Size.z / 2);
        background2.position.set(0, 0, newZPosition);

        scene.add(background2);
        collidableObjects.push(background2);

        let rayOrigin, intersects, groundY;

        // 港町オブジェクトのモデルを配置
        const PortLocation = ObjectsLocations[0];
        const object = PortTownObject.clone();
        object.scale.set(1, 1, 1);
        PortLocation.object = object;
        rayOrigin = new THREE.Vector3(PortLocation.x, 100, PortLocation.z);
        raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
        intersects = raycaster.intersectObject(background, true);
        groundY = intersects.length > 0 ? intersects[0].point.y : 0;
        object.position.set(PortLocation.x, groundY - 1.15, PortLocation.z);
        scene.add(object);
        collidableObjects.push(object);

        // 鬼ヶ島オブジェクトのモデルを配置
        const OniLocation = ObjectsLocations[1];
        const oniObject = OniObject.clone();
        oniObject.scale.set(1, 1, 1);
        OniLocation.object = oniObject;
        rayOrigin = new THREE.Vector3(OniLocation.x, 100, OniLocation.z);
        raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
        intersects = raycaster.intersectObject(background, true);
        groundY = intersects.length > 0 ? intersects[0].point.y : 0;
        oniObject.position.set(OniLocation.x, groundY, OniLocation.z);
        scene.add(oniObject);

        // サルのモデルを配置
        const monkeyLocation = castleLocations[0];
        const monkey = Monkey.clone();
        monkey.scale.set(1, 1, 1);
        monkeyLocation.object = monkey;
        rayOrigin = new THREE.Vector3(monkeyLocation.x, 100, monkeyLocation.z);
        raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
        intersects = raycaster.intersectObject(background, true);
        groundY = intersects.length > 0 ? intersects[0].point.y : 0;
        monkey.position.set(monkeyLocation.x, groundY + 2.15, monkeyLocation.z);
        monkey.rotation.y = Math.PI / 2; // 反転
        scene.add(monkey);
        collidableObjects.push(monkey);

        // キジのモデルを配置
        const pheasantLocation = castleLocations[1];
        const pheasant = Pheasant.clone();
        pheasant.scale.set(0.7, 0.7, 0.7);
        pheasantLocation.object = pheasant;
        rayOrigin = new THREE.Vector3(pheasantLocation.x, 100, pheasantLocation.z);
        raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
        intersects = raycaster.intersectObject(background, true);
        groundY = intersects.length > 0 ? intersects[0].point.y : 0;
        pheasant.position.set(pheasantLocation.x, groundY, pheasantLocation.z);
        scene.add(pheasant);
        collidableObjects.push(pheasant);

        // イヌのモデルを配置
        const dogLocation = castleLocations[2];
        const dog = Dog.clone();
        dog.scale.set(1, 1, 1);
        dogLocation.object = dog;
        rayOrigin = new THREE.Vector3(dogLocation.x, 100, dogLocation.z);
        raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
        intersects = raycaster.intersectObject(background, true);
        groundY = intersects.length > 0 ? intersects[0].point.y : 0;
        dog.position.set(dogLocation.x, groundY, dogLocation.z);
        dog.rotation.y = Math.PI / 2; // 反転
        scene.add(dog);
        collidableObjects.push(dog);

        // 漁師のモデルを配置
        const fishermanLocation = castleLocations[3];
        const fisherman = Fisherman.clone();
        fisherman.scale.set(0.6, 0.6, 0.6);
        fishermanLocation.object = fisherman;
        rayOrigin = new THREE.Vector3(fishermanLocation.x, 100, fishermanLocation.z);
        raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
        intersects = raycaster.intersectObject(background, true);
        groundY = intersects.length > 0 ? intersects[0].point.y : 0;
        fisherman.position.set(fishermanLocation.x, groundY, fishermanLocation.z);
        fisherman.rotation.y = Math.PI / 2; // 反転
        scene.add(fisherman);
        collidableObjects.push(fisherman);

        scene.traverse(child => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        backgroundBox = new THREE.Box3().setFromObject(background);
        await characterHook.loadCharacter(scene);

        // 常時表示ラベルを初期化
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
    questionText.value = `鬼ヶ島まで行くには、海を渡る必要があるよ！
    船場にいる漁師が出している問題に正解すると
    船を貸してもらえるみたいだよ！`;
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
    const currentQuizData = quiz.value[0];
  if (!currentQuizData || !userAnswer.value) return;

  const playerInput = parseInt(userAnswer.value.trim());

  if (isNaN(playerInput)) {
    feedbackText.value = '数字で答えてね！';
    feedbackColor.value = 'red';
    return;
  }

  const playerIndex = playerInput - 1;

  // ★ currentQuizData を使って正解のインデックスを比較
  if (playerIndex === currentQuizData.correctAnswerIndex) {
    feedbackText.value = '正解◎';
    feedbackColor.value = 'green';
    isCorrect.value = true;
  } else {
    feedbackText.value = '不正解…もう一度考えてみよう！';
    feedbackColor.value = 'red';
  }
}

// 解説モーダルの表示
function showExplanation() {
    explanationText.value = explanationText.value = `その通り！指示を伝えたい相手を正確に選ぶのが、リーダーとして最も賢い方法だね。
それが、ネットワークの賢い仕分け役、「スイッチ」の働きなんだ。

スイッチは、接続されている仲間全員の固有アドレス（MACアドレス）を
記憶しているリスト（MACアドレステーブル）を持っている。
だから、特定の仲間にだけ情報を送る（ユニキャスト）ことができるんだ。`;

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

.modal-content button,
.modal-content input {
  margin: 5px;
}

#feedback-text {
  font-size: 1.8em;       /* 文字サイズを大きくする */
  font-weight: bold;      /* 文字を太くする */
  text-align: center;     /* 中央揃えにする */
  margin-bottom: 15px;    /* 下の問題文との間に余白を空ける */
  min-height: 1.8em;      /* テキストがなくても高さを確保し、レイアウトのガタつきを防ぐ */
  transition: color 0.3s; /* 色が変わる時に少しアニメーションさせる */
}

#feedback-button {
  font-size: 1.5em;       /* 文字サイズを大きくする */
  text-align: center;
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

.large-form-element {
  font-size: 20px; /* 文字を大きく */
  line-height: 1.5; /* 行間を調整 */
  margin-bottom: 25px; /* テキストと閉じるボタンの間隔 */
  max-width: 80vw; /* 横幅が広がりすぎないように */
  white-space: pre-wrap;
}
</style>
