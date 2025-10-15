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
      <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> 移動  <kbd>Space</kbd> ジャンプ  <kbd>Shift</kbd> ダッシュ
    </div>

    <div v-if="isTransitionButtonVisible" class="transition-button-container">
      <button @click="goToStageThreePartTwo">3-2へ進む</button>
    </div>

    <div v-if="isDangoButtonVisible" class="action-button-container">
      <button @click="giveDango">きびだんごを渡す</button>
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
import { useCharacter } from "@/composable/useCharacter.js";
import { useKeyboard } from "@/composable/useKeyboard.js";
import { useRouter } from 'vue-router';
import { useStageClear } from "@/composable/useStageClear";//クリアしたときのデータ登録

// === Vue リアクティブな状態管理 ===
const canvasContainer = ref(null);
const { saveClearRecord } = useStageClear(); //関数を取り出す
const stageId = 4;

// UIの状態
const speechBubble = ref({ visible: false, text: "", x: 0, y: 0 });
const isCorrect = ref(false);
const persistentLabels = ref([]); // 常時表示ラベル用の配列
const isQuestionModalVisible = ref(false);
const isDangoButtonVisible = ref(false);

// クイズデータ
const questionText = ref("");
const userAnswer = ref("");
const feedbackText = ref("");

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
    { name: "きびだんごが食べたいウキ！", location: "サル", x: -10, z: -2, object: null, hasDango: false, Message: "ウキッ！うまい！このきびだんごの味、忘れないウキ！オイラ、桃太郎さんについていく！" },
    { name: "きびだんごが食べたいケーン！", location: "キジ", x: 11.0, z: 10.0, object: null, hasDango: false, Message: "ケーン！これはこれは…。あなた様の家来になりましょう。鬼ヶ島までお供いたしますぞ！" },
    { name: "きびだんごが食べたいワン！", location: "イヌ", x: -6.9, z: 4.5, object: null, hasDango: false, Message: "ワン！なんて美味しいんだ…！このご恩、忘れませんワン。鬼退治、ぜひ手伝わせてください！" },
]);

const ObjectsLocations = [
    { x: 0, z: -0.2, object: null }, // 港町
    { x: 0.35, z: -22.51, object: null }  // 鬼ヶ島
];
let animationFrameId;

const router = useRouter(); // routerインスタンスを取得
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
    ])
    .then(async ([Background, Background2, PortTownObject, OniObject, Monkey, Pheasant, Dog]) => {
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

// 全ての動物がきびだんごを貰ったかチェックする関数
function checkAllAlliesGathered() {
  // .every()は、配列の全ての要素が条件を満たす場合にtrueを返す
  const allAllied = castleLocations.value.every(animal => animal.hasDango === true);

  if (allAllied) {
    // 全員が仲間になっていたら、遷移ボタンを表示する
    isTransitionButtonVisible.value = true;
  }
}

// きびだんごを渡す関数を新しく作成
function giveDango() {
  if (closestAnimal && !closestAnimal.hasDango) {
    closestAnimal.hasDango = true; // 状態を「貰った」に更新

    // 渡した直後に、全員が仲間になったかチェックする
    checkAllAlliesGathered();
  }
}

watch(() => keysPressed.value['enter'], (isPressed) => {
  if (isPressed && isDangoButtonVisible.value) {
    giveDango(); // きびだんごを渡す関数を呼び出す
  } else if (isPressed && isTransitionButtonVisible.value) {
      goToStageThreePartTwo(); // 画面遷移する関数を呼び出す
    }
});

watch(() => keysPressed.value['escape'], (isPressed, wasPressed) => {
  // Escキーが「押された瞬間」だけを判定
  if (isPressed && !wasPressed) {
    // そうでなく、問題文モーダルが表示されていたら、それを閉じる
    if (isQuestionModalVisible.value) {
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
    if (closestAnimal && minDistance < detectionRadius) {
        // ★ 状態に応じて表示するテキストとボタンを切り替える
        if (closestAnimal.hasDango) {
            // 既に仲間になっている場合
            speechBubble.value.text = closestAnimal.Message;
            isDangoButtonVisible.value = false; // ボタンは非表示
        } else {
            // まだ仲間にする前の場合
            speechBubble.value.text = closestAnimal.name;
            isDangoButtonVisible.value = true; // ボタンを表示
        }
        speechBubble.value.visible = true;
        collisionTargetObject = closestAnimal.object;
    } else {
        // 範囲外なら全て非表示
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

// === UI ロジック ===
function displayQuestion() {
    questionText.value = `動物達にきびだんごを渡して鬼退治へ向かう仲間にしよう！`;
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

function goToStageThreePartTwo() {
  // '/stage-3-2' の部分は、実際のルート設定に合わせて変更
  saveClearRecord(stageId); // クリア記録を保存
  router.push('/Stage-3-2');
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

.transition-button-container {
  position: absolute;
  bottom: 35px;
  left: 90%;
  transform: translateX(-50%);
  z-index: 100;
}

.transition-button-container button {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 30px;
  font-weight: bold;
  cursor: pointer;
  border: none;
  background-color: #ff69b4; /* ホットピンク */
  color: white;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}

.action-button-container {
  position: absolute;
  bottom: 35px;
  left: 87%;
  transform: translateX(-50%);
  z-index: 100;
  text-align: center;
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
</style>
