<template>
  <BackView />

  <div class="content-overlay">
    <div ref="titleContainer" class="title-canvas-container"></div>

    <div class="button-container">
      <button @click="startGame" class="start-button">はじめる</button>
      <UserInfo v-if="userStore.isLoggedIn" />
      <button v-else @click="openLoginDialog" class="login-button">ログイン</button>
    </div>
  </div>

  <div v-if="isLoginDialogOpen" class="dialog-overlay" @click.self="closeLoginDialog">
    <div class="dialog-box">
      <h2>ログイン</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="login-username">ユーザー名</label>
          <input type="text" id="login-username" v-model="username" required>
        </div>
        <div class="form-group">
          <label for="login-password">パスワード</label>
          <input type="password" id="login-password" v-model="password" required>
        </div>
        <p v-if="loginError" class="error-message">{{ loginError }}</p>
        <div class="dialog-buttons">
          <button type="button" @click="closeLoginDialog" class="close-button">閉じる</button>
          <button type="submit" class="submit-button">ログイン</button>
        </div>
        <p class="switch-form-text">
          アカウントをお持ちでないですか？ <a @click="switchToRegister">作成する</a>
        </p>
      </form>
    </div>
  </div>

  <div v-if="isRegisterDialogOpen" class="dialog-overlay" @click.self="closeRegisterDialog">
    <div class="dialog-box">
      <h2>アカウント作成</h2>
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="register-username">ユーザー名</label>
          <input type="text" id="register-username" v-model="username" required>
        </div>
        <div class="form-group">
          <label for="register-password">パスワード</label>
          <input type="password" id="register-password" v-model="password" required>
        </div>
        <p v-if="registerError" class="error-message">{{ registerError }}</p>
        <div class="dialog-buttons">
          <button type="button" @click="closeRegisterDialog" class="close-button">閉じる</button>
          <button type="submit" class="submit-button">作成する</button>
        </div>
         <p class="switch-form-text">
          すでにアカウントをお持ちですか？ <a @click="switchToLogin">ログイン</a>
        </p>
      </form>
    </div>
  </div>

</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { useRouter } from 'vue-router';
import BackView from '@/components/BackView.vue';
import UserInfo from '@/components/UserInfo.vue';
import { useUserStore } from '@/stores/userStore';

const router = useRouter();
const userStore = useUserStore();
const titleContainer = ref(null);

// --- ダイアログ用の状態管理 ---
const isLoginDialogOpen = ref(false);
const isRegisterDialogOpen = ref(false);
const username = ref('');
const password = ref('');
const loginError = ref(null);
const registerError = ref(null);

const startGame = () => {
  router.push('/select-story');
};

// --- ダイアログの制御関数 ---
const openLoginDialog = () => { isLoginDialogOpen.value = true; };
const openRegisterDialog = () => { isRegisterDialogOpen.value = true; };

const closeAllDialogs = () => {
  isLoginDialogOpen.value = false;
  isRegisterDialogOpen.value = false;
  username.value = '';
  password.value = '';
  loginError.value = null;
  registerError.value = null;
};
const closeLoginDialog = () => { closeAllDialogs(); };
const closeRegisterDialog = () => { closeAllDialogs(); };

const switchToRegister = () => {
  closeLoginDialog();
  openRegisterDialog();
};
const switchToLogin = () => {
  closeRegisterDialog();
  openLoginDialog();
};


// --- API通信 ---
const handleLogin = async () => {
  loginError.value = null;
  try {
    const response = await fetch('http://localhost:3000/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value }),
    });
    const data = await response.json();
    if (!response.ok) {
      loginError.value = data.message || 'ログインに失敗しました。';
    } else {
      userStore.setUser({ id: data.userId, username: username.value });
      closeLoginDialog();
    }
  } catch (error) {
    loginError.value = 'サーバーに接続できませんでした。';
  }
};

const handleRegister = async () => {
  registerError.value = null;
  try {
    const response = await fetch('http://localhost:3000/api/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.value, password: password.value }),
    });
    const data = await response.json();
    if (!response.ok) {
      registerError.value = data.message || '登録に失敗しました。';
    } else {
      alert('アカウントの作成が完了しました！ログインしてください。');
      switchToLogin();
    }
  } catch (error) {
    registerError.value = 'サーバーに接続できませんでした。';
  }
};


// --- Three.js 関連のコード (変更なし) ---
let renderer, scene, camera, model;
let animationId = null;

const initTitleScene = () => {
  const container = titleContainer.value;
  if (!container) return;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(5, 10, 7.5);
  scene.add(directionalLight);
  const mtlLoader = new MTLLoader();
  mtlLoader.load('/models/title/GameTitle-v2.mtl', (materials) => {
    materials.preload();
    const objLoader = new OBJLoader();
    objLoader.setMaterials(materials);
    objLoader.load('/models/title/GameTitle-v2.obj', (obj) => {
      model = obj;
      model.scale.set(2, 2, 2);
      scene.add(model);
      camera.position.set(0, 5, 8);
      camera.lookAt(0, 3, 0);
    });
  });
  window.addEventListener('resize', onWindowResize);
};

const onWindowResize = () => {
  const container = titleContainer.value;
  if (!container || !renderer || !camera) return;
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
};

const animate = () => {
  animationId = requestAnimationFrame(animate);
  if (model) {
    model.position.y = Math.sin(Date.now() * 0.001) * 3;
  }
  if (renderer) {
    renderer.render(scene, camera);
  }
};

onMounted(() => { initTitleScene(); animate(); });
onUnmounted(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', onWindowResize);
  if (renderer) renderer.dispose();
});
</script>

<style scoped>
.content-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}
.title-canvas-container {
  width: 100%;
  height: 100%;
}
.button-container {
  position: absolute;
  bottom: 15%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.start-button, .login-button {
  color: white;
  border: 2px solid white;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
}
.start-button:hover, .login-button:hover {
  background-color: rgba(255, 255, 255, 0.9);
  color: black;
}

.start-button {
  padding: 12px 48px;
  font-size: 2.5em;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
}
.login-button {
  padding: 10px 40px;
  font-size: 1.5em;
  background-color: transparent;
}

/* --- ダイアログ用のスタイル --- */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.dialog-box {
  background-color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.25);
  width: 90%;
  max-width: 400px;
}
.dialog-box h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  text-align: center;
}
.form-group {
  margin-bottom: 1rem;
}
.form-group label {
  display: block;
  margin-bottom: 0.5rem;
}
.form-group input {
  width: 100%;
  padding: 0.8rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}
.error-message {
  color: #d9534f;
  margin-bottom: 1rem;
  text-align: center;
}
.dialog-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
}
.dialog-buttons button {
  padding: 0.8rem 1.5rem;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: bold;
}
.close-button {
  background-color: #f0f0f0;
  border: 1px solid #ccc;
}
.submit-button {
  background-color: #337ab7;
  color: white;
}
.switch-form-text {
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.9em;
}
.switch-form-text a {
  color: #337ab7;
  text-decoration: underline;
  cursor: pointer;
}
</style>
