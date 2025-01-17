const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Импорт моделей
const Role = require('./models/Role');
const Employee = require('./models/Employee');
const DateModel = require('./models/Date');
const Status = require('./models/Status');
const Schedule = require('./models/Schedule');
const Duty = require('./models/Duty');

dotenv.config();

const initializeDatabase = async () => {
    try {
        // Подключение к MongoDB
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: 'viyarSchedule', 
            serverSelectionTimeoutMS: 5000,
        });
        console.log('MongoDB connected...');

        // Инициализация пустых коллекций
        console.log('Initializing empty collections for viyarSchedule...');
        await Role.init();
        await Employee.init();
        await DateModel.init();
        await Status.init();
        await Schedule.init();
        await Duty.init();
        console.log('Empty database structure for viyarSchedule created successfully!');

        // Закрытие соединения
        await mongoose.disconnect();
        console.log('MongoDB connection closed.');
    } catch (err) {
        console.error('Failed to initialize database:', err.message);
        console.error('Error details:', err);
        if (err.name === 'MongoNetworkError') {
            console.error('Network-related error. Please check your network connection.');
        } else if (err.name === 'MongoParseError') {
            console.error('URI parsing error. Please check your MongoDB URI.');
        } else if (err.name === 'MongoTimeoutError') {
            console.error('Connection timeout. The server took too long to respond.');
        } else {
            console.error('An unknown error occurred:', err);
        }
        process.exit(1);
    }
};

// Запуск скрипта
initializeDatabase();