// Import the mongoose library to interact with MongoDB
const mongoose = require('mongoose');

// Define the schema for an Employee document in MongoDB
const EmployeeSchema = new mongoose.Schema({
    // The name of the employee, which is a required string
    name: { type: String, required: true },
    
    // The date of birth of the employee, which is a required date
    dateOfBirth: { type: Date, required: true },
    
    // The hire date of the employee, indicating when they started working, which is a required date
    hireDate: { type: Date, required: true },
    
    // The position or job title of the employee, which is a required string
    position: { type: String, required: true },
    
    // The department where the employee works, which is a required string
    department: { type: String, required: true }
});

// Export the Employee model based on the EmployeeSchema
module.exports = mongoose.model('Employee', EmployeeSchema);
