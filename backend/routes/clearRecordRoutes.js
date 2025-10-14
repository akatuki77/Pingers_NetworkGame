const express = require('express');
const router = express.Router();
const { saveClearRecord, getRecordsByUser } = require('../controllers/clearRecordController');

router.post('/', saveClearRecord);
router.get('/:userId', getRecordsByUser);

module.exports = router;