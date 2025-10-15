const pool = require('../config/database');
// const bcrypt = require('bcrypt'); // ★ 変更点: bcryptを削除

// saltRoundsも不要になるので削除

const registerUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'ユーザー名とパスワードは必須です' });
    }
    
    // ★ 変更点: ハッシュ化の処理を削除
    // const hashedPassword = await bcrypt.hash(password, saltRounds);

    // ★ 変更点: 生のパスワードをそのまま保存
    await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, password]);
    
    res.status(201).json({ message: 'ユーザー登録が成功しました' });
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました', error });
  }
};

const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'ユーザー名またはパスワードが違います' });
    }

    const user = rows[0];

    // ★ 変更点: bcrypt.compareから単純な文字列比較に変更
    if (password === user.password) {
      res.status(200).json({ message: 'ログイン成功', userId: user.id });
    } else {
      res.status(401).json({ message: 'ユーザー名またはパスワードが違います' });
    }
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました', error });
  }
};

module.exports = { registerUser, loginUser };