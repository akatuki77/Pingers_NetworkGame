

const pool = require('../config/database');

const saveClearRecord = async (req, res) => {
  try {
    // テーブル設計に合わせて user_id と stage_id のみを受け取る
    const { user_id, stage_id } = req.body; 
    await pool.query(
      'INSERT INTO clear_records (user_id, stage_id) VALUES (?, ?)',
      [user_id, stage_id]
    );
    res.status(201).json({ message: 'クリア記録を保存しました' });
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました', error });
  }
};

const getRecordsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await pool.query('SELECT * FROM clear_records WHERE user_id = ?', [userId]);
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ message: 'サーバーエラーが発生しました', error });
  }
};

module.exports = { saveClearRecord, getRecordsByUser };