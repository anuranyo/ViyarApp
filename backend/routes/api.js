const express = require('express');
const { parseExcelToTxt, parseTxtToJson } = require('../controllers/parserJson');
const { getAllSchedulesByUser, getSchedulesByDepartments } = require('../controllers/mainController'); // Import the controller function
const router = express.Router();

// Route for uploading an Excel file
router.post('/upload-excel', parseExcelToTxt);
router.post('/parse-txt', parseTxtToJson);

// Route for getting schedules
router.get('/getAllByUser', getAllSchedulesByUser); // Single user filter
router.get('/getByDepartments', getSchedulesByDepartments); // Department filter

module.exports = router;
