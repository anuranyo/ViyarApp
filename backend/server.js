const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');
const { parseExcel } = require('./controllers/parserJson'); // Import parseExcel function
const { parseExcelToTxt } = require('./controllers/parserJson');
const { parseExcelToJson } = require('./controllers/parserJson');
const { addDataFromJsonAndClean } = require('./controllers/mainController');

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB database
connectDB();
const app = express();

// Middleware to parse JSON requests
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api', apiRoutes);

// Redirect root URL to index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Array of month names in Ukrainian
const monthNames = [
    "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
    "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
];

// Directories for file uploads
const UPLOAD_DIR = path.join(__dirname, 'tmpr_files');
const JSON_DIR = path.join(__dirname, 'tmpr_json');

// Create directories if they do not exist
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(JSON_DIR)) fs.mkdirSync(JSON_DIR);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, Buffer.from(file.originalname, 'latin1').toString('utf8')),
});
const upload = multer({ storage });

// Handle file uploads and processing
app.post('/upload', upload.array('files', 10), async (req, res) => {
    try {
        console.log('Files uploaded:', req.files);
        const filePaths = [];

        for (const file of req.files) {
            const oldPath = file.path;
            const workbook = xlsx.readFile(oldPath);
            const firstSheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[firstSheetName];
            const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

            // Extract month from the date in the first row
            const dateString = rows[0]?.[4];
            if (!dateString) continue;

            const monthNumber = parseInt(dateString.split('.')[1], 10);
            const monthName = monthNames[monthNumber - 1];
            if (!monthName) continue;

            // Rename file based on the month name
            const newFileName = `${monthName}.xls`;
            const newPath = path.join(UPLOAD_DIR, newFileName);

            fs.renameSync(oldPath, newPath);
            filePaths.push(newPath);
        }

        console.log("File paths for processing:", filePaths);

        if (filePaths.length > 0) {
            // Convert Excel files to JSON and add data to the database
            const jsonPaths = await parseExcelToJson({ body: { filePaths } }, res);
            await addDataFromJsonAndClean(jsonPaths);
            res.status(200).send('Files uploaded, processed, and data added to the database successfully.');
        } else {
            res.status(400).send('No valid files found for processing.');
        }
    } catch (error) {
        console.error('Error during upload and processing:', error);
        res.status(500).send('An error occurred during processing.');
    }
});
