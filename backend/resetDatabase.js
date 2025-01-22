const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Function to reset the database
const resetDatabase = async () => {
    try {
        // Connect to MongoDB using the provided URI in environment variables
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 30000, // Set timeout for server selection
        });
        console.log('MongoDB connected successfully.');

        // Drop the entire database to reset it
        console.log('Resetting the database...');
        const db = mongoose.connection; // Get the current database connection
        await db.dropDatabase(); // Drop all collections and data
        console.log('Database reset complete.');

        // Disconnect from MongoDB
        await mongoose.disconnect();
        console.log('MongoDB connection closed.');
    } catch (error) {
        // Log specific error details
        logDatabaseError(error);
        process.exit(1); // Exit the process with failure code
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
