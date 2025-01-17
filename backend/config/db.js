const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

mongoose.set('debug', true); // Enable debug mode

const connectDB = async () => {
    try {
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000, // Increase timeout to 5 seconds
        });
        console.log('MongoDB connected...');
    } catch (err) {
        console.error('MongoDB connection failed:', err.message);
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
        process.exit(1); // Exit the process on failure
    }
};

module.exports = connectDB;