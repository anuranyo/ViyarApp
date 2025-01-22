const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Import models
const Employee = require('./models/Employee');
const Schedule = require('./models/Schedule');

dotenv.config();

/**
 * Initialize the database structure for viyarSchedule.
 */
const initializeDatabase = async () => {
    try {
        // Connect to MongoDB
        console.log('Attempting to connect to MongoDB...');
        await connectToDatabase();
        console.log('MongoDB connected successfully.');

        // Initialize empty collections
        console.log('Initializing empty collections for viyarSchedule...');
        await initializeCollections();
        console.log('Empty database structure for viyarSchedule created successfully.');

        // Close the database connection
        await closeDatabaseConnection();
        console.log('MongoDB connection closed.');
    } catch (error) {
        handleError(error);
    }
};

/**
 * Connect to the MongoDB database.
 */
const connectToDatabase = async () => {
    await mongoose.connect(process.env.MONGO_URI, {
        dbName: 'viyarSchedule',
        serverSelectionTimeoutMS: 5000, // Timeout for server selection
    });
};

/**
 * Initialize all database collections by calling `.init()` on each model.
 */
const initializeCollections = async () => {
    const models = [Employee, Schedule];
    for (const model of models) {
        await model.init();
    }
};

/**
 * Close the MongoDB connection.
 */
const closeDatabaseConnection = async () => {
    await mongoose.disconnect();
};

/**
 * Handle and log errors during database initialization.
 * @param {Error} error - The error object.
 */
const handleError = (error) => {
    console.error('Failed to initialize database:', error.message);
    console.error('Error details:', error);

    switch (error.name) {
        case 'MongoNetworkError':
            console.error('Network-related error. Please check your network connection.');
            break;
        case 'MongoParseError':
            console.error('URI parsing error. Please check your MongoDB URI.');
            break;
        case 'MongoTimeoutError':
            console.error('Connection timeout. The server took too long to respond.');
            break;
        default:
            console.error('An unknown error occurred:', error);
    }

    process.exit(1); // Exit the script with a failure code
};

// Execute the script
initializeDatabase();
