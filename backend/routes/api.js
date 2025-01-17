const express = require('express');
const mainController = require('../controllers/mainController');
const { parseExcelToTxt, parseTxtToJson } = require('../controllers/parserJson');
const router = express.Router();

// Пример маршрутов
router.post('/roles', mainController.createRole);
router.get('/roles', mainController.getRoles);
router.post('/upload-excel', parseExcelToTxt);
router.post('/parse-txt', parseTxtToJson);


module.exports = router;
