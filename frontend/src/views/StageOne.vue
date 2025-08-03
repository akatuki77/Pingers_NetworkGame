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

    <div id="question-container">
      <h3 id="question-text">{{ questionText }}</h3>
    </div>

    <div id="answer-modal" :class="{ hidden: !isAnswerModalVisible }">
      <div id="modal-content">
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

    <div id="explanation-modal" class="modal" :class="{ hidden: !isExplanationModalVisible }">
      <div class="modal-content">
        <h2>クリア！</h2>
        <p id="explanation-text">{{ explanationText }}</p>
        <button @click="closeExplanation">閉じる</button>
      </div>
    </div>

    <div id="key-guide">
      <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> : 移動
      <kbd>Space</kbd> : ジャンプ <kbd>Enter</kbd> : 回答入力
    </div>
  </div>

  <BackButton to="/content/1" />
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import BackButton from "@/components/BackButton.vue";

// === Vue リアクティブな状態管理 ===
const canvasContainer = ref(null);
const answerInput = ref(null);

// UIの状態
const speechBubble = ref({ visible: false, text: "", x: 0, y: 0 });
const isAnswerModalVisible = ref(false);
const isExplanationModalVisible = ref(false);
const isCorrect = ref(false);
const persistentLabels = ref([]); // ★ [追加] 常時表示ラベル用の配列

// クイズデータ
const questionText = ref("");
const userAnswer = ref("");
const feedbackText = ref("");
const feedbackColor = ref("black");
const explanationText = ref("ステージで学んだことについての説明");

// === three.js関連の変数 (リアクティブにしない) ===
let scene, camera, renderer, controls, mixer, character, background, backgroundBox;
let idleAction, walkAction;
const collidableObjects = [];
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const keysPressed = {};
let currentAction = "idle";
let targetRotationY = 0;
const rotationSpeed = 0.1;
const moveSpeed = 3.0;
const airMoveSpeed = 2.5;

// 物理関連
let yVelocity = 0;
const gravity = -20;
const jumpStrength = 5;
let isGrounded = false;

// 衝突したオブジェクトを保持
let collisionTargetObject = null;

// クイズ情報
let currentQuestionIndex = 1;
const castleLocations = [
    { name: "２丁目６−１１", location: "花の村", x: 0, z: -7, object: null },
    { name: "２丁目３−３５", location: "鍛冶の村", x: 9.5, z: -5, object: null },
    { name: "２丁目１−６", location: "商人の村", x: -9, z: -5.5, object: null }
];
let animationFrameId;

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
  // 他のthree.jsオブジェクトのジオメトリやマテリアルも必要に応じてdispose
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
  directionalLight.position.set(10, 15, -5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048; // 影の解像度を上げる
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
        loadGltfModel('/models/character/bg_clean.glb'),
        loadObjModel('/models/character/', 'castle.mtl', 'castle.obj')
    ])
    .then(([gltfBackground, originalCastle]) => {
        background = gltfBackground.scene;
        background.traverse(child => {
            if (child.isMesh) {
                child.receiveShadow = true;
                child.castShadow = true;
            }
        });
        scene.add(background);
        collidableObjects.push(background);
        backgroundBox = new THREE.Box3().setFromObject(background);

        castleLocations.forEach(location => {
            const castle = originalCastle.clone();
            location.object = castle;
            const rayOrigin = new THREE.Vector3(location.x, 100, location.z);
            raycaster.set(rayOrigin, new THREE.Vector3(0, -1, 0));
            const intersects = raycaster.intersectObject(background, true);
            const groundY = intersects.length > 0 ? intersects[0].point.y : 0;
            castle.position.set(location.x, groundY, location.z);
            scene.add(castle);
            collidableObjects.push(castle);
        });

        // ★ [追加] 常時表示ラベルを初期化
        persistentLabels.value = castleLocations.map(loc => ({
          text: loc.location, // 村の名前を設定
          x: 0,
          y: 0,
          visible: true,
          sourceObject: loc.object
        }));

        loadCharacter();
    });
}

function loadCharacter() {
    const loader = new GLTFLoader();
    loader.load('/models/character/momotaro.glb', (gltf) => {
        character = gltf.scene;
        character.scale.set(0.6, 0.6, 0.6);
        character.position.set(0.2, 2.4, 12.1);
        character.rotation.y = Math.PI;
        character.traverse(child => {
            if (child.isMesh) child.castShadow = true;
        });
        scene.add(character);

        mixer = new THREE.AnimationMixer(character);
        const idleClip = THREE.AnimationClip.findByName(gltf.animations, 'idle');
        const walkClip = THREE.AnimationClip.findByName(gltf.animations, 'walk');
        if (idleClip && walkClip) {
            idleAction = mixer.clipAction(idleClip);
            walkAction = mixer.clipAction(walkClip);
            idleAction.play();
        }
    });
}

// === イベントリスナー ===
function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
}

function cleanupEventListeners() {
    window.removeEventListener('resize', onWindowResize);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup', onKeyUp);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
    keysPressed[event.key.toLowerCase()] = true;

    if (event.code === 'Space' && isGrounded) {
        yVelocity = jumpStrength;
        isGrounded = false;
    }

    if (['w', 'a', 's', 'd'].includes(event.key.toLowerCase())) {
        if (currentAction !== 'walk' && idleAction && walkAction) {
            switchToAction(idleAction, walkAction);
            currentAction = 'walk';
        }
    }

    if (event.key === 'Enter') {
        event.preventDefault();
        isAnswerModalVisible.value = true;
        nextTick(() => { // DOMが更新された後にフォーカスを当てる
           if(answerInput.value) answerInput.value.focus();
        });
    }

    if (event.key === 'Escape') {
        isAnswerModalVisible.value = false;
        isExplanationModalVisible.value = false;
    }
}

function onKeyUp(event) {
    keysPressed[event.key.toLowerCase()] = false;
    if (!keysPressed['w'] && !keysPressed['a'] && !keysPressed['s'] && !keysPressed['d']) {
        if (currentAction === 'walk' && idleAction && walkAction) {
            switchToAction(walkAction, idleAction);
            currentAction = 'idle';
        }
    }
}

// === アニメーションと物理演算 ===
function switchToAction(from, to) {
    from.fadeOut(0.25);
    to.reset().fadeIn(0.25).play();
}

function animate() {
    animationFrameId = requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (mixer) mixer.update(delta);

    if (character && background) {
        updateCharacterPosition(delta);
        updateSpeechBubble();
        updatePersistentLabels(); // ★ [追加] 常時ラベルの位置を更新
    }

    controls.update();
    renderer.render(scene, camera);
}

function updateCharacterPosition(delta) {
    // （元の長いロジックをここに移植）
    // ... updateCharacterPositionのロジックは長いため、元のコードのanimate関数内から
    //    characterとbackgroundのifブロックの中身をほぼそのままここに持ってきます。
    //    ただし、DOM操作はVueのリアクティブな変数更新に置き換えます。

    // --- 重力と地面との接地判定 ---
    const groundRayOrigin = character.position.clone();
    groundRayOrigin.y += 0.5;
    raycaster.set(groundRayOrigin, new THREE.Vector3(0, -1, 0));
    const groundIntersects = raycaster.intersectObjects(collidableObjects, true);

    if (groundIntersects.length > 0) {
        const groundY = groundIntersects[0].point.y;
        if (character.position.y <= groundY + 0.1 && yVelocity <= 0) {
            character.position.y = groundY;
            yVelocity = 0;
            isGrounded = true;
        } else {
            isGrounded = false;
        }
    } else {
        isGrounded = false;
    }

    if (!isGrounded) {
        yVelocity += gravity * delta;
    }
    character.position.y += yVelocity * delta;

    // --- 移動と前方衝突判定 ---
    // ★ ここからロジックを大幅に変更
    const isMoving = keysPressed['w'] || keysPressed['a'] || keysPressed['s'] || keysPressed['d'];
    let hitCastleInfo = null;

    if(isMoving) {
        if (keysPressed['w']) targetRotationY = -Math.PI / 2;
        if (keysPressed['s']) targetRotationY = Math.PI / 2;
        if (keysPressed['a']) targetRotationY = 0;
        if (keysPressed['d']) targetRotationY = Math.PI;

        const targetQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, targetRotationY, 0));
        character.quaternion.slerp(targetQuaternion, rotationSpeed);

        const characterDirection = new THREE.Vector3();
        character.getWorldDirection(characterDirection);
        let isObstacleAhead = false;
        const stepTolerance = 0.4;

        const collisionPoints = [
            new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(0, 0.8, 0),
            new THREE.Vector3(0.3, 0.5, 0), new THREE.Vector3(-0.3, 0.5, 0),
            new THREE.Vector3(0, 1.5, 0)
        ];

        for (const point of collisionPoints) {
            const rayOrigin = point.clone().applyMatrix4(character.matrixWorld);
            raycaster.set(rayOrigin, characterDirection);
            const intersects = raycaster.intersectObjects(collidableObjects, true);

            if (intersects.length > 0 && intersects[0].distance < 0.5) {
                const hitObject = intersects[0].object;
                const foundCastle = castleLocations.find(info => info.object.children.includes(hitObject) || info.object.id === hitObject.id);
                if (foundCastle) {
                    hitCastleInfo = foundCastle;
                }
                const heightDifference = intersects[0].point.y - character.position.y;
                if (Math.abs(heightDifference) > stepTolerance) {
                    isObstacleAhead = true;
                    break;
                }
            }
        }

        let isCliffAhead = false;
        if (isGrounded) {
             const cliffRayOrigin = new THREE.Vector3(
                character.position.x + characterDirection.x * 0.4,
                character.position.y + 1.0,
                character.position.z + characterDirection.z * 0.4
            );
            raycaster.set(cliffRayOrigin, new THREE.Vector3(0, -1, 0));
            const cliffIntersects = raycaster.intersectObjects(collidableObjects, true);
            if (cliffIntersects.length === 0 || cliffIntersects[0].point.y < character.position.y - stepTolerance) {
                isCliffAhead = true;
            }
        }

        if (!isObstacleAhead && !isCliffAhead) {
            const currentMoveSpeed = isGrounded ? moveSpeed : airMoveSpeed;
            const moveDistance = currentMoveSpeed * delta;
            const moveVector = new THREE.Vector3(0, 0, moveDistance).applyQuaternion(character.quaternion);
            const newPosition = character.position.clone().add(moveVector);
            const finalGroundRayOrigin = newPosition.clone();
            finalGroundRayOrigin.y += 1.0;
            raycaster.set(finalGroundRayOrigin, new THREE.Vector3(0, -1, 0));
            const finalGroundIntersects = raycaster.intersectObjects(collidableObjects, true);
            let isDestinationOK = false;
            if (finalGroundIntersects.length > 0) {
                if (Math.abs(finalGroundIntersects[0].point.y - character.position.y) < stepTolerance) {
                    isDestinationOK = true;
                }
            }
            if (isDestinationOK && backgroundBox.containsPoint(newPosition)) {
                character.position.copy(newPosition);
            }
        }
    }

    // --- ★ 吹き出しのターゲットとテキストを決定するロジック ---
    if (hitCastleInfo) {
        // 衝突時: ターゲットを衝突した城に設定し、テキストを `name` にする
        speechBubble.value.visible = true;
        speechBubble.value.text = hitCastleInfo.name; // 住所(name)を表示
        collisionTargetObject = hitCastleInfo.object;
    } else {
        speechBubble.value.visible = false;
        collisionTargetObject = null;
    }
}

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

// ★ 常時表示ラベルの位置を更新する関数
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

    // カメラの後ろにある場合は表示しないなどの調整も可能
    // label.visible = vector.z < 1;

    label.x = (vector.x * widthHalf) + widthHalf;
    label.y = -(vector.y * heightHalf) + heightHalf;
  });
}

// === UI ロジック ===
function displayQuestion() {
    const currentCastle = castleLocations[currentQuestionIndex];
    questionText.value = `${currentCastle.location}の住所は何でしょうか。`;
    feedbackText.value = '';
    userAnswer.value = '';
    isCorrect.value = false;
}

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

function showExplanation() {
    explanationText.value = '鍛冶の村の住所は２丁目３−３５です。'; // 本来は動的に設定
    isExplanationModalVisible.value = true;
    isAnswerModalVisible.value = false;
}

function closeExplanation() {
    isExplanationModalVisible.value = false;
}

</script>

<style>
/* 元のCSSをそのままここにコピー */
body {
  margin: 0;
  overflow: hidden; /* スクロールバーを非表示 */
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

#question-container {
  position: absolute;
  top: 20px;
  left: 90px;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 5px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

#answer-modal,
#explanation-modal {
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
#explanation-modal.hidden {
  opacity: 0;
  visibility: hidden;
}

#answer-modal.hidden,
#modal-content,
.modal-content {
  transform: translateY(20px);
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
  left: 70%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 10px 20px;
  border-radius: 10px;
  font-family: sans-serif;
  font-size: 16px;
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
}
</style>
