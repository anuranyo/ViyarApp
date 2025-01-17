const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const apiRoutes = require('./routes/api');
const { parseExcel } = require('./controllers/parserJson'); // Импорт функции parseExcel
const { parseExcelToTxt } = require('./controllers/parserJson');


// Загрузка переменных окружения
dotenv.config();

// Подключение к MongoDB
connectDB();
const app = express();

// Middleware
app.use(express.json());

// Настройка статической директории
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api', apiRoutes);


// Перенаправление на index.html при запуске сервера
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Директории для загрузки файлов
const UPLOAD_DIR = path.join(__dirname, 'tmpr_files');
const JSON_DIR = path.join(__dirname, 'tmpr_json');

// Создаем директории, если их нет
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
if (!fs.existsSync(JSON_DIR)) fs.mkdirSync(JSON_DIR);

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({ storage });

// Обработка загрузки файлов
//app.post('/upload', upload.array('files', 10), parseExcel); // Использование функции parseExcel
app.post('/upload', upload.array('files', 10), parseExcelToTxt);
