// パッケージの読み込み
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Expressアプリの初期化
const app = express();
app.use(cors());
app.use(express.json());

// --- ルート設定 ---
const userRoutes = require('./routes/userRoutes');
const clearRecordRoutes = require('./routes/clearRecordRoutes');

// URLと担当ファイルを紐付ける
app.use('/api/users', userRoutes);
app.use('/api/records', clearRecordRoutes);

// サーバーの起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    // console.log(`Backend server is running on http://localhost:${PORT}`);
    // 上の行を日本語に修正しました。どちらでも大丈夫です。
    console.log(`Backend server is running on http://localhost:${PORT}`);
});