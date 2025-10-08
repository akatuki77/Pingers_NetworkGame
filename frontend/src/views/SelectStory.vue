<template>
  <BackView />
  <div ref="container" class="canvas-container"></div>
  <!-- toで戻りたいところを指定する -->
  <BackButton to="/"/>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { useRouter } from 'vue-router';
import BackView from '@/components/BackView.vue';//背景を表示するコンポーネント
import BackButton from '@/components/BackButton.vue';//戻るボタンを表示するコンポーネント

const container = ref(null);
const router = useRouter();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let renderer, scene, camera;
const books = [];
let animationId = null;

const onClick = (event) => {
  if (!container.value) return;
  const rect = container.value.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(books, true);

  if (intersects.length > 0) {
    // ★★★ ここからデバッグ用コード ★★★
    // console.log("何かヒットしました！");

    const clickedObject = intersects[0].object;
    // console.log("直接クリックされたオブジェクト:", clickedObject);
    // console.log("そのオブジェクトのuserData:", clickedObject.userData);
    // console.log("そのオブジェクトの親:", clickedObject.parent);
    // console.log("親のuserData:", clickedObject.parent ? clickedObject.parent.userData : "親がいません");
    // ★★★ ここまでデバッグ用コード ★★★

    // 元のページ移動ロジック
    const storyId = clickedObject.parent?.userData?.storyId;
    if (storyId) {
      router.push(`/content/${storyId}`);
    } else {
      console.log("storyIdが見つかりませんでした。");
    }

  } else {
    console.log("何もヒットしませんでした。");
  }
};
const init = () => {
  const localContainer = container.value;
  if (!localContainer) return;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, localContainer.clientWidth / localContainer.clientHeight, 0.1, 1000);
  camera.position.set(0, 0, 15); // 全体が見えるようにカメラを調整

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(localContainer.clientWidth, localContainer.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  localContainer.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 5.0);
  directionalLight.position.set(5, 10, 5);
  directionalLight.castShadow = true;
  scene.add(directionalLight);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ visible: false }) // 地面は見えないようにする
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2; // 影を受ける地面を少し下に
  ground.receiveShadow = true;
  scene.add(ground);



  // 1. 表示したい本の情報（ID、モデル名、位置）を配列にまとめる
  const storyData = [
    { id: 1, model: 'book-momo', position: { x: -6, y: 4, z: -4 } },
    { id: 2, model: 'book',      position: { x:  0, y: 4, z: -4 } },
    { id: 3, model: 'book',      position: { x:  6, y: 4, z: -4 } },
    { id: 4, model: 'book',      position: { x: -6, y: 4, z: 2 } },
    { id: 5, model: 'book',      position: { x:  0, y: 4, z: 2 } },
    { id: 6, model: 'book',      position: { x:  6, y: 4, z: 2 } },
  ];
  const bookgroup = new THREE.Group();
  bookgroup.rotation.x = Math.PI / 2; // 本のグループを少し回転
  scene.add(bookgroup);

  const mtlLoader = new MTLLoader();
  const objLoader = new OBJLoader();

  // 2. 設定データをループして、各本を読み込んで配置
  storyData.forEach(data => {
    mtlLoader.load(`/models/select/${data.model}.mtl`, (materials) => {
      materials.preload();
      objLoader.setMaterials(materials);
      objLoader.load(
        `/models/select/${data.model}.obj`,
        (bookModel) => {
          // 3. 読み込んだモデルに、設定データに基づいた設定を適用
          bookModel.scale.set(0.2, 0.2, 0.2);
          bookModel.userData = { storyId: data.id };
          bookModel.position.set(data.position.x, data.position.y, data.position.z);

          bookModel.traverse(child => {
            if (child.isMesh) child.castShadow = true;
          });
          bookgroup.add(bookModel);
          books.push(bookModel);
        }
      );
    });
  });

  window.addEventListener('resize', onWindowResize);
  localContainer.addEventListener('click', onClick);
};

const onWindowResize = () => {
  const localContainer = container.value;
  if (!localContainer || !renderer || !camera) return;
  camera.aspect = localContainer.clientWidth / localContainer.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(localContainer.clientWidth, localContainer.clientHeight);
};

const animate = () => {
  animationId = requestAnimationFrame(animate);
  renderer.render(scene, camera);
};

onMounted(() => { init(); animate(); });
onUnmounted(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', onWindowResize);
  container.value?.removeEventListener('click', onClick);
  if (renderer) renderer.dispose();
});
</script>

<style scoped>
.canvas-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
}
</style>
