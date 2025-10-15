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

    <div v-if="isDangoButtonVisible" class="action-button-container">
      <button @click="startQuiz">問題に挑戦!</button>
    </div>

    <div id="animal-quiz-modal" class="modal" :class="{ hidden: !isAnimalQuizModalVisible }" v-if="currentQuiz">
      <div class="modal-content">
        <p id="feedback-text" :style="{ color: feedbackColor }">
          {{ feedbackText }}
        </p>
        <p id="question-modal-text">
          {{ questionTextAnimal }}
          <br><br>
          {{ questionOptions }}
        </p>
        <div v-if="!isCorrect">
        <input
          ref="answerInput"
          type="text"
          v-model="userAnswer"
          placeholder="答えの番号を入力"
          class="large-form-element"
        />
        <button @click="submitAnswer" class="large-form-element">回答</button>
      </div>
      <button v-if="isCorrect" @click="showExplanation" id="feedback-button">
        解説を見る
      </button><br>
        <button @click="hideAnimalQuizModal">閉じる</button>
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
      <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> 移動  <kbd>Space</kbd> ジャンプ  <kbd>Shift</kbd> ダッシュ
    </div>
  </div>

  <BackButton to="/content/1" />
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import BackButton from "@/components/BackButton.vue";
import { useCharacterKeymap } from "@/composable/useCharacterKeymap.js";
import { useCharacter } from "@/composable/useReverseCharacter.js";
import { useKeyboard } from "@/composable/useKeyboard.js";
import { useStageClear } from "@/composable/useStageClear";

// === Vue リアクティブな状態管理 ===
const canvasContainer = ref(null);
const { saveClearRecord } = useStageClear(); //関数を取り出す
const stageId = 7;


// UIの状態
const speechBubble = ref({ visible: false, text: "", x: 0, y: 0 });
const isAnswerModalVisible = ref(false);
const isExplanationModalVisible = ref(false);
const isCorrect = ref(false);
const persistentLabels = ref([]); // 常時表示ラベル用の配列
const isQuestionModalVisible = ref(false);
const isAnimalQuizModalVisible = ref(false);
const isDangoButtonVisible = ref(false);

// クイズデータ
const questionText = ref("");
const questionTextAnimal = ref("");
const questionOptions = ref("");
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
    { name: "IPアドレスについての問題だウキ！", location: "サル", x: -10, z: -2, object: null, hasDango: false, Message: "正解してるウキ！凄いウキ！" },
    { name: "ルータについての問題だケーン！", location: "キジ", x: 11.0, z: 10.0, object: null, hasDango: false, Message: "正解してるケーン！凄いケーン！" },
    { name: "スイッチについての問題だワン！", location: "イヌ", x: -6.9, z: 4.5, object: null, hasDango: false, Message: "正解してるワン！凄いワン！" },
]);

const fishermanLocations = [
  { x: -1, z: -6.4, object: null }
];

const ObjectsLocations = [
    { x: 0, z: -0.2, object: null }, // 港町
    { x: 0.35, z: -22.51, object: null }  // 鬼ヶ島
];
let animationFrameId;

// ★ 総復習クイズのデータをここにまとめる
const reviewQuizzes = ref([
  {
    animal: "イヌ", // どの動物に対応するクイズか
    question: "イヌ「桃太郎さん！あんたがリーダーになって、俺たち仲間というチーム（ネットワーク）ができた。リーダーであるあんた（スイッチ）の一番大事な仕事は、次のうちどれだったか覚えているかい？」",
    options: [
      "1.誰宛でも、とりあえず全員に同じ指示を伝えること", // ハブ
      "2.指示を伝えたい相手を正確に覚えて、その仲間にだけ伝えること", // スイッチ（正解）
      "3.一番遠い場所への行き方を常に考えること", // ルータ
    ],
    correctAnswerIndex: 1, // 正解の選択肢の番号（0から数える）
    explanation: "「正解だワン！リーダー（スイッチ）は、一度会った仲間の顔と名前を決して忘れないんだ。だから、他の仲間を騒がせることなく、話したい相手にだけこっそり作戦を伝えられるんだ。」",
    isCompleted: false, // このクイズをクリアしたか
  },
  {
    animal: "キジ",
    question: "キジ：「桃太郎様！鍛冶の村から遠い港町へ向かう時、いくつもの国境の門（ルータ）がありましたね。あの門が果たしていた最も重要な役割について、桃太郎様ならもちろんご存知ですよね？」",
    options: [
      "1.異なる国（ネットワーク）同士を繋ぎ、最適な次の道へ案内すること", // ルータ（正解）
      "2.国にある全ての家に手紙を配ること", // ハブ
      "3.仲間の中から特定の一人を探し出すこと", // スイッチ
    ],
    correctAnswerIndex: 0,
    explanation: "「その通りです！国境の門（ルータ）は、例えるなら『空港の乗り換えカウンター』のようなもの。行き先が遠い（別のネットワーク）時、『次はあちらの飛行機ですよ』と最適な次の道を案内してくれるのです。あれがなければ、我々は道に迷っていたでしょう。」",
    isCompleted: false,
  },
  {
    animal: "サル",
    question: "サル「ウキッ、オイラが出す問題に正解できるかな？この旅は、鬼を倒すための準備をしに鍛冶の村に行くところから始まったよな。3つ村から正しい村を見つけられた『決定的な情報』って何だったっけ？」",
    options: [
      "1.村の住民からのたくさんの『噂話』", // ブロードキャスト情報
      "2.とにかく進むという『勇気』", // パケットのTTL
      "3.世界に一つしかない、正確な『住所』", // IPアドレス（正解）
    ],
    correctAnswerIndex: 2,
    explanation: "「お見事！手紙を届けるのに『住所』が絶対に必要みたいに、ネットワークの世界でも『IPアドレス』がないと何も始まらないんだ。世界に一つだけの正確な住所があったから、僕たちはあの鍛冶屋にたどり着けたんだ！忘れるなよ、ウキッ！」",
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
        pheasant.position.set(pheasantLocation.x, groundY, pheasantLocation.z);
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
        const fishermanLocation = fishermanLocations[0];
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
function startQuiz() {
    if (!closestAnimal) return;

    // 挑戦する動物に対応するクイズを探す
    const quiz = reviewQuizzes.value.find(q => q.animal === closestAnimal.location);
    if (quiz) {
      currentQuiz.value = quiz;
      questionTextAnimal.value = quiz.question;
      // ★ 選択肢の配列を、改行で区切られた一つの文字列に変換
      questionOptions.value = quiz.options.join('\n');

      // モーダルの状態をリセット
      userAnswer.value = '';
      feedbackText.value = '';
      isCorrect.value = false;

      isAnimalQuizModalVisible.value = true; // 回答モーダルを表示

      nextTick(() => {
        setTimeout(() => {
          if (answerInput.value) {
            answerInput.value.focus();
          }
        }, 100);
      });
    }
}

watch(() => keysPressed.value['enter'], (isPressed, wasPressed) => {
  // Enterキーが「押された瞬間」だけを判定
  if (isPressed && !wasPressed) {

    // 【状況A】動物クイズモーダルが表示されている場合
    if (isAnimalQuizModalVisible.value) {

      // A-1: 正解して「解説を見る」ボタンが表示されている状態なら
      if (isCorrect.value) {
        showExplanation();
      }
      // A-2: まだ回答入力中の状態なら
      else {
        submitAnswer();
      }
    }
    // 【状況B】きびだんごボタンが表示されている場合
    else if (isDangoButtonVisible.value) {
      startQuiz(); // クイズを開始
    }
  }
});

// Escapeキーでモーダルを閉じる
watch(() => keysPressed.value['escape'], (isPressed) => {
  if (isPressed) {
    if (isExplanationModalVisible.value) {
      closeExplanation();
    }
    // ★ 2. 次に「動物クイズモーダル」をチェック
    else if (isAnimalQuizModalVisible.value) {
      hideAnimalQuizModal();
    }
    // ★ 3. 最後に、一番下にある可能性が高い「問題文モーダル」をチェック
    else if (isQuestionModalVisible.value) {
      hideQuestionModal();
    }
  }
});

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
      castleLocations: castleLocations.value,
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
            isDangoButtonVisible.value = false;
            speechBubble.value.text = closestAnimal.Message;
        } else {
            // 【クリア前】nameのセリフを表示
            isDangoButtonVisible.value = true;
            speechBubble.value.text = closestAnimal.name;
        }

        speechBubble.value.visible = true;
        collisionTargetObject = closestAnimal.object;

        updateSpeechBubble();

    } else {
        // --- 範囲内に動物がいない場合 ---
        speechBubble.value.visible = false;
        isDangoButtonVisible.value = false;
        collisionTargetObject = null;
      }

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

function displayQuestion() {
    questionText.value = `冒険はこれでおしまい。
    学んだことの最終確認として、
    仲間たちの問題に答えよう！`;

    feedbackText.value = '';
    userAnswer.value = '';
    isCorrect.value = false;

    // isAnimalQuizModalVisible.value = true; // ★ 動物クイズモーダルを表示
}

function showQuestionModal() {
  isQuestionModalVisible.value = true;
}

function hideQuestionModal() {
  isQuestionModalVisible.value = false;
}

// ★ 動物クイズモーダルを閉じる関数
function hideAnimalQuizModal() {
    isAnimalQuizModalVisible.value = false;
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
  if (playerIndex === currentQuiz.value.correctAnswerIndex) {
    feedbackText.value = '正解◎';
    feedbackColor.value = 'green';
    isCorrect.value = true; // 「解説を見る」ボタンに切り替え
    currentQuiz.value.isCompleted = true; // クリア済みにする

    checkAllQuizzesCompleted(); // 全クイズクリアチェック
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
}

// 全てのクイズがクリアされたかチェックする関数
function checkAllQuizzesCompleted() {
  const allDone = reviewQuizzes.value.every(q => q.isCompleted);
  if (allDone) {
    saveClearRecord(stageId); // クリア記録を保存
    isTransitionButtonVisible.value = true;
    alert("これにて、桃太郎の冒険は終わり。最後まで遊んでくれてありがとう！物語の追加を楽しみにしていてね！");
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
#question-modal,
#animal-quiz-modal {
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
#question-modal.hidden,
#animal-quiz-modal.hidden {
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
  white-space: pre-wrap;
}

#explanation-modal-text {
  white-space: pre-wrap;
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
  font-size: 22px;
  padding: 8px 16px;
  border-radius: 5px;
  border: 1px solid #ccc;
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
  bottom: 35px;
  left: 90%;
  transform: translateX(-50%);
  z-index: 100;
}

.action-button-container button {
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

.action-button-container button:hover {
  background-color: #ff85c1;
  transform: translateY(-2px);
}

.large-form-element {
  font-size: 20px; /* 文字を大きく */
  line-height: 1.5; /* 行間を調整 */
  margin-bottom: 25px; /* テキストと閉じるボタンの間隔 */
  max-width: 80vw; /* 横幅が広がりすぎないように */
  white-space: pre-wrap;
}
</style>
