// パッケージの読み込み
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

// Expressアプリの初期化
const app = express();
app.use(cors()); // CORSを有効にする
app.use(express.json()); // JSON形式のリクエストボディを扱えるようにする

// データベース接続設定
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
};

let pool;

async function connectToDatabase() {
    try {
        pool = mysql.createPool(dbConfig);
        console.log('Successfully connected to the database.');
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
}

// 簡単なAPIエンドポイントの作成 (例: /api/test)
app.get('/api/test', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM users'); // 'users'をご自身のテーブル名に変更
        res.json(rows);
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// サーバーの起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
    connectToDatabase();
});