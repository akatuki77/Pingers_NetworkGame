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
      <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> 移動  <kbd>Space</kbd> ジャンプ
    </div>

    <div v-if="isDangoButtonVisible" class="action-button-container">
      <button @click="giveDango">問題に挑戦する</button>
    </div>
  </div>

  <BackButton to="/content/1" />
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import BackButton from "@/components/BackButton.vue";
import { useCharacterKeymap } from "@/composable/useCharacterKeymap.js";
import { useCharacter } from "@/composable/useReverseCharacter.js";
import { useKeyboard } from "@/composable/useKeyboard.js";

// === Vue リアクティブな状態管理 ===
const canvasContainer = ref(null);

// UIの状態
const speechBubble = ref({ visible: false, text: "", x: 0, y: 0 });
const isAnswerModalVisible = ref(false);
const isExplanationModalVisible = ref(false);
const isCorrect = ref(false);
const persistentLabels = ref([]); // 常時表示ラベル用の配列
const isQuestionModalVisible = ref(false);
const isDangoButtonVisible = ref(false);

// クイズデータ
const questionText = ref("");
const userAnswer = ref("");
const feedbackText = ref("");
const feedbackColor = ref("black");
const explanationText = ref("ステージで学んだことについての説明");

// === three.js関連の変数 (リアクティブにしない) ===
let scene, camera, renderer, controls,  background, backgroundBox, triggerZoneBox, background2;
const collidableObjects = [];
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();

// composableの呼び出し
const characterHook = useCharacter();
const { keysPressed } = useKeyboard();
useCharacterKeymap(characterHook, keysPressed);

// 衝突したオブジェクトを保持
let collisionTargetObject = null;

let closestAnimal = null;

// クイズ情報
const castleLocations = ref([
    { name: "～についての問題だウキ！", location: "サル", x: -10, z: -2, object: null, hasDango: false, Message: "正解してるウキ！凄いウキ！" },
    { name: "～についての問題だケーン！", location: "キジ", x: 7.4, z: 7.3, object: null, hasDango: false, Message: "正解してるケーン！凄いケーン！" },
    { name: "～についての問題だワン！", location: "イヌ", x: -6.9, z: 4.5, object: null, hasDango: false, Message: "正解してるワン！凄いワン！" },
    { name: "鬼を倒してくれてありがとう！", location: "漁師", x: -1, z: -6.4, object: null, hasDango: false, Message: "漁師：無事鬼を倒してくれてありがとう！" },
]);

const ObjectsLocations = [
    { x: 0, z: -0.2, object: null }, // 港町
    { x: 0.35, z: -25.6, object: null }  // 鬼ヶ島
];
let animationFrameId;

// ★ 総復習クイズのデータをここにまとめる
const reviewQuizzes = ref([
  {
    animal: "イヌ", // どの動物に対応するクイズか
    question: "イヌ「俺だけに『突撃だ！』って命令をくれた時、他の仲間には聞こえなかったはずだ。それは桃太郎さんがどんな指示の出し方をしたからか、分かるかい？」",
    options: [
      "1.全員に同じ指示を大声で叫んだ", // ハブ
      "2.指示したい相手を選んでこっそり伝えた", // スイッチ（正解）
      "3.近くの仲間に伝言を頼んだ", // ルータ
    ],
    correctAnswerIndex: 1, // 正解の選択肢の番号（0から数える）
    explanation: "正解！スイッチは、接続された仲間の固有アドレス(MACアドレス)を記憶しているので、指示したい相手を正確に選び、その仲間にだけ情報を送ることができるんだ。",
    isCompleted: false, // このクイズをクリアしたか
  },
  {
    animal: "キジ",
    question: "キジ「我々が港町から鍛冶の村へ向かうには、正しい関所を経由する必要がありました。たくさんの道がある中で、我々が迷わずに関所を選べたのはなぜでしょうかな？」",
    options: [
      "1.192.168.10.1", // ルータ（正解）
      "2.192.168.20.1",
      "3.192.168.30.1",
    ],
    correctAnswerIndex: 0,
    explanation: "その通り！ルータ（関所）は、IPアドレスという住所を頼りに、遠いネットワークへ向かうための最適な次の道を判断してくれるんだ。",
    isCompleted: false,
  },
  {
    animal: "サル",
    question: "サル「最後はオイラだ！この旅が始まったのは鍛冶屋で刀を手に入れたからだよな。あの村にはたくさんの家があったけど、どうやって鍛冶屋の家を見つけたんだっけ？」",
    options: [
      "1.２丁目８番３号",
      "2.２丁目５番７号",
      "3.２丁目３ー３５", // IPアドレス（正解）
    ],
    correctAnswerIndex: 2,
    explanation: "お見事！IPアドレスは、ネットワーク上の最終的な目的地を正確に示すための、ただ一つの重要な住所なんだ。",
    isCompleted: false,
  },
]);

// 現在表示しているクイズと、モーダルの表示状態を管理する変数
const currentQuiz = ref(null);

const isTransitionButtonVisible = ref(false); // ボタンの表示状態を管理

// 3-2へ遷移ボタンのキャラクターの当たり判定用の箱を準備
const characterBox = new THREE.Box3();

// === 初期化処理 ===
onMounted(() => {
  initThree();
  loadModels();
  setupEventListeners();
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
        const monkeyLocation = castleLocations.value[0];
        const monkey = Monkey.clone();
        monkey.scale.set(1, 1, 1);
        monkeyLocation.object = monkey;
        rayOrigin = new THREE.Vector3(monkeyLocation.x, 100, monkeyLocation.z);
        raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
        intersects = raycaster.intersectObject(background, true);
        groundY = intersects.length > 0 ? intersects[0].point.y : 0;
        monkey.position.set(monkeyLocation.x, groundY, monkeyLocation.z);
        monkey.rotation.y = Math.PI / 2; // 反転
        scene.add(monkey);
        collidableObjects.push(monkey);

        // キジのモデルを配置
        const pheasantLocation = castleLocations.value[1];
        const pheasant = Pheasant.clone();
        pheasant.scale.set(0.7, 0.7, 0.7);
        pheasantLocation.object = pheasant;
        rayOrigin = new THREE.Vector3(pheasantLocation.x, 100, pheasantLocation.z);
        raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
        intersects = raycaster.intersectObject(background, true);
        groundY = intersects.length > 0 ? intersects[0].point.y : 0;
        pheasant.position.set(pheasantLocation.x, groundY + 3.6, pheasantLocation.z);
        pheasant.rotation.y = -Math.PI / 2; // 反転
        scene.add(pheasant);
        collidableObjects.push(pheasant);

        // イヌのモデルを配置
        const dogLocation = castleLocations.value[2];
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
        const fishermanLocation = castleLocations.value[3];
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
        persistentLabels.value = castleLocations.value.map(loc => ({
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

// きびだんごを渡す関数を再利用
function giveDango() {
  if (closestAnimal && !closestAnimal.hasDango) {
    closestAnimal.hasDango = true; // 状態を「貰った」に更新

    const quiz = reviewQuizzes.value.find(q => q.animal === closestAnimal.location);
    if (quiz && !quiz.isCompleted) {
      currentQuiz.value = quiz;
      questionText.value = quiz.question; // ★ メインの問題文をセット

      // モーダルの状態をリセット
      userAnswer.value = '';
      feedbackText.value = '';
      isCorrect.value = false;

      isAnswerModalVisible.value = true; // ★ 回答モーダルを表示
    }
  }
}

// アニメーションループ
function animate() {
  animationFrameId = requestAnimationFrame(animate);
  const delta = clock.getDelta();

  if (characterHook.mixer) characterHook.mixer.update(delta);

  if (characterHook.character) {
    characterHook.updatePosition({
      delta,
      keysPressed: keysPressed.value,
      raycaster,
      collidableObjects,
      castleLocations,
      backgroundBox
    });

    // 遷移ゾーンとの接触判定
    if (triggerZoneBox) {
        // キャラクターの現在位置を中心とした小さな箱を計算
        characterBox.setFromCenterAndSize(
            characterHook.character.position,
            new THREE.Vector3(1, 2, 1) // キャラクターの当たり判定のサイズ
        );

      // キャラクターの箱と遷移ゾーンの箱が重なっているかチェック
      if (triggerZoneBox.intersectsBox(characterBox)) {
          isTransitionButtonVisible.value = true; // 重なっていたらボタンを表示
      } else {
          isTransitionButtonVisible.value = false; // 重なっていなければボタンを非表示
      }
    }

    const detectionRadius = 3.0; // 吹き出しを表示する半径。この値を調整してください
    let foundAnimalThisFrame = null;
    let minDistance = Infinity;
    const characterPosition = characterHook.character.position;

    // 全ての動物との距離を計算し、最も近いものを探す
    castleLocations.value.forEach(location => {
        const animalPos = new THREE.Vector3(location.x, characterPosition.y, location.z);
        const distance = characterPosition.distanceTo(animalPos);
        if (distance < minDistance) {
            minDistance = distance;
            foundAnimalThisFrame = location;
        }
    });

    // 全ての動物をチェックし終わった後で、グローバルな変数を「最終結果」で更新する
    closestAnimal = foundAnimalThisFrame;

    // 最も近い動物が検出範囲内にあるかチェック
    if (closestAnimal && minDistance < detectionRadius) { // 範囲内に動物がいる場合

    // ★ 1. まず、近づいた動物に対応するクイズを`reviewQuizzes`から探す
    const quiz = reviewQuizzes.value.find(q => q.animal === closestAnimal.location);

    // ★ 2. そのクイズが「クリア済み(isCompleted)」かどうかをチェック
    if (quiz && quiz.isCompleted) {
        // 【クリア後】Messageのセリフを表示
        speechBubble.value.text = closestAnimal.Message;
    } else {
        // 【クリア前】nameのセリフを表示
        speechBubble.value.text = closestAnimal.name;
    }

    speechBubble.value.visible = true;
    collisionTargetObject = closestAnimal.object;

    // きびだんごボタンの表示ロジック（仲間にしていない場合のみ表示）
    if (closestAnimal.hasDango) {
        isDangoButtonVisible.value = false;
    } else {
        isDangoButtonVisible.value = true;
    }

} else {
    // --- 範囲内に動物がいない場合 ---
    speechBubble.value.visible = false;
    isDangoButtonVisible.value = false;
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

function showQuestionModal() {
  isQuestionModalVisible.value = true;
}

function hideQuestionModal() {
  isQuestionModalVisible.value = false;
}

// 回答の提出
function submitAnswer() {
    if (!currentQuiz.value || !userAnswer.value) return;

  // ★ 1. 入力された文字列を、前後の空白を消して数値に変換する
  const playerInput = parseInt(userAnswer.value.trim());

  // ★ 2. もし数値でなかったら、不正解とする
  if (isNaN(playerInput)) {
    feedbackText.value = '数字で答えてね！';
    feedbackColor.value = 'red';
    return;
  }

  // ★ 3. プレイヤーが入力した数字(1, 2, 3)を、配列のインデックス(0, 1, 2)に変換
  const playerIndex = playerInput - 1;

  // ★ 4. 変換したインデックスと、設定した正解のインデックスを比較
  if (playerIndex.value.trim() === currentQuiz.value.correctAnswerIndex) {
    feedbackText.value = '正解！';
    feedbackColor.value = 'green';
    isCorrect.value = true; // 「解説を見る」ボタンに切り替え
    currentQuiz.value.isCompleted = true; // クリア済みにする
  } else {
    feedbackText.value = '不正解…もう一度考えてみよう！';
    feedbackColor.value = 'red';
  }
}

// 解説モーダルの表示
function showExplanation() {
    if (!currentQuiz.value) return;
  explanationText.value = currentQuiz.value.explanation; // ★ 解説文をセット
  isAnswerModalVisible.value = false;
  isExplanationModalVisible.value = true;
}

// 解説モーダルの閉じるボタン
function closeExplanation() {
    isExplanationModalVisible.value = false;
    checkAllQuizzesCompleted(); // ★ 全問クリアしたかチェック
}

// 全てのクイズがクリアされたかチェックする関数
function checkAllQuizzesCompleted() {
  const allDone = reviewQuizzes.value.every(q => q.isCompleted);
  if (allDone) {
    isTransitionButtonVisible.value = true;
    alert("全ての知恵比べに勝利した！");
  }
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

#question-button:hover,
.transition-button-container button:hover {
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

.action-button-container {
  position: absolute;
  bottom: 40px;
  left: 51%;
  bottom: 12%;
  transform: translateX(-50%);
  z-index: 100;
  text-align: center;
}

.action-button-container button {
  padding: 12px 25px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  border-radius: 30px;
  border: none;
  background-color: #ff69b4; /* ホットピンク */
  color: white;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  transition: all 0.3s ease;
}

.action-button-container button:hover {
  background-color: #ff85c1;
  transform: translateY(-2px);
}
</style>
