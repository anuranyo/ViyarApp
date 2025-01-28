const express = require('express');
const { parseExcelToTxt, parseTxtToJson } = require('../controllers/parserJson');
const { getAllSchedulesByUser, getSchedulesByDepartments, findData, getSchedulesByMonth, getSchedulesByMonthAndNameOrDepartment, findAll } = require('../controllers/mainController'); // Import the controller function
const router = express.Router();

// Route for uploading an Excel file
router.post('/upload-excel', parseExcelToTxt);
router.post('/parse-txt', parseTxtToJson);

// Route for getting schedules
router.get('/getAllByUser', getAllSchedulesByUser); // Single user filter
router.get('/getByDepartments', getSchedulesByDepartments); // Department filter
router.get('/findData/:query', findData); // find by departament or by name
router.get('/getByMonth', getSchedulesByMonth); // Month filter
router.get('/getByMonth&NameOrDepartment', getSchedulesByMonthAndNameOrDepartment); // Month and name or department filter
router.get('/findAll', findAll); // Find all by names


module.exports = router;
