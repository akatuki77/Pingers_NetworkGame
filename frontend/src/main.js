// src/main.js
import { createApp } from 'vue'
import App from './App.vue'
import Tres from '@tresjs/core' // TresJSをインポート

const app = createApp(App)

app.use(Tres) // プラグインとして登録

app.mount('#app')
