const express = require('express');
const { parseExcelToTxt, parseTxtToJson } = require('../controllers/parserJson');
const router = express.Router();

// Пример маршрутов
router.post('/upload-excel', parseExcelToTxt);
router.post('/parse-txt', parseTxtToJson);


module.exports = router;
