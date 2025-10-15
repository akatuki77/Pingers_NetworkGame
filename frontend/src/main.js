import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia' // ★ 1. Piniaをインポート
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia()) // ★ 2. VueアプリにPiniaを登録
app.use(router)

app.mount('#app')
