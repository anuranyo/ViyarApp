const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Импорт моделей
const Role = require('./models/Role');
const Employee = require('./models/Employee');
const DateModel = require('./models/Date');
const Status = require('./models/Status');
const Schedule = require('./models/Schedule');
const Duty = require('./models/Duty');

// Настройка окружения
dotenv.config();

const seedDatabase = async () => {
    try {
        // Подключение к MongoDB
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('MongoDB connected...');

        // Очистка всех коллекций
        await Role.deleteMany({});
        await Employee.deleteMany({});
        await DateModel.deleteMany({});
        await Status.deleteMany({});
        await Schedule.deleteMany({});
        await Duty.deleteMany({});
        console.log('Collections cleared...');

        // Добавление данных

        // Роли
        const roles = await Role.insertMany([
            { roleName: 'Эксперт' },
            { roleName: 'Консультант' },
        ]);
        console.log('Roles seeded:', roles);

        // Сотрудники
        const employees = await Employee.insertMany([
            { name: 'Иван Иванов', role: roles[0]._id },
            { name: 'Анна Петрова', role: roles[1]._id },
        ]);
        console.log('Employees seeded:', employees);

        // Даты
        const dates = await DateModel.insertMany([
            { date: new Date('2025-01-16') },
            { date: new Date('2025-01-17') },
        ]);
        console.log('Dates seeded:', dates);

        // Статусы
        const statuses = await Status.insertMany([
            { code: 'рв', description: 'Рабочий день' },
            { code: 'вх', description: 'Выходной' },
        ]);
        console.log('Statuses seeded:', statuses);

        // Графики
        const schedules = await Schedule.insertMany([
            {
                employee: employees[0]._id,
                date: dates[0]._id,
                status: statuses[0]._id,
                shiftCode: '1',
            },
            {
                employee: employees[1]._id,
                date: dates[1]._id,
                status: statuses[1]._id,
                shiftCode: '2',
            },
        ]);
        console.log('Schedules seeded:', schedules);

        // Чергувань
        const duties = await Duty.insertMany([
            {
                employee: employees[0]._id,
                date: dates[0]._id,
                isOnDuty: true,
            },
            {
                employee: employees[1]._id,
                date: dates[1]._id,
                isOnDuty: false,
            },
        ]);
        console.log('Duties seeded:', duties);

        console.log('Database seeding completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Database seeding failed:', err.message);
        process.exit(1);
    }
};

// Запуск
seedDatabase();
