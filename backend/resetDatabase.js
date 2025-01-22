const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Function to reset the database
const resetDatabase = async () => {
    try {
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 30000,
        });
        console.log('MongoDB connected successfully.');

        // Получаем текущую базу данных из соединения
        const db = mongoose.connection;

        console.log('Resetting the database...');
        await db.dropDatabase(); // Удаляет всю базу данных, к которой вы подключены
        console.log('Database reset complete.');

        await mongoose.disconnect();
        console.log('MongoDB connection closed.');
    } catch (error) {
        logDatabaseError(error);
        process.exit(1);
    }
};


// Function to handle and log errors with detailed context
const logDatabaseError = (error) => {
    console.error('Failed to reset database:', error.message);
    console.error('Error details:', error);

    // Handle known error types with descriptive messages
    switch (error.name) {
        case 'MongoNetworkError':
            console.error('Network-related error. Verify your network connection.');
            break;
        case 'MongoParseError':
            console.error('URI parsing error. Check your MongoDB URI format.');
            break;
        case 'MongoTimeoutError':
            console.error('Connection timeout. The server took too long to respond.');
            break;
        case 'MongooseServerSelectionError':
            console.error('Server selection error. Could not find a primary server in the replica set.');
            break;
        default:
            console.error('An unknown error occurred:', error);
    }
};

// Execute the script
resetDatabase();
