<template>
  <div ref="container" class="back-button-3d-container"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, toRefs } from 'vue';
import * as THREE from 'three';
import { useRouter } from 'vue-router';

// --- Props ---
const props = defineProps({
  to: {
    type: String,
    default: '/'
  }
});
const { to } = toRefs(props);

// --- 基本設定 ---
const container = ref(null);
const router = useRouter();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let renderer, scene, camera, buttonMesh;

const onClick = (event) => {
  if (!buttonMesh) return;
  const rect = container.value.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(buttonMesh, true);
  if (intersects.length > 0) {
    router.push(to.value);
  }
};

onMounted(() => {
  const localContainer = container.value;
  scene = new THREE.Scene();

  // --- カメラ（OrthographicCameraを使用）---
  const w = localContainer.clientWidth;
  const h = localContainer.clientHeight;
  camera = new THREE.OrthographicCamera(w / -2, w / 2, h / 2, h / -2, 1, 1000);
  camera.position.z = 10;

  // --- レンダラー ---
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(w, h);
  localContainer.appendChild(renderer.domElement);

  // --- 3Dオブジェクトの作成 ---
  const buttonGroup = new THREE.Group();

  // ★ 1. 円を「枠線」に変更
  const ringGeo = new THREE.RingGeometry(22, 25, 32); // 内側の半径, 外側の半径, 分割数
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    opacity: 0.4,
    transparent: true,
    side: THREE.DoubleSide // 裏表両方描画
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  buttonGroup.add(ringMesh);

  // ★ 2. 矢印を「線＋三角」で作成
  const arrowGroup = new THREE.Group();
  const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // 矢印の「線」の部分（四角形）
  const shaftGeo = new THREE.PlaneGeometry(15, 4); // 幅, 高さ
  const shaftMesh = new THREE.Mesh(shaftGeo, arrowMaterial);
  shaftMesh.position.x = 2; // 少し右にずらす
  arrowGroup.add(shaftMesh);

  // 矢印の「三角」の部分
  const headShape = new THREE.Shape();
  headShape.moveTo(-5, 8);
  headShape.lineTo(-15, 0);
  headShape.lineTo(-5, -8);
  headShape.closePath();
  const headGeo = new THREE.ShapeGeometry(headShape);
  const headMesh = new THREE.Mesh(headGeo, arrowMaterial);
  arrowGroup.add(headMesh);

  arrowGroup.position.z = 0.1; // 円より少し手前に
  buttonGroup.add(arrowGroup);

  buttonMesh = buttonGroup;
  scene.add(buttonMesh);

  renderer.render(scene, camera);
  localContainer.addEventListener('click', onClick);
});

onUnmounted(() => {
  container.value?.removeEventListener('click', onClick);
  if (renderer) renderer.dispose();
});
</script>

<style scoped>
.back-button-3d-container {
  position: absolute;
  top: 2rem;
  left: 2rem;
  z-index: 10;
  width: 50px;
  height: 50px;
  cursor: pointer;
}
</style>
