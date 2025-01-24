const express = require('express');
const { parseExcelToTxt, parseTxtToJson } = require('../controllers/parserJson');
const { getAllSchedulesByUser } = require('../controllers/mainController'); // Import the controller function
const router = express.Router();

// Route for uploading an Excel file
router.post('/upload-excel', parseExcelToTxt);
router.post('/parse-txt', parseTxtToJson);

// Route for getting schedules by user
router.get('/getAllByUser', getAllSchedulesByUser);

module.exports = router;
