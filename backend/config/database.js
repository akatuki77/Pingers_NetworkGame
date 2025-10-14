const mysql = require('mysql2/promise');

// データベース接続設定
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'gameusr',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE || 'network_game',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;